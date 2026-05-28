import { describe, it, expect } from 'vitest'
import progression from '../../public/srd-data/phb-class-progression-pt.json'

/**
 * Travas estruturais sobre `phb-class-progression-pt.json` — o arquivo que
 * a UI lê pra renderizar progressão da ficha. Pega regressões tipo
 * "Paladino nv 7 ↔ 10 trocados" (PHB p.85).
 *
 * Os nomes batem com o que está no JSON (não necessariamente a PHB literal).
 */

const EXPECTED = {
  paladino: {
    1:  ['Sentido Divino', 'Cura pelas Mãos'],
    2:  ['Estilo de Combate', 'Conjuração de Paladino', 'Golpe Divino'],
    3:  ['Saúde Divina', 'Juramento Sagrado'],
    5:  ['Ataque Extra'],
    6:  ['Aura de Proteção'],
    7:  ['Característica do Juramento Sagrado'],   // ⚠ era "Aura de Coragem"
    10: ['Aura de Coragem'],                       // ⚠ era "Característica do Juramento Sagrado"
    11: ['Golpe Divino Aprimorado'],
    14: ['Toque Purificador'],
    20: ['Característica do Juramento Sagrado'],
  },
  barbaro: {
    1:  ['Fúria', 'Defesa Desarmada'],
    5:  ['Ataque Extra', 'Movimentação Veloz'],
    9:  ['Crítico Brutal (1 dado)'],
    20: ['Campeão Primitivo'],
  },
  patrulheiro: {
    1:  ['Inimigo Favorito', 'Explorador Natural'],
    5:  ['Ataque Extra'],
    20: ['Matador de Inimigos'],
  },
  bruxo: {
    1:  ['Patrono Sobrenatural', 'Magia de Pacto'],
    3:  ['Dádiva de Pacto'],
  },
  bardo: {
    1:  ['Conjuração de Bardo', 'Inspiração Bárdica (d6)'],
    5:  ['Inspiração Bárdica (d8)', 'Fonte de Inspiração'],
  },
}

describe('phb-class-progression-pt.json — features esperadas por nível', () => {
  for (const [classIndex, levels] of Object.entries(EXPECTED)) {
    for (const [levelStr, expectedFeatures] of Object.entries(levels)) {
      const level = Number(levelStr)
      it(`${classIndex} nv ${level} contém: ${expectedFeatures.join(', ')}`, () => {
        const cls = progression[classIndex]
        expect(cls, `classe ${classIndex} ausente do JSON`).toBeDefined()
        const entry = cls.levels.find(x => x.level === level)
        expect(entry, `${classIndex} nv ${level} ausente`).toBeDefined()
        const names = (entry.features ?? []).map(f => f.name)
        for (const expected of expectedFeatures) {
          expect(names, `nv ${level} esperava "${expected}", veio ${JSON.stringify(names)}`)
            .toContain(expected)
        }
      })
    }
  }
})
