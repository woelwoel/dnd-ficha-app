import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCharacterCalculations } from '../../systems/dnd5e/hooks/useCharacterCalculations'
import {
  PROFANE_SOUL, PATRON_CHOICE_ID, PATRONS,
  profaneSoulPactSlots, profaneSoulCantrips, profaneSoulSpellsKnown,
  profaneSoulSaveDC, profaneSoulAttackBonus, profaneSoulPatron,
} from '../../systems/dnd5e/domain/profaneSoul'
import { BLOOD_HUNTER, ORDER_CHOICE_ID } from '../../systems/dnd5e/domain/bloodHunter'
import choices from '../../../public/srd-data/homebrew-class-choices-pt.json'
import { parseSubclassFeatures } from '../../systems/dnd5e/domain/subclassFeatures'

function ficha({ level = 3, order = PROFANE_SOUL, patron = 'corruptor', wis = 16 } = {}) {
  return {
    info: {
      level, class: BLOOD_HUNTER, multiclasses: [],
      chosenFeatures: { [ORDER_CHOICE_ID]: order, [PATRON_CHOICE_ID]: patron },
    },
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis, cha: 10 },
    combat: { maxHp: 30, currentHp: 30 },
  }
}

describe('Alma Profana — patronos', () => {
  it('tem os seis patronos do PDF', () => {
    expect(Object.keys(PATRONS).sort()).toEqual(
      ['arquifada', 'celestial', 'corruptor', 'grande-antigo', 'hexblade', 'imortal']
    )
  })

  it('cada patrono traz o reforço do rito e as duas arcanas', () => {
    for (const [chave, p] of Object.entries(PATRONS)) {
      expect(p.name, chave).toBeTruthy()
      expect(p.riteFocus.length, chave).toBeGreaterThan(20)
      expect(p.arcana7, chave).toBeTruthy()
      expect(p.arcana15, chave).toBeTruthy()
    }
  })

  it('lê o patrono escolhido', () => {
    expect(profaneSoulPatron(ficha({ patron: 'hexblade' }))).toBe('hexblade')
    expect(profaneSoulPatron(ficha({ order: 'licantropo' }))).toBeNull()
  })
})

describe('Alma Profana — tabela de Magia de Pacto', () => {
  const slots = level => profaneSoulPactSlots(ficha({ level }))

  it('não conjura antes do 3º nível', () => {
    expect(slots(2)).toBeNull()
  })

  it('segue a tabela A Alma Profana', () => {
    expect(slots(3)).toEqual({ qty: 1, slotLevel: 1 })
    expect(slots(4)).toEqual({ qty: 1, slotLevel: 1 })
    expect(slots(5)).toEqual({ qty: 2, slotLevel: 1 })
    expect(slots(7)).toEqual({ qty: 2, slotLevel: 2 })
    expect(slots(11)).toEqual({ qty: 2, slotLevel: 3 })
    expect(slots(14)).toEqual({ qty: 3, slotLevel: 3 })
    expect(slots(17)).toEqual({ qty: 3, slotLevel: 4 })
    expect(slots(20)).toEqual({ qty: 3, slotLevel: 4 })
  })

  it('não dá espaço nenhum para outra Ordem', () => {
    expect(profaneSoulPactSlots(ficha({ level: 11, order: 'mutante' }))).toBeNull()
  })

  it('conhece 2 truques, e 3 a partir do 10º', () => {
    expect(profaneSoulCantrips(ficha({ level: 3 }))).toBe(2)
    expect(profaneSoulCantrips(ficha({ level: 9 }))).toBe(2)
    expect(profaneSoulCantrips(ficha({ level: 10 }))).toBe(3)
    expect(profaneSoulCantrips(ficha({ level: 2 }))).toBe(0)
  })

  it('escala as magias conhecidas até 11 no 20º', () => {
    expect(profaneSoulSpellsKnown(ficha({ level: 3 }))).toBe(2)
    expect(profaneSoulSpellsKnown(ficha({ level: 5 }))).toBe(3)
    expect(profaneSoulSpellsKnown(ficha({ level: 11 }))).toBe(6)
    expect(profaneSoulSpellsKnown(ficha({ level: 20 }))).toBe(11)
  })
})

describe('Alma Profana — conjura por Sabedoria', () => {
  it('CD é 8 + proficiência + modificador de Sabedoria', () => {
    // nível 5 → proficiência +3; SAB 16 → +3. 8 + 3 + 3 = 14
    expect(profaneSoulSaveDC(ficha({ level: 5, wis: 16 }))).toBe(14)
    // nível 17 → proficiência +6; SAB 20 → +5. 8 + 6 + 5 = 19
    expect(profaneSoulSaveDC(ficha({ level: 17, wis: 20 }))).toBe(19)
  })

  it('ataque de magia é proficiência + modificador de Sabedoria', () => {
    expect(profaneSoulAttackBonus(ficha({ level: 5, wis: 16 }))).toBe(6)
  })

  it('é null para quem não é da Ordem', () => {
    expect(profaneSoulSaveDC(ficha({ order: 'licantropo' }))).toBeNull()
    expect(profaneSoulAttackBonus(ficha({ order: 'licantropo' }))).toBeNull()
  })
})

describe('Alma Profana na ficha — espacos de pacto', () => {
  function fichaCompleta({ level = 11, order = PROFANE_SOUL } = {}) {
    return {
      info: {
        name: 'T', class: BLOOD_HUNTER, level, race: 'humano', multiclasses: [],
        chosenFeatures: { [ORDER_CHOICE_ID]: order, [PATRON_CHOICE_ID]: 'corruptor' },
      },
      attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 16, cha: 10 },
      combat: {
        maxHp: 80, currentHp: 80, tempHp: 0, armorClass: 16, speed: 9, activeEffects: [],
        crimsonRites: [], mutagens: [], hybridForm: false,
        concentrating: { spellIndex: null, spellName: null }, deathSaves: { successes: 0, failures: 0 },
      },
      proficiencies: { savingThrows: ['str', 'wis'], skills: [], expertiseSkills: [], armor: [] },
      spellcasting: { ability: 'Sabedoria', usedSlots: {}, pactSlotsUsed: 0, spells: [] },
      inventory: { currency: {}, items: [] },
      traits: {},
    }
  }
  const calc = char => renderHook(() => useCharacterCalculations(char)).result.current

  it('a ficha recebe os espacos de pacto da tabela da Ordem', () => {
    expect(calc(fichaCompleta({ level: 11 })).pactSlots).toEqual({ qty: 2, slotLevel: 3 })
  })

  it('no 20o sao 3 espacos de 4o -- a tabela do Bruxo daria 4 de 5o', () => {
    expect(calc(fichaCompleta({ level: 20 })).pactSlots).toEqual({ qty: 3, slotLevel: 4 })
  })

  it('outra Ordem nao ganha espaco de pacto', () => {
    expect(calc(fichaCompleta({ order: 'licantropo' })).pactSlots).toBeNull()
  })
})

describe('catalogo da Alma Profana', () => {
  const escolhas = choices[BLOOD_HUNTER].choices
  const patronos = escolhas.find(c => c.id === PATRON_CHOICE_ID)

  it('a escolha de patrono so aparece pra Ordem da Alma Profana', () => {
    expect(patronos.requires).toEqual({ [ORDER_CHOICE_ID]: PROFANE_SOUL })
    expect(patronos.level).toBe(3)
  })

  /** Chave divergente entre JSON e dominio = patrono que nao faz nada. */
  it('as opcoes do picker sao exatamente as chaves do dominio', () => {
    expect(patronos.options.map(o => o.value).sort()).toEqual(Object.keys(PATRONS).sort())
  })

  it('cada patrono mostra o foco ritual e as duas arcanas', () => {
    for (const o of patronos.options) {
      expect(o.desc, o.value).toMatch(/Foco Ritual:/)
      expect(o.desc, o.value).toMatch(/Arcana M[íi]stica \(7/)
      expect(o.desc, o.value).toMatch(/Arcana Revelada \(15/)
    }
  })

  it('a Ordem concede as features nos niveis do PDF', () => {
    const alma = escolhas.find(c => c.id === ORDER_CHOICE_ID).options
      .find(o => o.value === PROFANE_SOUL)
    const { features } = parseSubclassFeatures(alma.desc)
    expect(features.map(f => [f.level, f.name])).toEqual([
      [3, 'Patrono do Outro Mundo'],
      [3, 'Magia de Pacto'],
      [3, 'Foco Ritual'],
      [7, 'Frenesi Místico'],
      [7, 'Arcana Mística'],
      [11, 'Canalização Diabólica'],
      [15, 'Arcana Revelada'],
      [18, 'Sifão de Almas'],
    ])
  })

  it('nenhuma Ordem continua marcada como nao implementada', () => {
    const ordens = escolhas.find(c => c.id === ORDER_CHOICE_ID)
    for (const o of ordens.options) {
      expect(o.desc, o.value).not.toMatch(/ainda n[ãa]o foram implementadas/)
    }
  })
})
