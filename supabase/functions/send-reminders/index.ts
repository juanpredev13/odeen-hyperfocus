// send-reminders (#113): called every 5 minutes by pg_cron. For every user
// with a push subscription it works out, in their own timezone, which
// reminders are due and sends them with Web Push.
//
// Runs with the service role because it reads every user's rows; the key
// never leaves Supabase. Callers must present the shared cron secret.
//
// Secrets: REMINDERS_CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.96.0'
import webpush from 'npm:web-push@3.6.7'
import {
  addDays,
  blocksForDay,
  formatMinute,
  intentionsMessage,
  isDailyDue,
  localNow,
  planTomorrowMessage,
  progressMessage,
  timeToMinute,
  upcomingBlocks,
  type LocalNow,
  type ProjectProgress,
  type ScheduleBlock,
} from './reminders.ts'

type Kind = 'intentions' | 'plan_tomorrow' | 'progress' | 'schedule'

interface NotificationSettings {
  user_id: string
  timezone: string
  intentions_enabled: boolean
  intentions_time: string
  plan_tomorrow_enabled: boolean
  plan_tomorrow_time: string
  progress_enabled: boolean
  progress_time: string
  schedule_enabled: boolean
  schedule_lead_minutes: number
}

interface Subscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
}

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing secret ${name}`)
  return value
}

const supabase: SupabaseClient = createClient(
  env('SUPABASE_URL'),
  env('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: { persistSession: false },
  },
)

webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))

/** Records the reminder; false when it was already sent (overlapping runs). */
async function claim(userId: string, kind: Kind, refKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('notification_log')
    .upsert(
      { user_id: userId, kind, ref_key: refKey },
      { onConflict: 'user_id,kind,ref_key', ignoreDuplicates: true },
    )
    .select('ref_key')

  if (error) throw new Error(`notification_log: ${error.message}`)
  return (data ?? []).length > 0
}

async function alreadySent(userId: string, kind: Kind, refKey: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('notification_log')
    .select('ref_key', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('ref_key', refKey)

  if (error) throw new Error(`notification_log: ${error.message}`)
  return (count ?? 0) > 0
}

async function countDayIntentions(userId: string, date: string): Promise<number> {
  const { count, error } = await supabase
    .from('intentions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('scope', 'day')
    .eq('date', date)

  if (error) throw new Error(`intentions: ${error.message}`)
  return count ?? 0
}

async function planTomorrowReminder(userId: string, now: LocalNow): Promise<PushPayload | null> {
  const tomorrow = addDays(now.date, 1)
  const body = planTomorrowMessage(await countDayIntentions(userId, tomorrow))
  if (!body) return null
  return { title: 'Plan tomorrow', body, url: '/assistant/close', tag: `plan-tomorrow-${now.date}` }
}

async function intentionsReminder(userId: string, now: LocalNow): Promise<PushPayload | null> {
  const body = intentionsMessage(await countDayIntentions(userId, now.date))
  if (!body) return null
  return { title: 'Your 3 intentions', body, url: '/assistant', tag: `intentions-${now.date}` }
}

async function progressReminder(userId: string, now: LocalNow): Promise<PushPayload | null> {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', userId)

  if (error) throw new Error(`projects: ${error.message}`)
  if (!projects || projects.length === 0) return null

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('project_id, status')
    .in(
      'project_id',
      projects.map((p) => p.id),
    )

  if (tasksError) throw new Error(`tasks: ${tasksError.message}`)

  const progress: ProjectProgress[] = projects.map((p) => {
    const own = (tasks ?? []).filter((t) => t.project_id === p.id)
    return { name: p.name, total: own.length, done: own.filter((t) => t.status === 'done').length }
  })

  const body = progressMessage(progress)
  if (!body) return null
  return { title: 'Projects: what is left', body, url: '/', tag: `progress-${now.date}` }
}

async function scheduleReminders(
  userId: string,
  now: LocalNow,
  leadMinutes: number,
): Promise<{ block: ScheduleBlock; payload: PushPayload }[]> {
  const [blocksResult, overrideResult, segmentsResult] = await Promise.all([
    supabase
      .from('schedule_blocks')
      .select('id, segment_id, day_of_week, date, start_minute, end_minute, title')
      .eq('user_id', userId)
      .or(`day_of_week.eq.${now.isoDow},date.eq.${now.date}`),
    supabase
      .from('schedule_day_overrides')
      .select('date', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('date', now.date),
    supabase.from('schedule_segments').select('id, name').eq('user_id', userId),
  ])

  if (blocksResult.error) throw new Error(`schedule_blocks: ${blocksResult.error.message}`)
  if (overrideResult.error)
    throw new Error(`schedule_day_overrides: ${overrideResult.error.message}`)
  if (segmentsResult.error) throw new Error(`schedule_segments: ${segmentsResult.error.message}`)

  const segmentName = new Map((segmentsResult.data ?? []).map((s) => [s.id, s.name as string]))
  const today = blocksForDay(
    (blocksResult.data ?? []) as ScheduleBlock[],
    now.date,
    now.isoDow,
    (overrideResult.count ?? 0) > 0,
  )

  return upcomingBlocks(today, now.minute, leadMinutes).map((block) => {
    const name = block.title || segmentName.get(block.segment_id) || 'Next block'
    const minutes = block.start_minute - now.minute
    return {
      block,
      payload: {
        title: name,
        body: `Starts at ${formatMinute(block.start_minute)}, in ${minutes} min (until ${formatMinute(block.end_minute)}).`,
        url: '/assistant/schedule',
        tag: `schedule-${block.id}-${now.date}`,
      },
    }
  })
}

/** Sends to every device of the user; drops subscriptions the push service rejects. */
async function send(subscriptions: Subscription[], payload: PushPayload): Promise<number> {
  let delivered = 0
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 },
      )
      delivered++
      await supabase
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id)
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error(`push to ${sub.id} failed`, status ?? err)
      }
    }
  }
  return delivered
}

async function remindUser(
  settings: NotificationSettings,
  subscriptions: Subscription[],
  at: Date,
): Promise<number> {
  const now = localNow(at, settings.timezone)
  const userId = settings.user_id
  let sent = 0

  if (
    settings.intentions_enabled &&
    isDailyDue(now.minute, timeToMinute(settings.intentions_time)) &&
    !(await alreadySent(userId, 'intentions', now.date))
  ) {
    const payload = await intentionsReminder(userId, now)
    if (payload && (await claim(userId, 'intentions', now.date))) {
      sent += await send(subscriptions, payload)
    }
  }

  if (
    settings.plan_tomorrow_enabled &&
    isDailyDue(now.minute, timeToMinute(settings.plan_tomorrow_time)) &&
    !(await alreadySent(userId, 'plan_tomorrow', now.date))
  ) {
    const payload = await planTomorrowReminder(userId, now)
    if (payload && (await claim(userId, 'plan_tomorrow', now.date))) {
      sent += await send(subscriptions, payload)
    }
  }

  if (
    settings.progress_enabled &&
    isDailyDue(now.minute, timeToMinute(settings.progress_time)) &&
    !(await alreadySent(userId, 'progress', now.date))
  ) {
    const payload = await progressReminder(userId, now)
    if (payload && (await claim(userId, 'progress', now.date))) {
      sent += await send(subscriptions, payload)
    }
  }

  if (settings.schedule_enabled) {
    for (const { block, payload } of await scheduleReminders(
      userId,
      now,
      settings.schedule_lead_minutes,
    )) {
      if (await claim(userId, 'schedule', `${now.date}:${block.id}`)) {
        sent += await send(subscriptions, payload)
      }
    }
  }

  return sent
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * "Send test" from the Reminders card: a signed-in user pushes one
 * notification to their own devices. Only their own subscriptions.
 */
async function sendTest(req: Request): Promise<Response> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
  }

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .eq('user_id', data.user.id)
  if (subsError) {
    return Response.json({ error: subsError.message }, { status: 500, headers: CORS_HEADERS })
  }

  const sent = await send((subs ?? []) as Subscription[], {
    title: 'ODEEN test',
    body: 'Push reminders work on this device.',
    url: '/assistant',
    tag: `test-${Date.now()}`,
  })
  return Response.json({ devices: subs?.length ?? 0, sent }, { headers: CORS_HEADERS })
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret === null) return sendTest(req)
  if (cronSecret !== env('REMINDERS_CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
  if (subsError) return new Response(subsError.message, { status: 500 })

  const byUser = new Map<string, Subscription[]>()
  for (const sub of (subs ?? []) as Subscription[]) {
    byUser.set(sub.user_id, [...(byUser.get(sub.user_id) ?? []), sub])
  }
  if (byUser.size === 0) return Response.json({ users: 0, sent: 0 })

  const { data: settingsRows, error: settingsError } = await supabase
    .from('notification_settings')
    .select('*')
    .in('user_id', [...byUser.keys()])
  if (settingsError) return new Response(settingsError.message, { status: 500 })

  const at = new Date()
  let sent = 0
  const failures: string[] = []

  for (const settings of (settingsRows ?? []) as NotificationSettings[]) {
    try {
      sent += await remindUser(settings, byUser.get(settings.user_id) ?? [], at)
    } catch (err) {
      console.error(`reminders for ${settings.user_id} failed`, err)
      failures.push(settings.user_id)
    }
  }

  return Response.json({ users: settingsRows?.length ?? 0, sent, failed: failures.length })
})
