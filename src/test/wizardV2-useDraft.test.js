import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDraft, INITIAL_DRAFT_V2 } from '../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

describe('useDraft', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('inicializa com INITIAL_DRAFT_V2', () => {
    const { result } = renderHook(() => useDraft())
    expect(result.current.draft).toEqual(INITIAL_DRAFT_V2)
    expect(result.current.hasChanges).toBe(false)
  })

  it('mescla initialSettings nas settings do draft', () => {
    const { result } = renderHook(() =>
      useDraft({ initialSettings: { allowFeats: true, startLevel: 3 } })
    )
    expect(result.current.draft.settings.allowFeats).toBe(true)
    expect(result.current.draft.settings.startLevel).toBe(3)
    // outras settings preservam defaults
    expect(result.current.draft.settings.abilityScoreMethod).toBe('standard-array')
  })

  it('startLevel propaga para draft.level', () => {
    const { result } = renderHook(() =>
      useDraft({ initialSettings: { startLevel: 5 } })
    )
    expect(result.current.draft.level).toBe(5)
  })

  it('draft.level continua 1 quando startLevel ausente', () => {
    const { result } = renderHook(() => useDraft())
    expect(result.current.draft.level).toBe(1)
  })

  it('updateDraft aplica patch e marca hasChanges', () => {
    const { result } = renderHook(() => useDraft())
    act(() => result.current.updateDraft({ name: 'Heitor' }))
    expect(result.current.draft.name).toBe('Heitor')
    expect(result.current.hasChanges).toBe(true)
  })

  it('autosalva em sessionStorage após debounce de 500ms', () => {
    const { result } = renderHook(() => useDraft())
    act(() => result.current.updateDraft({ name: 'Heitor' }))
    expect(sessionStorage.getItem('wizard-v2-draft')).toBeNull()
    act(() => vi.advanceTimersByTime(500))
    const saved = JSON.parse(sessionStorage.getItem('wizard-v2-draft'))
    expect(saved.name).toBe('Heitor')
  })

  it('restaura draft do sessionStorage com resume:true', () => {
    sessionStorage.setItem('wizard-v2-draft', JSON.stringify({
      ...INITIAL_DRAFT_V2,
      name: 'Salvo',
    }))
    const { result } = renderHook(() => useDraft({ resume: true }))
    expect(result.current.draft.name).toBe('Salvo')
    expect(result.current.hasChanges).toBe(true)
  })

  it('resetDraft volta ao INITIAL_DRAFT_V2 e limpa sessionStorage', () => {
    const { result } = renderHook(() => useDraft())
    act(() => result.current.updateDraft({ name: 'X' }))
    act(() => vi.advanceTimersByTime(500))
    act(() => result.current.resetDraft())
    expect(result.current.draft).toEqual(INITIAL_DRAFT_V2)
    expect(result.current.hasChanges).toBe(false)
    expect(sessionStorage.getItem('wizard-v2-draft')).toBeNull()
  })
})
