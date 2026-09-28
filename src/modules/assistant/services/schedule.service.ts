import { supabase } from '@/services/supabase'
import { isValidRange } from '@/modules/assistant/composables/scheduleHelpers'
import type {
  AssistantResult,
  CreateBlockPayload,
  CreateSegmentPayload,
  DayOverride,
  ScheduleBlock,
  ScheduleSegment,
  UpdateBlockPayload,
  UpdateSegmentPayload,
} from '@/modules/assistant/types'

const OVERLAP_MESSAGE = 'Blocks cannot overlap on the same day'
const RANGE_MESSAGE = 'Blocks start and end on a 15-minute slot, inside the day'

interface DbError {
  code?: string
  message: string
}

function toMessage(error: DbError): string {
  if (error.code === '23P01') return OVERLAP_MESSAGE
  if (error.code === '23514') return RANGE_MESSAGE
  return error.message
}

async function currentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ── Segments ──

export async function fetchSegments(): Promise<AssistantResult<ScheduleSegment[]>> {
  const { data, error } = await supabase
    .from('schedule_segments')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as ScheduleSegment[], error: null }
}

export async function createSegments(
  payloads: readonly CreateSegmentPayload[],
): Promise<AssistantResult<ScheduleSegment[]>> {
  if (payloads.some((p) => !p.name.trim())) {
    return { data: null, error: { message: 'Segment name is required' } }
  }

  const userId = await currentUserId()
  if (!userId) return { data: null, error: { message: 'Not authenticated' } }

  const { data, error } = await supabase
    .from('schedule_segments')
    .insert(payloads.map((p) => ({ ...p, name: p.name.trim(), user_id: userId })))
    .select()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as ScheduleSegment[], error: null }
}

export async function updateSegment(
  payload: UpdateSegmentPayload,
): Promise<AssistantResult<ScheduleSegment>> {
  const { id, ...fields } = payload
  if (fields.name !== undefined && !fields.name.trim()) {
    return { data: null, error: { message: 'Segment name is required' } }
  }

  const { data, error } = await supabase
    .from('schedule_segments')
    .update(fields.name === undefined ? fields : { ...fields, name: fields.name.trim() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as ScheduleSegment, error: null }
}

// ── Blocks ──

/** Every template block, plus override blocks dated within [fromISO, toISO]. */
export async function fetchBlocks(
  fromISO: string,
  toISO: string,
): Promise<AssistantResult<ScheduleBlock[]>> {
  const { data, error } = await supabase
    .from('schedule_blocks')
    .select('*')
    .or(`day_of_week.not.is.null,and(date.gte.${fromISO},date.lte.${toISO})`)
    .order('start_minute', { ascending: true })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as ScheduleBlock[], error: null }
}

export async function createBlock(payload: CreateBlockPayload): Promise<AssistantResult<ScheduleBlock>> {
  if (!isValidRange(payload)) return { data: null, error: { message: RANGE_MESSAGE } }

  const userId = await currentUserId()
  if (!userId) return { data: null, error: { message: 'Not authenticated' } }

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert({ ...payload, user_id: userId })
    .select()
    .single()

  if (error) return { data: null, error: { message: toMessage(error) } }

  return { data: data as ScheduleBlock, error: null }
}

export async function createBlocks(
  payloads: readonly CreateBlockPayload[],
): Promise<AssistantResult<ScheduleBlock[]>> {
  if (payloads.some((p) => !isValidRange(p))) return { data: null, error: { message: RANGE_MESSAGE } }

  const userId = await currentUserId()
  if (!userId) return { data: null, error: { message: 'Not authenticated' } }

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert(payloads.map((p) => ({ ...p, user_id: userId })))
    .select()

  if (error) return { data: null, error: { message: toMessage(error) } }

  return { data: data as ScheduleBlock[], error: null }
}

export async function updateBlock(payload: UpdateBlockPayload): Promise<AssistantResult<ScheduleBlock>> {
  const { id, ...fields } = payload
  if (
    fields.start_minute !== undefined &&
    fields.end_minute !== undefined &&
    !isValidRange({ start_minute: fields.start_minute, end_minute: fields.end_minute })
  ) {
    return { data: null, error: { message: RANGE_MESSAGE } }
  }

  const { data, error } = await supabase
    .from('schedule_blocks')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: { message: toMessage(error) } }

  return { data: data as ScheduleBlock, error: null }
}

export async function deleteBlock(id: string): Promise<AssistantResult<null>> {
  const { error } = await supabase.from('schedule_blocks').delete().eq('id', id)

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}

export async function deleteBlocks(ids: readonly string[]): Promise<AssistantResult<null>> {
  if (ids.length === 0) return { data: null, error: null }

  const { error } = await supabase.from('schedule_blocks').delete().in('id', ids)

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}

/** Deletes every block of a series, in the template and on any date. */
export async function deleteSeries(seriesId: string): Promise<AssistantResult<null>> {
  const { error } = await supabase.from('schedule_blocks').delete().eq('series_id', seriesId)

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}

// ── Day overrides ──

export async function fetchOverrides(
  fromISO: string,
  toISO: string,
): Promise<AssistantResult<DayOverride[]>> {
  const { data, error } = await supabase
    .from('schedule_day_overrides')
    .select('*')
    .gte('date', fromISO)
    .lte('date', toISO)

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as DayOverride[], error: null }
}

/**
 * Detaches one date from the template: marks the day as overridden and
 * copies the template blocks onto that date so they can be edited alone.
 */
export async function overrideDay(
  dateISO: string,
  templateBlocks: readonly ScheduleBlock[],
): Promise<AssistantResult<ScheduleBlock[]>> {
  const userId = await currentUserId()
  if (!userId) return { data: null, error: { message: 'Not authenticated' } }

  const { error: overrideError } = await supabase
    .from('schedule_day_overrides')
    .insert({ user_id: userId, date: dateISO })

  if (overrideError) return { data: null, error: { message: overrideError.message } }
  if (templateBlocks.length === 0) return { data: [], error: null }

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert(
      templateBlocks.map((b) => ({
        user_id: userId,
        segment_id: b.segment_id,
        day_of_week: null,
        date: dateISO,
        start_minute: b.start_minute,
        end_minute: b.end_minute,
        title: b.title,
        note: b.note,
        series_id: b.series_id,
      })),
    )
    .select()

  if (error) return { data: null, error: { message: toMessage(error) } }

  return { data: data as ScheduleBlock[], error: null }
}

/** Re-attaches a date to the template, dropping its own blocks. */
export async function resetDay(dateISO: string): Promise<AssistantResult<null>> {
  const { error: blocksError } = await supabase.from('schedule_blocks').delete().eq('date', dateISO)
  if (blocksError) return { data: null, error: { message: blocksError.message } }

  const { error } = await supabase.from('schedule_day_overrides').delete().eq('date', dateISO)
  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}
