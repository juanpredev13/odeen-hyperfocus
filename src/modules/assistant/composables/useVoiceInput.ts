import { onMounted, ref } from 'vue'
import {
  cancelRecording,
  downloadVoiceModel,
  getVoiceModelStatus,
  isVoiceAvailable,
  startRecording,
  stopRecording,
} from '@/services/native'

export type VoicePhase = 'idle' | 'downloading' | 'recording' | 'transcribing'

/**
 * Push-to-talk: first toggle starts the mic, second stops it and hands the
 * transcript to `onTranscript`. Downloads the Whisper model on first use.
 */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const available = ref(false)
  const phase = ref<VoicePhase>('idle')
  const progress = ref('')
  const error = ref<string | null>(null)

  onMounted(async () => {
    available.value = await isVoiceAvailable()
  })

  async function ensureModel(): Promise<boolean> {
    const status = await getVoiceModelStatus()
    if (status.downloaded) return true
    phase.value = 'downloading'
    progress.value = 'Downloading voice model…'
    await downloadVoiceModel((p) => {
      progress.value = `Downloading voice model ${p.downloadedMb}/${p.totalMb} MB`
    })
    progress.value = ''
    return true
  }

  async function toggle(): Promise<void> {
    error.value = null
    try {
      if (phase.value === 'idle') {
        await ensureModel()
        await startRecording()
        phase.value = 'recording'
      } else if (phase.value === 'recording') {
        phase.value = 'transcribing'
        const text = await stopRecording()
        phase.value = 'idle'
        if (text) onTranscript(text)
        else error.value = 'Nothing heard. Try again, a bit closer to the mic.'
      }
    } catch (e) {
      phase.value = 'idle'
      progress.value = ''
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  async function cancel(): Promise<void> {
    if (phase.value !== 'recording') return
    await cancelRecording()
    phase.value = 'idle'
  }

  return { available, phase, progress, error, toggle, cancel }
}
