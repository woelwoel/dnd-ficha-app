import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCampaignContext, resetScopeIfMissing } from '../hooks/useCampaignContext'
import { CAMPAIGN_SCOPE_STORAGE_KEY } from '../utils/config'

describe('useCampaignContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('default scope é personal quando localStorage vazio', () => {
    const { result } = renderHook(() => useCampaignContext())
    expect(result.current[0]).toBe('personal')
  })

  it('persiste mesa em localStorage e recupera após remount', () => {
    const { result } = renderHook(() => useCampaignContext())
    act(() => result.current[1]({ campaignId: 'abc-123' }))
    expect(localStorage.getItem(CAMPAIGN_SCOPE_STORAGE_KEY)).toContain('abc-123')

    const { result: remount } = renderHook(() => useCampaignContext())
    expect(remount.current[0]).toEqual({ campaignId: 'abc-123' })
  })

  it('volta pra personal quando setScope é chamado com "personal"', () => {
    const { result } = renderHook(() => useCampaignContext())
    act(() => result.current[1]({ campaignId: 'x' }))
    act(() => result.current[1]('personal'))
    expect(result.current[0]).toBe('personal')
    expect(localStorage.getItem(CAMPAIGN_SCOPE_STORAGE_KEY)).toBe('personal')
  })

  it('lida com localStorage corrompido voltando pra personal', () => {
    localStorage.setItem(CAMPAIGN_SCOPE_STORAGE_KEY, '{invalid json')
    const { result } = renderHook(() => useCampaignContext())
    expect(result.current[0]).toBe('personal')
  })
})

describe('resetScopeIfMissing', () => {
  it('reseta scope pra personal quando a mesa não está na lista', () => {
    const setScope = vi.fn()
    const reset = resetScopeIfMissing({ campaignId: 'missing' }, setScope, [{ id: 'other' }])
    expect(reset).toBe(true)
    expect(setScope).toHaveBeenCalledWith('personal')
  })

  it('mantém scope quando a mesa ainda existe', () => {
    const setScope = vi.fn()
    const reset = resetScopeIfMissing({ campaignId: 'kept' }, setScope, [{ id: 'kept' }])
    expect(reset).toBe(false)
    expect(setScope).not.toHaveBeenCalled()
  })

  it('ignora scope "personal"', () => {
    const setScope = vi.fn()
    const reset = resetScopeIfMissing('personal', setScope, [])
    expect(reset).toBe(false)
    expect(setScope).not.toHaveBeenCalled()
  })

  it('lida com myCampaigns null/undefined', () => {
    const setScope = vi.fn()
    const reset = resetScopeIfMissing({ campaignId: 'x' }, setScope, null)
    expect(reset).toBe(true)
    expect(setScope).toHaveBeenCalledWith('personal')
  })
})
