import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const data = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'),
)

// Mapa: classe → { choiceId, level, novasSubclasses }
const EXPECTED = {
  bardo:     { choiceId: 'bard_college',       level: 3, subs: ['criacao', 'eloquencia'] },
  guerreiro: { choiceId: 'martial_archetype',  level: 3, subs: ['guerreiro-psionico', 'cavaleiro-runico'] },
  monge:     { choiceId: 'monastic_tradition', level: 3, subs: ['misericordia', 'forma-astral'] },
  ladino:    { choiceId: 'roguish_archetype',  level: 3, subs: ['fantasma', 'alma-laminada'] },
  mago:      { choiceId: 'arcane_tradition',   level: 2, subs: ['lamina-cantante', 'ordem-dos-escribas'] },
}

describe('tasha-class-choices — subclasses sem magia (sub-projeto 2)', () => {
  for (const [cls, { choiceId, level, subs }] of Object.entries(EXPECTED)) {
    it(`${cls}: choice ${choiceId} (nv ${level}) com as 2 subclasses de Tasha`, () => {
      expect(data[cls]).toBeTruthy()
      const choice = data[cls].choices.find(c => c.id === choiceId)
      expect(choice).toBeTruthy()
      expect(choice.level).toBe(level)
      for (const s of subs) {
        const opt = choice.options.find(o => o.value === s)
        expect(opt, `${cls}/${s} ausente`).toBeTruthy()
        expect(opt.desc.length).toBeGreaterThan(40)
      }
    })
  }

  it('Cavaleiro Rúnico: subescolha de runas gated, escalonada, com 6 runas', () => {
    const runes = data.guerreiro.choices.find(c => c.id === 'guerreiro_rune_knight_runes')
    expect(runes).toBeTruthy()
    expect(runes.requires).toEqual({ martial_archetype: 'cavaleiro-runico' })
    expect(runes.multiSelectByLevel).toEqual({ 3: 2, 7: 3, 10: 4, 15: 5 })
    expect(runes.options.map(o => o.value).sort()).toEqual(
      ['colina', 'fogo', 'gelo', 'nuvem', 'pedra', 'tempestade'],
    )
  })

  it('nenhuma opção das novas classes carrega source no arquivo cru', () => {
    for (const cls of Object.keys(EXPECTED)) {
      for (const choice of data[cls].choices) {
        for (const opt of choice.options ?? []) {
          expect(opt.source, `${cls}/${opt.value}`).toBeUndefined()
        }
      }
    }
  })
})
