/**
 * Bridge to the Tauri shell. Every function is safe to call from the web build:
 * outside Tauri it resolves to a no-op / `false`. Plugin modules are imported
 * lazily so the web bundle never pays for them.
 */
import { invoke, isTauri } from '@tauri-apps/api/core'
import type { TrayIcon } from '@tauri-apps/api/tray'

export type NativePlatform = 'linux' | 'windows' | 'macos' | 'ios' | 'android' | 'web'
export type NotificationPermission = 'granted' | 'denied' | 'default' | 'unavailable'

/** DOM event the shell dispatches when the global capture shortcut fires. */
export const QUICK_CAPTURE_EVENT = 'odeen:quick-capture'
export const CAPTURE_SHORTCUT = 'CommandOrControl+Alt+C'

export function isNative(): boolean {
  return isTauri()
}

export async function getPlatform(): Promise<NativePlatform> {
  if (!isNative()) return 'web'
  const { platform } = await import('@tauri-apps/plugin-os')
  const name = platform()
  if (
    name === 'linux' ||
    name === 'windows' ||
    name === 'macos' ||
    name === 'ios' ||
    name === 'android'
  ) {
    return name
  }
  return 'linux'
}

export function isDesktop(platform: NativePlatform): boolean {
  return platform === 'linux' || platform === 'windows' || platform === 'macos'
}

// ── Deep links ───────────────────────────────────────────────────

/** URL scheme the desktop shell registers (src-tauri/tauri.conf.json → plugins.deep-link). */
export const DEEP_LINK_SCHEME = 'odeen'

/**
 * Calls `handler` with every odeen:// URL the app is opened with: the one that
 * launched it (cold start) and any later ones forwarded by the single-instance plugin.
 */
export async function onDeepLink(handler: (url: string) => void): Promise<void> {
  if (!isNative()) return
  const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
  const initial = await getCurrent()
  initial?.forEach(handler)
  await onOpenUrl((urls) => urls.forEach(handler))
}

// ── Notifications ────────────────────────────────────────────────

// Commands live in src-tauri/src/lib.rs (the plugin's JS wrapper misreads permission on Linux).

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!isNative()) return 'unavailable'
  return invoke<NotificationPermission>('notification_permission')
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNative()) return 'unavailable'
  return invoke<NotificationPermission>('request_notification_permission')
}

/** Sends a system notification, asking for permission first if needed. */
export async function notify(title: string, body: string): Promise<boolean> {
  if (!isNative()) return false
  let permission = await getNotificationPermission()
  if (permission !== 'granted') permission = await requestNotificationPermission()
  if (permission !== 'granted') return false
  await invoke('send_notification', { title, body })
  return true
}

// ── Window ───────────────────────────────────────────────────────

/** Brings the main window to the front, restoring it if minimized. */
export async function focusWindow(): Promise<void> {
  if (!isNative()) return
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const win = getCurrentWindow()
  await win.unminimize()
  await win.show()
  await win.setFocus()
}

export async function setAlwaysOnTop(value: boolean): Promise<void> {
  if (!isNative()) return
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  await getCurrentWindow().setAlwaysOnTop(value)
}

export async function isWindowFocused(): Promise<boolean> {
  if (!isNative()) return document.hasFocus()
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow().isFocused()
}

// ── Global shortcut (desktop only) ───────────────────────────────

/** Registers the system-wide capture shortcut: focuses ODEEN and opens Quick capture. */
export async function registerCaptureShortcut(): Promise<boolean> {
  if (!isNative() || !isDesktop(await getPlatform())) return false
  const { register, isRegistered } = await import('@tauri-apps/plugin-global-shortcut')
  if (await isRegistered(CAPTURE_SHORTCUT)) return true
  try {
    await register(CAPTURE_SHORTCUT, (event) => {
      if (event.state !== 'Pressed') return
      void focusWindow().then(() => window.dispatchEvent(new CustomEvent(QUICK_CAPTURE_EVENT)))
    })
    return true
  } catch {
    // Another app already owns the combination.
    return false
  }
}

export async function unregisterCaptureShortcut(): Promise<void> {
  if (!isNative() || !isDesktop(await getPlatform())) return
  const { unregister } = await import('@tauri-apps/plugin-global-shortcut')
  await unregister(CAPTURE_SHORTCUT)
}

// ── Tray (desktop only) ──────────────────────────────────────────

let tray: TrayIcon | null = null

export async function ensureTray(): Promise<boolean> {
  if (!isNative() || !isDesktop(await getPlatform())) return false
  if (tray) return true
  const [{ TrayIcon }, { Menu }, { defaultWindowIcon }] = await Promise.all([
    import('@tauri-apps/api/tray'),
    import('@tauri-apps/api/menu'),
    import('@tauri-apps/api/app'),
  ])
  const menu = await Menu.new({
    items: [
      { id: 'open', text: 'Open ODEEN', action: () => void focusWindow() },
      {
        id: 'capture',
        text: 'Quick capture',
        action: () =>
          void focusWindow().then(() => window.dispatchEvent(new CustomEvent(QUICK_CAPTURE_EVENT))),
      },
    ],
  })
  tray = await TrayIcon.new({
    id: 'odeen',
    icon: (await defaultWindowIcon()) ?? undefined,
    tooltip: 'ODEEN',
    menu,
    showMenuOnLeftClick: true,
  })
  return true
}

/** Text next to the tray icon (e.g. the session countdown). Empty string clears it. */
export async function setTrayTitle(text: string): Promise<void> {
  if (!tray) return
  await tray.setTitle(text || null)
  await tray.setTooltip(text ? `ODEEN · ${text}` : 'ODEEN')
}

// ── Voice (desktop: local Whisper) ───────────────────────────────
// Commands live in src-tauri/src/voice.rs. Mobile will use a cloud transcriber.

export interface VoiceModelStatus {
  downloaded: boolean
  sizeMb: number
}

export interface VoiceDownloadProgress {
  downloadedMb: number
  totalMb: number
}

export async function isVoiceAvailable(): Promise<boolean> {
  return isNative() && isDesktop(await getPlatform())
}

export async function getVoiceModelStatus(): Promise<VoiceModelStatus> {
  return invoke<VoiceModelStatus>('voice_model_status')
}

/** One-time download of the Whisper model (~148 MB). */
export async function downloadVoiceModel(
  onProgress: (p: VoiceDownloadProgress) => void,
): Promise<void> {
  const { listen } = await import('@tauri-apps/api/event')
  const unlisten = await listen<VoiceDownloadProgress>('voice-model-progress', (e) =>
    onProgress(e.payload),
  )
  try {
    await invoke('voice_download_model')
  } finally {
    unlisten()
  }
}

export async function startRecording(): Promise<void> {
  await invoke('voice_start')
}

/** Stops the microphone and returns the transcript (empty if nothing was said). */
export async function stopRecording(): Promise<string> {
  return invoke<string>('voice_stop')
}

export async function cancelRecording(): Promise<void> {
  await invoke('voice_cancel')
}
