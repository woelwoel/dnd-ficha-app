import { describe, it, expect } from 'vitest'
import {
  BLOOD_HUNTER, LYCAN, ORDER_CHOICE_ID,
  bloodHunterOrder, isHybridForm, lycanAcBonus, lycanMeleeDamageBonus, lycanUnarmedDie,
} from '../../systems/dnd5e/domain/bloodHunter'

function ficha({ level = 3, order = LYCAN, hybrid = false } = {}) {
  return {
    info: { level, class: BLOOD_HUNTER, multiclasses: [], chosenFeatures: { [ORDER_CHOICE_ID]: order } },
    attributes: { str: 16, dex: 14, con: 14, int: 10, wis: 14, cha: 10 },
    combat: { maxHp: 30, currentHp: 30, hybridForm: hybrid },
  }
}

const couro = { category: 'light' }
const brunea = { category: 'medium' }
const placas = { category: 'heavy' }

describe('bloodHunter — Ordem escolhida', () => {
  it('lê a Ordem dos chosenFeatures', () => {
    expect(bloodHunterOrder(ficha({ order: 'cacador-de-espectros' }))).toBe('cacador-de-espectros')
  })

  it('devolve null para quem não é caçador de sangue', () => {
    expect(bloodHunterOrder({ info: { level: 5, class: 'mago' } })).toBeNull()
  })
})

describe('forma híbrida — quando está ativa', () => {
  it('só conta com a Ordem do Licantropo', () => {
    expect(isHybridForm(ficha({ hybrid: true }))).toBe(true)
    expect(isHybridForm(ficha({ hybrid: true, order: 'cacador-de-espectros' }))).toBe(false)
  })

  it('é falsa quando o jogador não transformou', () => {
    expect(isHybridForm(ficha({ hybrid: false }))).toBe(false)
  })

  it('exige o 3º nível, que é quando a Ordem chega', () => {
    expect(isHybridForm(ficha({ level: 2, hybrid: true }))).toBe(false)
  })
})

describe('Pele Resistente — +1 de CA', () => {
  it('dá +1 sem armadura e com armadura leve ou média', () => {
    const char = ficha({ hybrid: true })
    expect(lycanAcBonus(char, null)).toBe(1)
    expect(lycanAcBonus(char, couro)).toBe(1)
    expect(lycanAcBonus(char, brunea)).toBe(1)
  })

  it('não dá nada com armadura pesada', () => {
    expect(lycanAcBonus(ficha({ hybrid: true }), placas)).toBe(0)
  })

  it('não dá nada fora da forma híbrida', () => {
    expect(lycanAcBonus(ficha({ hybrid: false }), couro)).toBe(0)
  })
})

describe('Poder Selvagem — dano corpo a corpo', () => {
  it('soma metade do bônus de proficiência, arredondado para baixo', () => {
    // nível 3 → proficiência +2 → metade = 1
    expect(lycanMeleeDamageBonus(ficha({ level: 3, hybrid: true }))).toBe(1)
    // nível 9 → proficiência +4 → metade = 2
    expect(lycanMeleeDamageBonus(ficha({ level: 9, hybrid: true }))).toBe(2)
    // nível 17 → proficiência +6 → metade = 3
    expect(lycanMeleeDamageBonus(ficha({ level: 17, hybrid: true }))).toBe(3)
  })

  it('é zero fora da forma híbrida', () => {
    expect(lycanMeleeDamageBonus(ficha({ level: 17, hybrid: false }))).toBe(0)
  })
})

describe('Ataque do Predador — dado do golpe desarmado', () => {
  it('escala 1d6, 1d8 no 11º e 1d10 no 18º', () => {
    expect(lycanUnarmedDie(ficha({ level: 3, hybrid: true }))).toBe('1d6')
    expect(lycanUnarmedDie(ficha({ level: 10, hybrid: true }))).toBe('1d6')
    expect(lycanUnarmedDie(ficha({ level: 11, hybrid: true }))).toBe('1d8')
    expect(lycanUnarmedDie(ficha({ level: 17, hybrid: true }))).toBe('1d8')
    expect(lycanUnarmedDie(ficha({ level: 18, hybrid: true }))).toBe('1d10')
  })

  it('é null fora da forma híbrida', () => {
    expect(lycanUnarmedDie(ficha({ level: 18, hybrid: false }))).toBeNull()
  })
})
