import { describe, it, expect } from 'vitest'
import {
  emptyEncounterState, npcStatsFromMonster, addPc, addNpc,
} from '../systems/dnd5e/domain/encounter'

const GOBLIN = {
  index: 'goblin', name: 'Goblin', hit_points: 7, hit_points_roll: '2d6',
  dexterity: 14, xp: 50,
  armor_class: [{ type: 'armor', value: 15 }],
}

describe('npcStatsFromMonster', () => {
  it('lê CA do primeiro item de armor_class e HP médio do statblock', () => {
    expect(npcStatsFromMonster(GOBLIN)).toEqual({ ac: 15, maxHp: 7, initiativeBonus: 2, xp: 50 })
  })

  it('rola hit_points_roll quando rollHp=true', () => {
    // rng fixo em 0.99 → cada d6 sai 6 → 2d6 = 12
    const stats = npcStatsFromMonster(GOBLIN, { rollHp: true, rng: () => 0.99 })
    expect(stats.maxHp).toBe(12)
  })

  it('cai em defaults seguros com statblock incompleto', () => {
    expect(npcStatsFromMonster({ index: 'x', name: 'X' })).toEqual({ ac: 10, maxHp: 1, initiativeBonus: 0, xp: 0 })
  })
})

describe('addPc / addNpc', () => {
  it('adiciona PJ referenciando a ficha, sem HP próprio', () => {
    const s = addPc(emptyEncounterState(), { characterId: 'uuid-1', name: 'Thalior', initiativeBonus: 3 })
    expect(s.combatants).toHaveLength(1)
    expect(s.combatants[0]).toMatchObject({
      id: 'k1', kind: 'pc', characterId: 'uuid-1', name: 'Thalior',
      initiative: null, initiativeBonus: 3, orphaned: false,
    })
    expect(s.combatants[0].currentHp).toBeUndefined()
  })

  it('numera monstros repetidos e dá ids únicos', () => {
    let s = addNpc(emptyEncounterState(), GOBLIN)
    s = addNpc(s, GOBLIN)
    s = addNpc(s, GOBLIN)
    expect(s.combatants.map(c => c.name)).toEqual(['Goblin', 'Goblin 2', 'Goblin 3'])
    expect(s.combatants.map(c => c.id)).toEqual(['k1', 'k2', 'k3'])
    expect(s.combatants[0]).toMatchObject({ kind: 'npc', monsterIndex: 'goblin', currentHp: 7, maxHp: 7, tempHp: 0, conditions: [], defeated: false })
  })

  it('não reusa ordinal de monstro removido da lista', () => {
    let s = addNpc(addNpc(emptyEncounterState(), GOBLIN), GOBLIN) // Goblin, Goblin 2
    s = { ...s, combatants: s.combatants.filter(c => c.id !== 'k1') } // sobra Goblin 2
    s = addNpc(s, GOBLIN)
    expect(s.combatants.map(c => c.name)).toEqual(['Goblin 2', 'Goblin 3'])
  })
})
