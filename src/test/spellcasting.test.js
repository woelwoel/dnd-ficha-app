import { describe, it, expect } from 'vitest'
import { calculateMulticlassSpellSlots, getWarlockPactSlots, getSpellcastingRules } from '../utils/spellcasting'

describe('calculateMulticlassSpellSlots', () => {
  it('monoclasse sem multiclasse retorna null', () => {
    expect(calculateMulticlassSpellSlots('mago', 5, [])).toBeNull()
  })

  it('guerreiro2/mago3 → nível efetivo 3 → slots corretos', () => {
    // guerreiro é non-caster, mago é full → efectiveLevel = 3
    const slots = calculateMulticlassSpellSlots('mago', 3, [{ class: 'guerreiro', level: 2 }])
    expect(slots).not.toBeNull()
    expect(slots[1]).toBe(4)
    expect(slots[2]).toBe(2)
    expect(slots[3]).toBeUndefined()
  })

  it('paladino2/feiticeiro3 → nível efetivo 4 (1+3) → slots corretos', () => {
    // paladino é half (nível 2 → 1), feiticeiro é full (3)
    const slots = calculateMulticlassSpellSlots('feiticeiro', 3, [{ class: 'paladino', level: 2 }])
    expect(slots).not.toBeNull()
    expect(slots[1]).toBe(4)
    expect(slots[2]).toBe(3)
  })

  it('bruxo NÃO entra na tabela multiclasse unificada', () => {
    // bruxo3/mago3 → apenas mago conta como full (efetivo 3)
    const slots = calculateMulticlassSpellSlots('mago', 3, [{ class: 'bruxo', level: 3 }])
    // Só mago contribui: efetivo = 3
    expect(slots).not.toBeNull()
    expect(slots[1]).toBe(4)
    expect(slots[2]).toBe(2)
  })

  it('classes sem conjuração não geram slots', () => {
    const slots = calculateMulticlassSpellSlots('guerreiro', 5, [{ class: 'ladino', level: 3 }])
    expect(slots).toBeNull()
  })

  it('patrulheiro5/ladino2 → nível efetivo 2 (half-caster) → slots corretos', () => {
    // patrulheiro é half (5 → floor(5/2)=2), ladino é non-caster
    const slots = calculateMulticlassSpellSlots('patrulheiro', 5, [{ class: 'ladino', level: 2 }])
    expect(slots).not.toBeNull()
    expect(slots[1]).toBe(3)
  })
})

describe('getWarlockPactSlots', () => {
  it('bruxo puro nível 1 → 1 slot de nível 1', () => {
    const r = getWarlockPactSlots(1)
    expect(r.qty).toBe(1)
    expect(r.slotLevel).toBe(1)
  })

  it('bruxo nível 5 → 2 slots de nível 3', () => {
    const r = getWarlockPactSlots(5)
    expect(r.qty).toBe(2)
    expect(r.slotLevel).toBe(3)
  })

  it('bruxo nível 11 → 3 slots de nível 5', () => {
    const r = getWarlockPactSlots(11)
    expect(r.qty).toBe(3)
    expect(r.slotLevel).toBe(5)
  })

  it('retorna null para nível 0 ou inválido', () => {
    expect(getWarlockPactSlots(0)).toBeNull()
    expect(getWarlockPactSlots(null)).toBeNull()
  })
})

describe('getSpellcastingRules — half-casters L1', () => {
  const atts = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 } // CAR +3
  it('paladino nível 1 → spellsLimit 0 (PHB p.84)', () => {
    const r = getSpellcastingRules('paladino', 1, atts, null)
    expect(r.type).toBe('prepared')
    expect(r.spellsLimit).toBe(0)
  })
  it('paladino nível 2 → spellsLimit = mod CAR + nível/2 (mín 1)', () => {
    const r = getSpellcastingRules('paladino', 2, atts, null)
    // effLevel = floor(2/2) = 1, CAR +3 → 1+3 = 4
    expect(r.spellsLimit).toBe(4)
  })
  it('patrulheiro nível 1 → spellsLimit 0 (PHB p.89)', () => {
    const r = getSpellcastingRules('patrulheiro', 1, atts, { spells_known: 0 })
    // patrulheiro é 'known' — spells_known da tabela SRD é 0 no L1
    expect(r.spellsLimit).toBe(0)
  })
})
