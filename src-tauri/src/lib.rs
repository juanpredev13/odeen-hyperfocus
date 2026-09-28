use tauri_plugin_notification::{NotificationExt, PermissionState};

#[cfg(desktop)]
mod voice;
#[cfg(desktop)]
use tauri::Manager;

type InvokeHandler = Box<dyn Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync>;

#[cfg(desktop)]
fn invoke_handler() -> InvokeHandler {
    Box::new(tauri::generate_handler![
        notification_permission,
        request_notification_permission,
        send_notification,
        voice::voice_model_status,
        voice::voice_download_model,
        voice::voice_start,
        voice::voice_stop,
        voice::voice_cancel
    ])
}

// Mobile transcribes in the cloud, so no local voice commands.
#[cfg(mobile)]
fn invoke_handler() -> InvokeHandler {
    Box::new(tauri::generate_handler![
        notification_permission,
        request_notification_permission,
        send_notification
    ])
}

fn permission_label(state: PermissionState) -> &'static str {
    match state {
        PermissionState::Granted => "granted",
        PermissionState::Denied => "denied",
        _ => "default",
    }
}

// Notifications go through Rust instead of the plugin's JS API: on Linux the
// WebKitGTK webview exposes its own `window.Notification` (permission "denied"),
// which the JS wrapper reads before ever asking the plugin.
#[tauri::command]
fn notification_permission(app: tauri::AppHandle) -> Result<&'static str, String> {
    let state = app
        .notification()
        .permission_state()
        .map_err(|e| e.to_string())?;
    Ok(permission_label(state))
}

#[tauri::command]
fn request_notification_permission(app: tauri::AppHandle) -> Result<&'static str, String> {
    let state = app
        .notification()
        .request_permission()
        .map_err(|e| e.to_string())?;
    Ok(permission_label(state))
}

/// Argument that turns the binary into a one-shot notification sender (see `run_notify_helper`).
#[cfg(desktop)]
const NOTIFY_HELPER_ARG: &str = "--notify-helper";

#[cfg(desktop)]
fn show_desktop_notification(title: &str, body: &str) -> Result<(), String> {
    notify_rust::Notification::new()
        .appname("ODEEN")
        .summary(title)
        .body(body)
        .show()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg(desktop)]
/// Runs before Tauri starts. When launched as `odeen --notify-helper <title> <body>`
/// it sends one notification and returns `true` so `main` exits.
pub fn run_notify_helper() -> bool {
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) != Some(NOTIFY_HELPER_ARG) {
        return false;
    }
    let title = args.get(2).map(String::as_str).unwrap_or("ODEEN");
    let body = args.get(3).map(String::as_str).unwrap_or("");
    if let Err(e) = show_desktop_notification(title, body) {
        eprintln!("notification failed: {e}");
        std::process::exit(1);
    }
    true
}

/// Desktop: talk to the notification daemon directly so failures surface as errors
/// (the plugin fires it on a background task and discards the result).
///
/// On Linux the notification is sent from a short-lived child process: Cinnamon
/// dismisses popups instantly when the sending PID owns a window (the app's own),
/// so in-process notifications only play the sound.
#[cfg(desktop)]
#[tauri::command]
async fn send_notification(title: String, body: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        if cfg!(target_os = "linux") {
            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
            let status = std::process::Command::new(exe)
                .args([NOTIFY_HELPER_ARG, &title, &body])
                .status()
                .map_err(|e| e.to_string())?;
            if status.success() {
                Ok(())
            } else {
                Err(format!("Notification helper exited with {status}"))
            }
        } else {
            show_desktop_notification(&title, &body)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(mobile)]
#[tauri::command]
fn send_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(invoke_handler())
        .setup(|app| {
            // Global shortcuts only exist on desktop; the crate is not compiled for iOS/Android.
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
                app.manage(voice::VoiceState::default());
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
