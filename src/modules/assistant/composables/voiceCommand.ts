import { CAPTURE_KINDS, DEFAULT_CAPTURE_KIND } from '@/modules/assistant/composables/captureHelpers'
import type { CaptureKind } from '@/modules/assistant/types'

/**
 * Rule-based reading of a spoken (or typed) sentence into an app action.
 * Spanish and English keywords; no AI, works offline.
 *
 *   "Tarea en proyecto kbeauty revisar el checkout, energía alta, impacto cuatro"
 *   "Propósito de hoy terminar el informe"
 *   "Idea: probar reuniones caminando"
 */

export type EnergyLevel = 1 | 2 | 3
export type ImpactScore = 1 | 2 | 3 | 4 | 5

export type VoiceCommand =
  | {
      type: 'task'
      title: string
      projectHint: string | null
      energy: EnergyLevel | null
      impact: ImpactScore | null
    }
  | { type: 'intention'; text: string }
  | { type: 'capture'; kind: CaptureKind; text: string }

export type VoiceCommandType = VoiceCommand['type']

const TASK_WORDS = [
  'nueva tarea',
  'crear tarea',
  'agregar tarea',
  'agrega tarea',
  'añadir tarea',
  'tarea',
  'new task',
  'task',
  'todo',
]
const INTENTION_WORDS = [
  'proposito de hoy',
  'proposito del dia',
  'proposito',
  'intencion de hoy',
  'intencion',
  'objetivo de hoy',
  'objetivo',
  'meta de hoy',
  'intention for today',
  'intention',
  'goal for today',
]

/** Spanish spoken words for each capture kind; the English prefixes come from CAPTURE_KINDS. */
const CAPTURE_WORDS: Record<CaptureKind, string[]> = {
  idea: ['idea'],
  problem: ['problema'],
  worry: ['preocupacion', 'me preocupa'],
  waiting_for: ['esperando', 'esperando a', 'pendiente de'],
  distraction: ['distraccion'],
  open_loop: ['pendiente', 'recordar', 'recordatorio'],
}

const NUMBER_WORDS: Record<string, number> = {
  uno: 1,
  una: 1,
  one: 1,
  dos: 2,
  two: 2,
  tres: 3,
  three: 3,
  cuatro: 4,
  four: 4,
  cinco: 5,
  five: 5,
}

const ENERGY_WORDS: Record<string, EnergyLevel> = {
  baja: 1,
  bajo: 1,
  low: 1,
  media: 2,
  medio: 2,
  medium: 2,
  alta: 3,
  alto: 3,
  high: 3,
}

/** Lowercase and strip accents so "Propósito" matches "proposito". */
export function normalize(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Drops surrounding whitespace and the punctuation Whisper adds ("Tarea: algo." → "Tarea: algo"). */
function cleanEdges(input: string): string {
  return input.trim().replace(/^[\s,.;:\-–—]+|[\s,.;:!?\-–—]+$/g, '')
}

/**
 * If `text` starts with one of `words` (accent-insensitive, whole word),
 * returns the remainder in its original spelling, otherwise null.
 */
function stripLeadingWord(text: string, words: readonly string[]): string | null {
  const norm = normalize(text)
  // Longest first so "nueva tarea" wins over "tarea".
  const sorted = [...words].sort((a, b) => b.length - a.length)
  for (const word of sorted) {
    if (norm.startsWith(word) && !/[a-z0-9]/.test(norm.charAt(word.length))) {
      return cleanEdges(text.slice(word.length))
    }
  }
  return null
}

function toNumber(token: string): number | null {
  const n = Number.parseInt(token, 10)
  if (!Number.isNaN(n)) return n
  return NUMBER_WORDS[normalize(token)] ?? null
}

interface Extracted<T> {
  value: T | null
  rest: string
}

/** Finds "<label> <value>" anywhere in the sentence and removes it from the title. */
function extractField<T>(
  text: string,
  labels: string,
  parse: (token: string) => T | null,
): Extracted<T> {
  const re = new RegExp(`[,;]?\\s*\\b(?:${labels})\\s+(?:de\\s+|of\\s+)?([\\p{L}\\d]+)`, 'iu')
  const match = re.exec(text)
  if (!match || match[1] === undefined) return { value: null, rest: text }
  const value = parse(match[1])
  if (value === null) return { value: null, rest: text }
  return { value, rest: text.slice(0, match.index) + text.slice(match.index + match[0].length) }
}

function parseEnergy(token: string): EnergyLevel | null {
  const word = ENERGY_WORDS[normalize(token)]
  if (word) return word
  const n = toNumber(token)
  return n !== null && n >= 1 && n <= 3 ? (n as EnergyLevel) : null
}

function parseImpact(token: string): ImpactScore | null {
  const n = toNumber(token)
  return n !== null && n >= 1 && n <= 5 ? (n as ImpactScore) : null
}

function extractProject(text: string): Extracted<string> {
  // "en (el) proyecto X" / "para proyecto X" / "in project X" / "for project X"
  const re =
    /[,;]?\s*\b(?:(?:en|para|in|for)\s+(?:el\s+|the\s+)?)?(?:proyecto|project)\s+([\p{L}\d_-]+)/iu
  const match = re.exec(text)
  if (!match || match[1] === undefined) return { value: null, rest: text }
  return {
    value: match[1],
    rest: text.slice(0, match.index) + text.slice(match.index + match[0].length),
  }
}

function parseTask(body: string): VoiceCommand {
  const project = extractProject(body)
  const energy = extractField(project.rest, 'energia|energía|energy', parseEnergy)
  const impact = extractField(energy.rest, 'impacto|impact', parseImpact)
  return {
    type: 'task',
    title: capitalize(cleanEdges(impact.rest.replace(/\s{2,}/g, ' '))),
    projectHint: project.value,
    energy: energy.value,
    impact: impact.value,
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function parseVoiceCommand(input: string): VoiceCommand {
  const text = cleanEdges(input)

  const taskBody = stripLeadingWord(text, TASK_WORDS)
  if (taskBody !== null) return parseTask(taskBody)

  const intentionBody = stripLeadingWord(text, INTENTION_WORDS)
  if (intentionBody !== null) return { type: 'intention', text: capitalize(intentionBody) }

  for (const info of CAPTURE_KINDS) {
    const words = [...CAPTURE_WORDS[info.id], info.prefix, info.id.replace('_', ' ')]
    const body = stripLeadingWord(text, words)
    if (body) return { type: 'capture', kind: info.id, text: capitalize(body) }
  }

  return { type: 'capture', kind: DEFAULT_CAPTURE_KIND, text: capitalize(text) }
}

/** Picks the project whose name best matches a spoken hint (accent/case-insensitive). */
export function matchProject<T extends { id: string; name: string }>(
  projects: readonly T[],
  hint: string | null,
): T | null {
  if (!hint) return null
  const h = normalize(hint)
  return (
    projects.find((p) => normalize(p.name) === h) ??
    projects.find((p) => normalize(p.name).startsWith(h)) ??
    projects.find((p) => normalize(p.name).includes(h)) ??
    null
  )
}
