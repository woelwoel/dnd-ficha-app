import { describe, it, expect } from 'vitest'
import choices from '../../../public/srd-data/homebrew-class-choices-pt.json'
import {
  SUBCLASS_CHOICE_IDS, getSubclassFeatureCards, parseSubclassFeatures, detectFeatureUses,
} from '../../systems/dnd5e/domain/subclassFeatures'
import { BLOOD_HUNTER } from '../../systems/dnd5e/domain/bloodHunter'
import { defaultClassFeatureUses } from '../../systems/dnd5e/domain/rules'

const ORDER_CHOICE = 'cacador_de_sangue_order'
const ordens = choices[BLOOD_HUNTER].choices.find(c => c.id === ORDER_CHOICE)
const opcao = value => ordens.options.find(o => o.value === value)

function cards(order, level) {
  return getSubclassFeatureCards({
    classIndex: BLOOD_HUNTER,
    chosenFeatures: { [ORDER_CHOICE]: order },
    classChoices: choices,
    level,
    classLabel: BLOOD_HUNTER,
  })
}

describe('Ordens do Caçador de Sangue', () => {
  /**
   * `SUBCLASS_CHOICE_IDS` é uma lista FECHADA. Sem o id aqui, o parser ignora
   * a escolha em silêncio: nenhum card por nível e nenhum tracker — a Ordem
   * existiria no picker e não faria absolutamente nada na ficha.
   */
  it('a escolha de Ordem é reconhecida como escolha de subclasse', () => {
    expect(SUBCLASS_CHOICE_IDS.has(ORDER_CHOICE)).toBe(true)
  })

  it('as quatro Ordens continuam na lista', () => {
    expect(ordens.options.map(o => o.value).sort()).toEqual(
      ['alma-profana', 'cacador-de-espectros', 'licantropo', 'mutante']
    )
  })
})

describe('Ordem do Caçador de Espectros', () => {
  it('concede as features nos níveis do PDF', () => {
    const { features } = parseSubclassFeatures(opcao('cacador-de-espectros').desc)
    expect(features.map(f => [f.level, f.name])).toEqual([
      [3, 'Ritual da Alvorada'],
      [7, 'Veias Sagradas'],
      [11, 'Elevação Impulsiva'],
      [15, 'Visão da Sepultura'],
      [18, 'Espírito Vingativo'],
    ])
  })

  it('só entrega os cards até o nível do personagem', () => {
    expect(cards('cacador-de-espectros', 7).map(c => c.name))
      .toEqual(['Ritual da Alvorada', 'Veias Sagradas'])
    expect(cards('cacador-de-espectros', 20)).toHaveLength(5)
  })

  /**
   * Elevação Impulsiva usa "modificador de Sabedoria" vezes por descanso.
   * O detector tem uma regra que dispara antes, para "uma vez … descanso", e
   * devolveria 1 uso — por isso a redação evita a expressão "uma vez".
   */
  it('Elevação Impulsiva vira tracker de SAB usos por descanso curto', () => {
    const { features } = parseSubclassFeatures(opcao('cacador-de-espectros').desc)
    const f = features.find(x => x.name === 'Elevação Impulsiva')
    const uses = detectFeatureUses(f.desc, { attributes: { wis: 18 }, profBonus: 4 })
    expect(uses).toEqual({ max: 4, recharge: 'short' })
  })
})

describe('Ordem do Licantropo', () => {
  it('concede as features nos níveis do PDF', () => {
    const { features } = parseSubclassFeatures(opcao('licantropo').desc)
    expect(features.map(f => [f.level, f.name])).toEqual([
      [3, 'Sentidos Aguçados'],
      [3, 'Transformação Híbrida'],
      [7, 'Proeza do Perseguidor'],
      [11, 'Transformação Avançada'],
      [15, 'Vontade de Ferro'],
      [18, 'Mestria da Transformação Híbrida'],
    ])
  })

  it('dá ids únicos aos dois cards de nível 3', () => {
    const ids = cards('licantropo', 3).map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('descreve as sub-características que a forma híbrida concede', () => {
    const { features } = parseSubclassFeatures(opcao('licantropo').desc)
    const hibrida = features.find(f => f.name === 'Transformação Híbrida')
    for (const sub of ['Poder Selvagem', 'Pele Resistente', 'Ataque do Predador', 'Desejo de Sangue']) {
      expect(hibrida.desc, sub).toContain(sub)
    }
  })
})

describe('trackers das Ordens', () => {
  function usos(order, level) {
    const char = {
      info: { level, class: BLOOD_HUNTER, multiclasses: [], chosenFeatures: { [ORDER_CHOICE]: order } },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 18, cha: 10 },
      combat: {},
    }
    return defaultClassFeatureUses(char, choices)
  }
  const acha = (lista, id) => lista.find(u => u.id === id)

  /**
   * O detector de usos so entende "uma vez", "bonus de proficiencia" e
   * "modificador de X". "duas vezes" nao casa com nenhum padrao, entao este
   * tracker precisa ser explicito -- e no 18o ele sobe para tres.
   */
  it('Transformação Híbrida: 2 usos por descanso, 3 a partir do 18º', () => {
    expect(acha(usos('licantropo', 3), 'cacador-de-sangue-hybrid-transformation'))
      .toMatchObject({ max: 2, recharge: 'short', name: 'Transformação Híbrida' })
    expect(acha(usos('licantropo', 17), 'cacador-de-sangue-hybrid-transformation').max).toBe(2)
    expect(acha(usos('licantropo', 18), 'cacador-de-sangue-hybrid-transformation').max).toBe(3)
  })

  it('não emite o tracker de forma híbrida para a outra Ordem', () => {
    expect(acha(usos('cacador-de-espectros', 18), 'cacador-de-sangue-hybrid-transformation'))
      .toBeUndefined()
  })

  it('Elevação Impulsiva vira tracker automático pelo texto', () => {
    const u = usos('cacador-de-espectros', 11).find(x => x.name === 'Elevação Impulsiva')
    expect(u).toMatchObject({ max: 4, recharge: 'short' })
  })

  /** Frase de dano mal escrita vira tracker fantasma; estas features não têm usos. */
  it('não inventa tracker para features sem usos', () => {
    const nomes = usos('cacador-de-espectros', 20).map(u => u.name)
    for (const semUsos of ['Ritual da Alvorada', 'Veias Sagradas', 'Visão da Sepultura', 'Espírito Vingativo']) {
      expect(nomes, semUsos).not.toContain(semUsos)
    }
  })
})
