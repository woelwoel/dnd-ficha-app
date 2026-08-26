import { describe, it, expect } from 'vitest'
import phb from '../../../public/srd-data/phb-class-progression-pt.json'
import tasha from '../../../public/srd-data/tasha-class-progression-pt.json'
import homebrew from '../../../public/srd-data/homebrew-class-progression-pt.json'
import { getASILevels } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers'
import { isASIEntry } from '../../systems/dnd5e/components/CharacterSheet/levelProgression/helpers'

/**
 * O wizard e o painel de subir de nível descobrem os níveis de Incremento de
 * Habilidade procurando o NOME da feature no JSON de progressão. Se o nome
 * escrito no dado não casar com o que o código procura, o jogador
 * simplesmente não consegue escolher o aumento — sem erro nenhum na tela.
 *
 * Cada fonte escreveu o nome do seu jeito ("Aumento de Atributo" no PHB,
 * "Aumento no Valor de Atributo" no Tasha), então a detecção não pode ser
 * comparação exata com uma string só.
 */
const TODAS = { ...phb, ...tasha, ...homebrew }
const PADRAO = [4, 8, 12, 16, 19]
const POR_CLASSE = {
  guerreiro: [4, 6, 8, 12, 14, 16, 19],
  ladino: [4, 8, 10, 12, 16, 19],
}

describe('níveis de Incremento de Habilidade — wizard de criação', () => {
  for (const [index, data] of Object.entries(TODAS)) {
    it(`${index} oferece o aumento nos níveis certos`, () => {
      expect(getASILevels(data, 20)).toEqual(POR_CLASSE[index] ?? PADRAO)
    })
  }
})

describe('níveis de Incremento de Habilidade — subir de nível', () => {
  for (const [index, data] of Object.entries(TODAS)) {
    it(`${index} reconhece o nível 4 como nível de aumento`, () => {
      const nivel4 = data.levels.find(l => l.level === 4)
      expect(isASIEntry(nivel4), `${index} nv 4`).toBe(true)
    })

    it(`${index} não confunde o nível 3 com nível de aumento`, () => {
      const nivel3 = data.levels.find(l => l.level === 3)
      expect(isASIEntry(nivel3), `${index} nv 3`).toBeFalsy()
    })
  }
})

/**
 * O sentido oposto do mesmo bug: a deteccao antiga casava "Melhoria", entao
 * Clerigo nv 20 e Paladino nv 18 apareciam como nivel de aumento de atributo
 * e o jogador ganhava um incremento que a regra nao da.
 */
describe('nao confunde "Melhoria" com aumento de atributo', () => {
  const casos = [['clerigo', 20], ['paladino', 18]]
  for (const [classe, nivel] of casos) {
    it(`${classe} nv ${nivel} tem Melhoria, mas nao e nivel de aumento`, () => {
      const entrada = TODAS[classe].levels.find(l => l.level === nivel)
      expect(entrada.features.some(f => /^Melhoria/.test(f.name))).toBe(true)
      expect(isASIEntry(entrada)).toBe(false)
    })
  }
})
