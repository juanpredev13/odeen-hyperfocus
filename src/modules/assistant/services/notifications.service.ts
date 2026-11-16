import { supabase } from '@/services/supabase'
import { getServiceWorker } from '@/services/serviceWorker'
import type {
  AssistantResult,
  NotificationSettings,
  PushStatus,
  UpdateNotificationSettingsPayload,
} from '@/modules/assistant/types'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
const LEAD_MINUTES = [5, 10, 15, 30]
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

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

/** Returns `data: null` when the user has not saved notification settings yet. */
export async function fetchNotificationSettings(): Promise<AssistantResult<NotificationSettings>> {
  const { data, error } = await supabase.from('notification_settings').select('*').maybeSingle()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as NotificationSettings | null, error: null }
}

export async function saveNotificationSettings(
  payload: UpdateNotificationSettingsPayload,
): Promise<AssistantResult<NotificationSettings>> {
  for (const time of [payload.intentions_time, payload.plan_tomorrow_time, payload.progress_time]) {
    if (time !== undefined && !TIME_PATTERN.test(time)) {
      return { data: null, error: { message: 'Times must be HH:MM' } }
    }
  }
  if (
    payload.schedule_lead_minutes !== undefined &&
    !LEAD_MINUTES.includes(payload.schedule_lead_minutes)
  ) {
    return { data: null, error: { message: 'Lead time must be 5, 10, 15 or 30 minutes' } }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not authenticated' } }

  const { data, error } = await supabase
    .from('notification_settings')
    .upsert({ ...payload, user_id: user.id, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as NotificationSettings, error: null }
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
