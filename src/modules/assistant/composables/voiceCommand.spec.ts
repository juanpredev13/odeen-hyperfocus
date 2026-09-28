import { describe, expect, it } from 'vitest'
import { matchProject, parseVoiceCommand } from '@/modules/assistant/composables/voiceCommand'

describe('parseVoiceCommand', () => {
  it('reads a task with project, energy and impact', () => {
    expect(
      parseVoiceCommand(
        'Tarea en proyecto kbeauty revisar el checkout, energía alta, impacto cuatro.',
      ),
    ).toEqual({
      type: 'task',
      title: 'Revisar el checkout',
      projectHint: 'kbeauty',
      energy: 3,
      impact: 4,
    })
  })

  it('reads a bare task with Whisper punctuation', () => {
    expect(parseVoiceCommand('Nueva tarea: llamar al banco.')).toEqual({
      type: 'task',
      title: 'Llamar al banco',
      projectHint: null,
      energy: null,
      impact: null,
    })
  })

  it('reads English tasks with digits', () => {
    expect(parseVoiceCommand('task write the report for project odeen energy 2 impact 5')).toEqual({
      type: 'task',
      title: 'Write the report',
      projectHint: 'odeen',
      energy: 2,
      impact: 5,
    })
  })

  it('ignores out-of-range values', () => {
    const cmd = parseVoiceCommand('tarea algo impacto nueve')
    expect(cmd).toMatchObject({ type: 'task', impact: null })
  })

  it('reads intentions without accents or with them', () => {
    expect(parseVoiceCommand('Propósito de hoy terminar el informe')).toEqual({
      type: 'intention',
      text: 'Terminar el informe',
    })
    expect(parseVoiceCommand('intencion: salir a caminar')).toEqual({
      type: 'intention',
      text: 'Salir a caminar',
    })
  })

  it('maps spoken capture kinds', () => {
    expect(parseVoiceCommand('Idea, probar reuniones caminando')).toEqual({
      type: 'capture',
      kind: 'idea',
      text: 'Probar reuniones caminando',
    })
    expect(parseVoiceCommand('Me preocupa el deploy del viernes')).toMatchObject({ kind: 'worry' })
    expect(parseVoiceCommand('problema: el login falla en iOS')).toMatchObject({ kind: 'problem' })
  })

  it('does not match a keyword inside a longer word', () => {
    expect(parseVoiceCommand('tareas de la casa')).toEqual({
      type: 'capture',
      kind: 'open_loop',
      text: 'Tareas de la casa',
    })
  })

  it('falls back to an open loop capture', () => {
    expect(parseVoiceCommand('comprar pilas')).toEqual({
      type: 'capture',
      kind: 'open_loop',
      text: 'Comprar pilas',
    })
  })
})

describe('matchProject', () => {
  const projects = [
    { id: '1', name: 'Odeen HyperFocus' },
    { id: '2', name: 'KBeauty' },
  ]

  it('matches exact, prefix and accent-insensitive', () => {
    expect(matchProject(projects, 'kbeauty')?.id).toBe('2')
    expect(matchProject(projects, 'odeen')?.id).toBe('1')
    expect(matchProject(projects, 'hyperfocus')?.id).toBe('1')
  })

  it('returns null without a hint or a match', () => {
    expect(matchProject(projects, null)).toBeNull()
    expect(matchProject(projects, 'nada')).toBeNull()
  })
})
