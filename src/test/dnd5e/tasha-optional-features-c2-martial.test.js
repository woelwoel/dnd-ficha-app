import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isAdditionChoice } from '../../systems/dnd5e/domain/optionalFeatures'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'))
const choice = (cls, id) => tasha[cls]?.choices.find(c => c.id === id)

const CASOS = [
  ['barbaro', 'barbaro_primal_knowledge',   3],
  ['barbaro', 'barbaro_instinctive_pounce', 7],
  ['ladino',  'ladino_steady_aim',          3],
  ['monge',   'monge_dedicated_weapon',     2],
  ['monge',   'monge_ki_fueled_attack',     3],
  ['monge',   'monge_quickened_healing',    4],
  ['monge',   'monge_focused_aim',          5],
]

describe('C2 marciais — adições opcionais', () => {
  for (const [cls, id, level] of CASOS) {
    it(`${cls}/${id}: optional + addsFeature, sem featureName, nível ${level}, 1 opção com desc`, () => {
      const c = choice(cls, id)
      expect(c, `${id} ausente`).toBeTruthy()
      expect(isAdditionChoice(c)).toBe(true)
      expect(c.featureName).toBeUndefined()
      expect(c.level).toBe(level)
      expect(c.options).toHaveLength(1)
      expect(c.options[0].desc.length).toBeGreaterThan(60)
      expect(c.options[0].source).toBeUndefined()
    })
  }
  it('os ids combativos carregam combat:situacional', () => {
    for (const id of ['barbaro_instinctive_pounce', 'ladino_steady_aim', 'monge_ki_fueled_attack', 'monge_quickened_healing', 'monge_focused_aim', 'monge_dedicated_weapon']) {
      const c = choice(id.split('_')[0] === 'ladino' ? 'ladino' : id.startsWith('barbaro') ? 'barbaro' : 'monge', id)
      expect(c.options[0].combat, id).toBe('situacional')
    }
  })
})
