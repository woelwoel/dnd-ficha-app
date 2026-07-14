import { describe, it, expect } from 'vitest'
import {
  spellRollPlan, cantripTier, parseDiceNotation, DAMAGE_TYPES_PT,
} from '../systems/dnd5e/domain/spellMechanics'

const CTX = { slotLevel: null, characterLevel: 5, spellAttack: 6, spellMod: 3, spellDC: 14 }

describe('parseDiceNotation', () => {
  it('parseia contagem, lados e modificador', () => {
    expect(parseDiceNotation('8d6')).toEqual({ count: 8, sides: 6, mod: 0 })
    expect(parseDiceNotation('3d4+3')).toEqual({ count: 3, sides: 4, mod: 3 })
    expect(parseDiceNotation('d8-1')).toEqual({ count: 1, sides: 8, mod: -1 })
    expect(parseDiceNotation('banana')).toBeNull()
  })
})

describe('cantripTier', () => {
  it('segue PHB: 1/5/11/17', () => {
    expect(cantripTier(1)).toBe(1)
    expect(cantripTier(4)).toBe(1)
    expect(cantripTier(5)).toBe(2)
    expect(cantripTier(11)).toBe(3)
    expect(cantripTier(17)).toBe(4)
  })
})

describe('spellRollPlan', () => {
  it('retorna null sem mecânica', () => {
    expect(spellRollPlan({ name: 'X', level: 1 }, null, CTX)).toBeNull()
  })

  it('magia de salvaguarda: dano direto com CD anunciada no label', () => {
    const mech = { save: { ability: 'dex', halfOnSuccess: true }, damage: [{ dice: '8d6', type: 'fogo' }], upcast: { perSlot: '1d6' } }
    const plan = spellRollPlan({ name: 'Bola de Fogo', level: 3 }, mech, { ...CTX, slotLevel: 3 })
    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0]).toMatchObject({ kind: 'damage', notation: '8d6', critable: false })
    expect(plan.steps[0].label).toBe('Bola de Fogo · dano (Nv 3) · CD 14 · salvaguarda de DES · metade no sucesso')
  })

  it('upcast soma perSlot por nivel acima do base', () => {
    const mech = { save: { ability: 'dex', halfOnSuccess: true }, damage: [{ dice: '8d6', type: 'fogo' }], upcast: { perSlot: '1d6' } }
    const plan = spellRollPlan({ name: 'Bola de Fogo', level: 3 }, mech, { ...CTX, slotLevel: 5 })
    expect(plan.steps[0].notation).toBe('10d6')
    expect(plan.steps[0].label).toContain('(Nv 5)')
  })

  it('upcast com modificador no dado (Misseis Magicos)', () => {
    const mech = { damage: [{ dice: '3d4+3', type: 'força' }], upcast: { perSlot: '1d4+1' } }
    const plan = spellRollPlan({ name: 'Mísseis Mágicos', level: 1 }, mech, { ...CTX, slotLevel: 3 })
    expect(plan.steps[0].notation).toBe('5d4+5')
  })

  it('truque de ataque escala dados pelo nivel do personagem', () => {
    const mech = { attack: true, damage: [{ dice: '1d10', type: 'fogo' }], cantripScaling: true }
    const plan = spellRollPlan({ name: 'Raio de Fogo', level: 0 }, mech, CTX)
    expect(plan.steps).toHaveLength(2)
    expect(plan.steps[0]).toMatchObject({ kind: 'attack', notation: '1d20+6', label: 'Raio de Fogo · ataque' })
    expect(plan.steps[1]).toMatchObject({ kind: 'damage', notation: '2d10', critable: true })
    expect(plan.steps[1].label).toBe('Raio de Fogo · dano')
    expect(plan.steps[1].critLabel).toBe('Raio de Fogo · dano CRÍTICO')
  })

  it('cura com addMod soma o mod de conjuracao; upcast no heal', () => {
    const mech = { heal: { dice: '1d8', addMod: true }, upcast: { perSlot: '1d8' } }
    const plan = spellRollPlan({ name: 'Curar Ferimentos', level: 1 }, mech, { ...CTX, slotLevel: 2 })
    expect(plan.steps).toEqual([
      { kind: 'heal', notation: '2d8+3', label: 'Curar Ferimentos · cura (Nv 2)' },
    ])
  })

  it('multiplos pacotes de dano levam o tipo no label; upcast so no primeiro', () => {
    const mech = { attack: true, damage: [{ dice: '4d6', type: 'cortante' }, { dice: '2d6', type: 'fogo' }] }
    const plan = spellRollPlan({ name: 'Golpe Flamejante', level: 2 }, mech, { ...CTX, slotLevel: 2 })
    const dmg = plan.steps.filter(s => s.kind === 'damage')
    expect(dmg[0].label).toContain('(cortante)')
    expect(dmg[1].label).toContain('(fogo)')
  })

  it('beams: um ataque POR raio; perSlot adiciona raios', () => {
    const mech = { attack: true, damage: [{ dice: '2d6', type: 'fogo' }], beams: { base: 3, perSlot: 1 } }
    const plan = spellRollPlan({ name: 'Raio Ardente', level: 2 }, mech, { ...CTX, slotLevel: 3 })
    const attacks = plan.steps.filter(s => s.kind === 'attack')
    const damages = plan.steps.filter(s => s.kind === 'damage')
    expect(attacks).toHaveLength(4)
    expect(damages).toHaveLength(4)
    expect(damages[0].notation).toBe('2d6')
    expect(attacks[0].label).toBe('Raio Ardente · ataque · raio 1/4')
  })

  it('beams.cantripScaling escala o numero de raios (Rajada Mistica)', () => {
    const mech = { attack: true, damage: [{ dice: '1d10', type: 'força' }], beams: { base: 1, cantripScaling: true } }
    const plan = spellRollPlan({ name: 'Rajada Mística', level: 0 }, mech, { ...CTX, characterLevel: 11 })
    expect(plan.steps.filter(s => s.kind === 'attack')).toHaveLength(3)
    expect(plan.steps.filter(s => s.kind === 'damage')[0].notation).toBe('1d10')
  })

  it('anuncio de CD aparece so no primeiro passo de dano', () => {
    const mech = { save: { ability: 'dex', halfOnSuccess: true }, damage: [{ dice: '2d8', type: 'fogo' }, { dice: '1d6', type: 'frio' }] }
    const plan = spellRollPlan({ name: 'Teste', level: 2 }, mech, { ...CTX, slotLevel: 2 })
    const dmg = plan.steps.filter(s => s.kind === 'damage')
    expect(dmg[0].label).toContain('CD 14')
    expect(dmg[1].label).not.toContain('CD 14')
  })

  it('upcast.perLevels escala a cada N niveis (Arma Espiritual: a cada 2)', () => {
    const mech = { attack: true, damage: [{ dice: '1d8', type: 'força', addMod: true }], upcast: { perSlot: '1d8', perLevels: 2 } }
    // base nv2: 1d8+mod
    const base = spellRollPlan({ name: 'Arma Espiritual', level: 2 }, mech, { ...CTX, slotLevel: 2 })
    expect(base.steps.find(s => s.kind === 'damage').notation).toBe('1d8+3')
    // nv3 (1 acima): ainda 1d8+mod (nao chegou a 2 niveis)
    const l3 = spellRollPlan({ name: 'Arma Espiritual', level: 2 }, mech, { ...CTX, slotLevel: 3 })
    expect(l3.steps.find(s => s.kind === 'damage').notation).toBe('1d8+3')
    // nv4 (2 acima): +1d8 → 2d8+mod
    const l4 = spellRollPlan({ name: 'Arma Espiritual', level: 2 }, mech, { ...CTX, slotLevel: 4 })
    expect(l4.steps.find(s => s.kind === 'damage').notation).toBe('2d8+3')
    // nv6 (4 acima): +2d8 → 3d8+mod
    const l6 = spellRollPlan({ name: 'Arma Espiritual', level: 2 }, mech, { ...CTX, slotLevel: 6 })
    expect(l6.steps.find(s => s.kind === 'damage').notation).toBe('3d8+3')
  })

  it('damage addMod soma o mod de conjuracao ao pacote', () => {
    const mech = { attack: true, damage: [{ dice: '1d8', type: 'força', addMod: true }] }
    const plan = spellRollPlan({ name: 'X', level: 2 }, mech, { ...CTX, slotLevel: 2, spellMod: 4 })
    expect(plan.steps.find(s => s.kind === 'damage').notation).toBe('1d8+4')
  })

  it('upcast.packet aplica perSlot no pacote indicado (Faca de Gelo: +1d6 no frio)', () => {
    const mech = {
      attack: true,
      damage: [{ dice: '1d10', type: 'perfurante' }, { dice: '2d6', type: 'frio' }],
      upcast: { perSlot: '1d6', packet: 1 },
    }
    const plan = spellRollPlan({ name: 'Faca de Gelo', level: 1 }, mech, { ...CTX, slotLevel: 3 })
    const dmg = plan.steps.filter(s => s.kind === 'damage')
    expect(dmg[0].notation).toBe('1d10')
    expect(dmg[1].notation).toBe('4d6')
  })

  it('damage[].onHit marca pacote extra como critable (Raio de Caos: 2d8 + 1d6 do golpe)', () => {
    const mech = {
      attack: true,
      damage: [{ dice: '2d8', type: 'força' }, { dice: '1d6', type: 'força', onHit: true }],
      upcast: { perSlot: '1d6', packet: 1 },
    }
    const plan = spellRollPlan({ name: 'Raio de Caos', level: 1 }, mech, { ...CTX, slotLevel: 2 })
    const dmg = plan.steps.filter(s => s.kind === 'damage')
    expect(dmg[0]).toMatchObject({ notation: '2d8', critable: true })
    expect(dmg[1]).toMatchObject({ notation: '2d6', critable: true })
  })

  it('sem onHit, so o primeiro pacote de magia de ataque e critable (explosao da Faca de Gelo rola mesmo errando)', () => {
    const mech = { attack: true, damage: [{ dice: '1d10', type: 'perfurante' }, { dice: '2d6', type: 'frio' }] }
    const plan = spellRollPlan({ name: 'Faca de Gelo', level: 1 }, mech, { ...CTX, slotLevel: 1 })
    const dmg = plan.steps.filter(s => s.kind === 'damage')
    expect(dmg[0].critable).toBe(true)
    expect(dmg[1].critable).toBe(false)
  })

  it('upcast.tiers substitui a notacao pela faixa do slot (Lamina Sombria: 3-4=3d8, 5-6=4d8, 7+=5d8)', () => {
    const mech = { damage: [{ dice: '2d8', type: 'psíquico' }], upcast: { tiers: { 3: '3d8', 5: '4d8', 7: '5d8' } } }
    const at = lvl => spellRollPlan({ name: 'Lâmina Sombria', level: 2 }, mech, { ...CTX, slotLevel: lvl })
      .steps.find(s => s.kind === 'damage').notation
    expect(at(2)).toBe('2d8')
    expect(at(3)).toBe('3d8')
    expect(at(4)).toBe('3d8')
    expect(at(5)).toBe('4d8')
    expect(at(6)).toBe('4d8')
    expect(at(7)).toBe('5d8')
    expect(at(9)).toBe('5d8')
  })

  it('perLevels default 1 nao muda upcast por nivel (Bola de Fogo)', () => {
    const mech = { save: { ability: 'dex', halfOnSuccess: true }, damage: [{ dice: '8d6', type: 'fogo' }], upcast: { perSlot: '1d6' } }
    const plan = spellRollPlan({ name: 'Bola de Fogo', level: 3 }, mech, { ...CTX, slotLevel: 5 })
    expect(plan.steps[0].notation).toBe('10d6')
  })

  it('DAMAGE_TYPES_PT contem os 13 tipos canonicos', () => {
    expect(DAMAGE_TYPES_PT).toHaveLength(13)
    expect(DAMAGE_TYPES_PT).toContain('fogo')
    expect(DAMAGE_TYPES_PT).toContain('força')
  })
})
