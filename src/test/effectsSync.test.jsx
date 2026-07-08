import { describe, it, expect, vi } from 'vitest'
import { EffectsSync } from '../systems/dnd5e/components/CharacterSheet/v2/EffectsSync'
import { renderWithSheetContext, makeCharacter, makeUpdaters } from './helpers/sheetV2TestContext'

const BENCAO = { id: 'bencao', name: 'Bênção', source: 'manual', concentration: true, riders: [{ dice: '1d4', categories: ['attack', 'save'] }], summary: '+1d4' }
const ORIENT = { id: 'orientacao', name: 'Orientação', source: 'manual', concentration: true, riders: [{ dice: '1d4', categories: ['check'], oneShot: true }], summary: 'x' }
const VELOC  = { id: 'velocidade', name: 'Velocidade', source: 'manual', concentration: true, advantages: [{ categories: ['save'], abilities: ['dex'] }], summary: 'x' }

function setup(effects, updaters = {}) {
  let captured = null
  const dice = { setRollEffectsResolver: vi.fn(fn => { captured = fn }) }
  const base = makeCharacter()
  renderWithSheetContext(<EffectsSync />, {
    character: { ...base, combat: { ...base.combat, activeEffects: effects } },
    dice,
    updaters: makeUpdaters(updaters),
  })
  return { resolver: () => captured, dice }
}

describe('EffectsSync', () => {
  it('registra resolver que filtra por categoria', () => {
    const { resolver } = setup([BENCAO])
    const r = resolver()
    expect(r('attack', null)).toMatchObject({ extraDice: ['1d4'] })
    expect(r('check', null)).toBeNull()
  })
  it('advantage filtra por ability (Velocidade: so salvaguarda de DES)', () => {
    const { resolver } = setup([VELOC])
    const r = resolver()
    expect(r('save', 'dex')).toMatchObject({ advantage: 'adv' })
    expect(r('save', 'con')).toBeNull()
    expect(r('save', null)).toBeNull()
  })
  it('oneShot: onApplied remove o efeito', () => {
    const removeActiveEffect = vi.fn()
    const { resolver } = setup([ORIENT], { removeActiveEffect })
    const r = resolver()('check', 'wis')
    r.onApplied()
    expect(removeActiveEffect).toHaveBeenCalledWith('orientacao')
  })
  it('labelSuffix identifica a origem', () => {
    const { resolver } = setup([BENCAO])
    expect(resolver()('save', 'wis').labelSuffix).toBe(' · Bênção +1d4')
  })
  it('sem efeitos aplicaveis registra resolver que devolve null', () => {
    const { resolver } = setup([])
    expect(resolver() == null || resolver()('attack', null) == null).toBe(true)
  })
})
