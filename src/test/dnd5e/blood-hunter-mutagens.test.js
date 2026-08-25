import { describe, it, expect } from 'vitest'
import {
  MUTAGENS, mutationLevel, knownFormulas, activeMutagens,
  mutagenAttrDeltas, mutagenAcDelta, mutagenSpeedDelta, mutagenInitiativeDelta,
  formulasKnownAt, availableFormulas,
} from '../../systems/dnd5e/domain/mutagens'
import { BLOOD_HUNTER, ORDER_CHOICE_ID } from '../../systems/dnd5e/domain/bloodHunter'

const MUTANTE = 'mutante'
const FORMULAS_CHOICE = 'cacador_de_sangue_mutagen_formulas'

function ficha({ level = 8, order = MUTANTE, conhecidas = '', ativos = [] } = {}) {
  return {
    info: {
      level, class: BLOOD_HUNTER, multiclasses: [],
      chosenFeatures: { [ORDER_CHOICE_ID]: order, [FORMULAS_CHOICE]: conhecidas },
    },
    attributes: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
    combat: { maxHp: 60, currentHp: 60, mutagens: ativos },
  }
}

describe('catálogo de mutagênicos', () => {
  it('tem as 15 fórmulas do PDF', () => {
    expect(Object.keys(MUTAGENS)).toHaveLength(15)
  })

  it('toda fórmula tem nome, efeito e efeito colateral em texto', () => {
    for (const [chave, m] of Object.entries(MUTAGENS)) {
      expect(m.name, chave).toBeTruthy()
      expect(m.effect.length, chave).toBeGreaterThan(10)
      expect(m.sideEffect.length, chave).toBeGreaterThan(10)
    }
  })

  it('marca os pré-requisitos de nível do PDF', () => {
    expect(MUTAGENS.eter.prereq).toBe(11)
    expect(MUTAGENS.crueldade.prereq).toBe(11)
    expect(MUTAGENS.precisao.prereq).toBe(11)
    expect(MUTAGENS.reconstrucao.prereq).toBe(7)
    expect(MUTAGENS.celeridade.prereq).toBe(3)
  })
})

describe('nível de mutação', () => {
  it('é o nível de caçador de sangue dividido por 4, arredondado para cima', () => {
    expect(mutationLevel(ficha({ level: 3 }))).toBe(1)
    expect(mutationLevel(ficha({ level: 4 }))).toBe(1)
    expect(mutationLevel(ficha({ level: 5 }))).toBe(2)
    expect(mutationLevel(ficha({ level: 8 }))).toBe(2)
    expect(mutationLevel(ficha({ level: 9 }))).toBe(3)
    expect(mutationLevel(ficha({ level: 20 }))).toBe(5)
  })

  it('é zero para quem não é da Ordem do Mutante', () => {
    expect(mutationLevel(ficha({ order: 'licantropo' }))).toBe(0)
  })
})

describe('fórmulas conhecidas', () => {
  it('escala 3 no 3º, e mais uma no 7º, 11º, 15º e 18º', () => {
    expect(formulasKnownAt(2)).toBe(0)
    expect(formulasKnownAt(3)).toBe(3)
    expect(formulasKnownAt(6)).toBe(3)
    expect(formulasKnownAt(7)).toBe(4)
    expect(formulasKnownAt(11)).toBe(5)
    expect(formulasKnownAt(15)).toBe(6)
    expect(formulasKnownAt(18)).toBe(7)
  })

  it('lê as fórmulas gravadas e descarta chave desconhecida', () => {
    const char = ficha({ conhecidas: 'potencia,inexistente,sagacidade' })
    expect(knownFormulas(char)).toEqual(['potencia', 'sagacidade'])
  })

  it('só oferece fórmulas cujo pré-requisito o personagem alcançou', () => {
    const oferecidas = availableFormulas(ficha({ level: 8 })).map(m => m.key)
    expect(oferecidas).toContain('reconstrucao')
    expect(oferecidas).not.toContain('eter')
    expect(availableFormulas(ficha({ level: 11 })).map(m => m.key)).toContain('eter')
  })
})

describe('mutagênicos ativos alteram atributos', () => {
  it('Potência sobe Força e desce Destreza pelo nível de mutação', () => {
    // nível 8 → nível de mutação 2
    expect(mutagenAttrDeltas(ficha({ ativos: ['potencia'] }))).toEqual({ str: 2, dex: -2 })
  })

  it('Celeridade sobe Destreza e desce Sabedoria', () => {
    expect(mutagenAttrDeltas(ficha({ ativos: ['celeridade'] }))).toEqual({ dex: 2, wis: -2 })
  })

  it('dois mutagênicos somam, inclusive cancelando-se', () => {
    // Potência: +2 FOR / −2 DES. Celeridade: +2 DES / −2 SAB.
    expect(mutagenAttrDeltas(ficha({ ativos: ['potencia', 'celeridade'] })))
      .toEqual({ str: 2, dex: 0, wis: -2 })
  })

  it('ignora mutagênico ativo que o personagem não poderia ter', () => {
    expect(mutagenAttrDeltas(ficha({ level: 8, ativos: ['eter'] }))).toEqual({})
  })

  it('não faz nada para outra Ordem', () => {
    expect(mutagenAttrDeltas(ficha({ order: 'licantropo', ativos: ['potencia'] }))).toEqual({})
  })
})

describe('mutagênicos ativos alteram CA, deslocamento e iniciativa', () => {
  it('Sagacidade reduz a CA pelo nível de mutação', () => {
    expect(mutagenAcDelta(ficha({ ativos: ['sagacidade'] }))).toBe(-2)
  })

  it('Rapidez soma 4,5 metros e 6 a partir do 15º', () => {
    expect(mutagenSpeedDelta(ficha({ level: 8, ativos: ['rapidez'] }))).toBe(4.5)
    expect(mutagenSpeedDelta(ficha({ level: 15, ativos: ['rapidez'] }))).toBe(6)
  })

  it('Reconstrução tira 3 metros', () => {
    expect(mutagenSpeedDelta(ficha({ ativos: ['reconstrucao'] }))).toBe(-3)
  })

  it('Cautela soma e Mobilidade tira o dobro do nível de mutação na iniciativa', () => {
    expect(mutagenInitiativeDelta(ficha({ ativos: ['cautela'] }))).toBe(4)
    expect(mutagenInitiativeDelta(ficha({ ativos: ['mobilidade'] }))).toBe(-4)
    expect(mutagenInitiativeDelta(ficha({ ativos: ['cautela', 'mobilidade'] }))).toBe(0)
  })

  it('lista só os mutagênicos ativos válidos', () => {
    const char = ficha({ ativos: ['potencia', 'inexistente', 'eter'] })
    expect(activeMutagens(char).map(m => m.key)).toEqual(['potencia'])
  })
})
