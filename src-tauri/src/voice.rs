//! Desktop voice capture: record the default microphone with cpal and
//! transcribe it locally with Whisper (whisper.cpp via whisper-rs).
//! Nothing leaves the machine. Mobile uses a cloud transcriber instead.

use std::path::PathBuf;
use std::sync::mpsc::{self, Sender};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use futures_util::StreamExt;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

/// Multilingual base model (~148 MB): good Spanish/English at real-time speed on a laptop CPU.
const MODEL_FILE: &str = "ggml-base.bin";
const MODEL_URL: &str = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";
const WHISPER_RATE: u32 = 16_000;
/// Hard cap so a forgotten recording can't grow without bound.
const MAX_SECONDS: usize = 120;

struct Recording {
    stop: Sender<()>,
    thread: JoinHandle<()>,
    samples: Arc<Mutex<Vec<f32>>>,
    sample_rate: u32,
}

#[derive(Default)]
pub struct VoiceState {
    recording: Mutex<Option<Recording>>,
    whisper: Mutex<Option<Arc<WhisperContext>>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    downloaded: bool,
    size_mb: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    downloaded_mb: u64,
    total_mb: u64,
}

fn model_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("models").join(MODEL_FILE))
}

#[tauri::command]
pub fn voice_model_status(app: AppHandle) -> Result<ModelStatus, String> {
    let path = model_path(&app)?;
    let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    Ok(ModelStatus {
        downloaded: size > 0,
        size_mb: size / 1_000_000,
    })
}

/// Downloads the Whisper model once into the app data dir. Emits `voice-model-progress`.
#[tauri::command]
pub async fn voice_download_model(app: AppHandle) -> Result<(), String> {
    let path = model_path(&app)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let partial = path.with_extension("part");

    let response = reqwest::get(MODEL_URL).await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Model download failed: HTTP {}", response.status()));
    }
    let total = response.content_length().unwrap_or(0);
    let mut file = std::fs::File::create(&partial).map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_mb = u64::MAX;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        std::io::Write::write_all(&mut file, &chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        let mb = downloaded / 1_000_000;
        if mb != last_mb {
            last_mb = mb;
            let _ = app.emit(
                "voice-model-progress",
                DownloadProgress {
                    downloaded_mb: mb,
                    total_mb: total / 1_000_000,
                },
            );
        }
    }
    drop(file);
    std::fs::rename(&partial, &path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn voice_start(state: State<'_, VoiceState>) -> Result<(), String> {
    let mut slot = state.recording.lock().map_err(|e| e.to_string())?;
    if slot.is_some() {
        return Err("Already recording".into());
    }

    let samples = Arc::new(Mutex::new(Vec::<f32>::new()));
    let (stop_tx, stop_rx) = mpsc::channel::<()>();
    let (ready_tx, ready_rx) = mpsc::channel::<Result<u32, String>>();
    let sink = Arc::clone(&samples);

    // cpal streams are not Send on every platform, so the stream lives on its own thread.
    let thread = std::thread::spawn(move || {
        let host = cpal::default_host();
        let Some(device) = host.default_input_device() else {
            let _ = ready_tx.send(Err("No microphone found".into()));
            return;
        };
        let config = match device.default_input_config() {
            Ok(c) => c,
            Err(e) => {
                let _ = ready_tx.send(Err(e.to_string()));
                return;
            }
        };
        let rate = config.sample_rate();
        let channels = usize::from(config.channels());
        let limit = rate as usize * MAX_SECONDS;

        let stream = device.build_input_stream(
            &config.into(),
            move |data: &[f32], _| {
                let Ok(mut buf) = sink.lock() else { return };
                // Downmix to mono as samples arrive.
                for frame in data.chunks(channels) {
                    if buf.len() >= limit {
                        return;
                    }
                    buf.push(frame.iter().sum::<f32>() / frame.len() as f32);
                }
            },
            |err| log::error!("microphone stream error: {err}"),
            None,
        );
        let stream = match stream {
            Ok(s) => s,
            Err(e) => {
                let _ = ready_tx.send(Err(e.to_string()));
                return;
            }
        };
        if let Err(e) = stream.play() {
            let _ = ready_tx.send(Err(e.to_string()));
            return;
        }
        let _ = ready_tx.send(Ok(rate));
        let _ = stop_rx.recv();
        drop(stream);
    });

    let sample_rate = ready_rx.recv().map_err(|e| e.to_string())??;
    *slot = Some(Recording {
        stop: stop_tx,
        thread,
        samples,
        sample_rate,
    });
    Ok(())
}

fn take_recording(state: &VoiceState) -> Result<(Vec<f32>, u32), String> {
    let recording = state
        .recording
        .lock()
        .map_err(|e| e.to_string())?
        .take()
        .ok_or("Not recording")?;
    let _ = recording.stop.send(());
    let _ = recording.thread.join();
    let samples = std::mem::take(&mut *recording.samples.lock().map_err(|e| e.to_string())?);
    Ok((samples, recording.sample_rate))
}

#[tauri::command]
pub fn voice_cancel(state: State<'_, VoiceState>) -> Result<(), String> {
    take_recording(&state).map(|_| ())
}

/// Linear resampling to 16 kHz; plenty for speech recognition.
fn resample(input: &[f32], from: u32) -> Vec<f32> {
    if from == WHISPER_RATE || input.is_empty() {
        return input.to_vec();
    }
    let ratio = from as f64 / WHISPER_RATE as f64;
    let out_len = (input.len() as f64 / ratio) as usize;
    (0..out_len)
        .map(|i| {
            let pos = i as f64 * ratio;
            let idx = pos as usize;
            let frac = (pos - idx as f64) as f32;
            let a = input[idx];
            let b = *input.get(idx + 1).unwrap_or(&a);
            a + (b - a) * frac
        })
        .collect()
}

fn whisper_context(app: &AppHandle, state: &VoiceState) -> Result<Arc<WhisperContext>, String> {
    let mut slot = state.whisper.lock().map_err(|e| e.to_string())?;
    if let Some(ctx) = slot.as_ref() {
        return Ok(Arc::clone(ctx));
    }
    let path = model_path(app)?;
    if !path.exists() {
        return Err("Voice model not downloaded".into());
    }
    let ctx = WhisperContext::new_with_params(&path, WhisperContextParameters::default())
        .map_err(|e| e.to_string())?;
    let ctx = Arc::new(ctx);
    *slot = Some(Arc::clone(&ctx));
    Ok(ctx)
}

/// Stops recording and returns the transcript.
#[tauri::command]
pub async fn voice_stop(app: AppHandle, state: State<'_, VoiceState>) -> Result<String, String> {
    let (samples, rate) = take_recording(&state)?;
    // Under half a second is a mis-click, not speech.
    if samples.len() < rate as usize / 2 {
        return Ok(String::new());
    }
    let ctx = whisper_context(&app, &state)?;

    tauri::async_runtime::spawn_blocking(move || {
        let audio = resample(&samples, rate);
        let mut wstate = ctx.create_state().map_err(|e| e.to_string())?;
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some("auto"));
        params.set_n_threads(std::thread::available_parallelism().map_or(4, |n| n.get()) as i32);
        params.set_no_timestamps(true);
        params.set_suppress_nst(true);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_special(false);
        params.set_print_timestamps(false);
        wstate.full(params, &audio).map_err(|e| e.to_string())?;

        let mut text = String::new();
        for i in 0..wstate.full_n_segments() {
            if let Some(segment) = wstate.get_segment(i) {
                text.push_str(&segment.to_str_lossy().map_err(|e| e.to_string())?);
            }
        }
        Ok(text.trim().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
