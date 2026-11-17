import { supabase } from '@/services/supabase'
import { getServiceWorker } from '@/services/serviceWorker'
import type { AssistantResult, PushStatus } from '@/modules/assistant/types'

// Settings live in their own service (no browser APIs) so the MCP server can use them.
export {
  fetchNotificationSettings,
  saveNotificationSettings,
} from '@/modules/assistant/services/notificationSettings.service'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** Push needs a service worker, the Push API and a configured VAPID key. */
export function isPushSupported(): boolean {
  return (
    Boolean(VAPID_PUBLIC_KEY) &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** True when running as an installed app (home screen / standalone window). */
export function isInstalledApp(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const registration = await getServiceWorker()
  if (!registration) return 'unsupported'
  const subscription = await registration.pushManager.getSubscription()
  return subscription ? 'on' : 'off'
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = window.atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/** Asks for permission, subscribes this device and stores the subscription. */
export async function enablePush(): Promise<AssistantResult<PushStatus>> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    return { data: null, error: { message: 'Push notifications are not available here' } }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { data: permission === 'denied' ? 'denied' : 'off', error: null }
  }

  const registration = await getServiceWorker()
  if (!registration) return { data: null, error: { message: 'Service worker not available' } }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not authenticated' } }

  let subscription: PushSubscription
  try {
    subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not subscribe to push'
    return { data: null, error: { message } }
  }

  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) {
    return { data: null, error: { message: 'Invalid push subscription' } }
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: 'endpoint' },
  )

  if (error) return { data: null, error: { message: error.message } }

  return { data: 'on', error: null }
}

/** Unsubscribes this device and removes its row. Other devices keep theirs. */
export async function disablePush(): Promise<AssistantResult<PushStatus>> {
  const registration = await getServiceWorker()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return { data: 'off', error: null }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', subscription.endpoint)

  if (error) return { data: null, error: { message: error.message } }

  await subscription.unsubscribe()
  return { data: 'off', error: null }
}

/** Pushes one test notification to every device of the signed-in user. */
export async function sendTestPush(): Promise<AssistantResult<{ devices: number; sent: number }>> {
  const { data, error } = await supabase.functions.invoke<{ devices: number; sent: number }>(
    'send-reminders',
    { body: { test: true } },
  )

  if (error) return { data: null, error: { message: error.message } }
  if (!data) return { data: null, error: { message: 'No response from the reminders service' } }

  return { data, error: null }
}
