import { describe, it, expect } from 'vitest'
import { calculateMulticlassSpellSlots, getSpellSlots, getWarlockPactSlots, getSpellcastingRules } from '../systems/dnd5e/utils/spellcasting'

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

  it('patrulheiro5/ladino2 → conjurador ÚNICO → tabela publicada do Patrulheiro', () => {
    // Ladino (sem subclasse arcana) não é conjurador, então só o Patrulheiro
    // conta → conjurador único → ceil(5/2)=3 → linha 3 = 4×1° + 2×2°.
    // (A regra floor(level/2) só vale quando há 2+ classes conjuradoras.)
    const slots = calculateMulticlassSpellSlots('patrulheiro', 5, [{ class: 'ladino', level: 2 }])
    expect(slots).not.toBeNull()
    expect(slots[1]).toBe(4)
    expect(slots[2]).toBe(2)
  })
})

describe('getSpellSlots — third casters (subclasse)', () => {
  const ek = { martial_archetype: 'cavaleiro_mistico' }
  const at = { roguish_archetype: 'trapaceiro_arcano' }

  it('Guerreiro 3 Cavaleiro Místico → 2 slots de nível 1 (PHB p.75)', () => {
    const slots = getSpellSlots('guerreiro', 3, [], ek)
    expect(slots).toEqual({ 1: 2 })
  })

  it('Guerreiro 7 Cavaleiro Místico → ceil(7/3)=3 → 4×1° + 2×2°', () => {
    const slots = getSpellSlots('guerreiro', 7, [], ek)
    expect(slots[1]).toBe(4)
    expect(slots[2]).toBe(2)
  })

  it('Guerreiro 2 Cavaleiro Místico (antes do nível 3) → sem slots', () => {
    expect(getSpellSlots('guerreiro', 2, [], ek)).toBeNull()
  })

  it('Guerreiro 3 SEM subclasse arcana → sem slots', () => {
    expect(getSpellSlots('guerreiro', 3, [])).toBeNull()
  })

  it('Ladino 13 Trapaceiro Arcano → ceil(13/3)=5 → até 3° círculo', () => {
    const slots = getSpellSlots('ladino', 13, [], at)
    expect(slots[1]).toBe(4)
    expect(slots[2]).toBe(3)
    expect(slots[3]).toBe(2)
  })

  it('Cavaleiro Místico 6 / Mago 3 → multiclasse: floor(6/3)+3 = 5', () => {
    // 2 conjuradores → regra floor por classe (PHB p.164): EK floor(6/3)=2 + mago 3 = 5.
    const slots = getSpellSlots('guerreiro', 6, [{ class: 'mago', level: 3, chosenFeatures: {} }], ek)
    expect(slots[1]).toBe(4)
    expect(slots[2]).toBe(3)
    expect(slots[3]).toBe(2)
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
