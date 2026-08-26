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
    // exhaustion: 0 — estes testes são sobre BUFFS de magia; a fixture base
    // vem com exhaustion: 2 (usado noutros testes da ficha), e isso vazaria
    // desvantagem de exaustão pra dentro de expectativas que só falam de
    // riders/vantagem de magia. Os testes de exaustão em si usam montarResolver().
    character: { ...base, combat: { ...base.combat, exhaustion: 0, activeEffects: effects } },
    dice,
    updaters: makeUpdaters(updaters),
  })
  return { resolver: () => captured, dice }
}

// Variante do setup() acima pros testes de exaustão: aceita overrides de
// `meta`/`combat` inteiros (ruleset, exhaustion) em vez de só activeEffects.
function montarResolver(overrides = {}) {
  let captured = null
  const dice = { setRollEffectsResolver: vi.fn(fn => { captured = fn }) }
  renderWithSheetContext(<EffectsSync />, {
    character: makeCharacter(overrides),
    dice,
    updaters: makeUpdaters(),
  })
  return captured
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

  it('2024: registra resolver por exaustão mesmo SEM buff nenhum', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2024' },
      combat: { exhaustion: 2, activeEffects: [] },
    })
    expect(resolver).not.toBeNull()
    expect(resolver('check', 'dex').flatMod).toBe(-4)
    expect(resolver('attack', null).flatMod).toBe(-4)
    expect(resolver('save', 'con').flatMod).toBe(-4)
  })

  it('2024: dano NÃO recebe a penalidade (a regra fala de teste de d20)', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2024' },
      combat: { exhaustion: 3, activeEffects: [] },
    })
    expect(resolver('damage', null)?.flatMod ?? 0).toBe(0)
  })

  it('2014: exaustão 1 dá desvantagem em teste, não em ataque nem salvaguarda', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2014' },
      combat: { exhaustion: 1, activeEffects: [] },
    })
    expect(resolver('check', 'dex').advantage).toBe('dis')
    expect(resolver('attack', null)?.advantage ?? null).toBeNull()
    expect(resolver('save', 'con')?.advantage ?? null).toBeNull()
  })

  it('2014: exaustão 3 estende a desvantagem a ataque e salvaguarda', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2014' },
      combat: { exhaustion: 3, activeEffects: [] },
    })
    expect(resolver('attack', null).advantage).toBe('dis')
    expect(resolver('save', 'con').advantage).toBe('dis')
  })

  it('2014: nunca emite flatMod', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2014' },
      combat: { exhaustion: 5, activeEffects: [] },
    })
    expect(resolver('check', 'dex').flatMod ?? 0).toBe(0)
  })

  it('sem exaustão e sem buff, o resolver volta a ser null', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2024' },
      combat: { exhaustion: 0, activeEffects: [] },
    })
    expect(resolver).toBeNull()
  })
})
