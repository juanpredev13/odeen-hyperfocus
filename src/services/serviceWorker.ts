/**
 * Registers /sw.js (push reminders, #113). Skipped where service workers
 * are unavailable, e.g. inside the Tauri webview or on plain http.
 */

let registration: Promise<ServiceWorkerRegistration | null> | null = null

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registration) return registration
  if (!('serviceWorker' in navigator) || '__TAURI_INTERNALS__' in window) {
    registration = Promise.resolve(null)
    return registration
  }
  registration = navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => null)
  return registration
}

/** The active registration, once the worker is ready. */
export async function getServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  const registered = await registerServiceWorker()
  if (!registered) return null
  return navigator.serviceWorker.ready
}
