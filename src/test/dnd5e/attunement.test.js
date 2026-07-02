import { describe, it, expect } from 'vitest'
import { MAX_ATTUNED, enforceAttunementLimit } from '../../systems/dnd5e/domain/magicItems'

const item = (n, attuned = true) => ({ id: n, name: n, requiresAttunement: true, attuned })

describe('enforceAttunementLimit', () => {
  it('limite base é 3 (PHB p.138)', () => {
    expect(MAX_ATTUNED).toBe(3)
  })
  it('desativa sintonizações além da 3ª, preservando as 3 primeiras', () => {
    const out = enforceAttunementLimit([item('a'), item('b'), item('c'), item('d')])
    expect(out.map(i => i.attuned)).toEqual([true, true, true, false])
  })
  it('respeita teto maior (Artífice nv10+ = 4)', () => {
    const items = [item('a'), item('b'), item('c'), item('d')]
    expect(enforceAttunementLimit(items, 4)).toBe(items) // nada muda
  })
  it('não mexe em lista dentro do limite (mesma referência)', () => {
    const items = [item('a'), item('b')]
    expect(enforceAttunementLimit(items)).toBe(items)
  })
  it('itens não-sintonizados no meio não contam pro limite', () => {
    const out = enforceAttunementLimit([item('a'), item('b', false), item('c'), item('d'), item('e')])
    expect(out.map(i => i.attuned)).toEqual([true, false, true, true, false])
  })
  it('lista vazia/ausente não explode', () => {
    expect(enforceAttunementLimit()).toEqual([])
  })
})
