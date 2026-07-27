import { describe, it, expect } from 'vitest'
import {
  emptyEncounterState, addPc, addNpc, startEncounter, rollInitiative,
  applyNpcDamage, applyNpcHealing, setNpcTempHp, toggleNpcCondition,
  removeCombatant, markOrphans, totalXp,
} from '../systems/dnd5e/domain/encounter'

const GOBLIN = { index: 'goblin', name: 'Goblin', hit_points: 7, hit_points_roll: '2d6', dexterity: 14, xp: 50, armor_class: [{ value: 15 }] }
const OGRE   = { index: 'ogre',   name: 'Ogro',   hit_points: 59, hit_points_roll: '7d10', dexterity: 8, xp: 450, armor_class: [{ value: 11 }] }

const one = () => addNpc(emptyEncounterState(), GOBLIN)
const npc = (s) => s.combatants[0]

describe('HP de monstro', () => {
  it('desconta dano e marca defeated ao chegar a 0', () => {
    let s = applyNpcDamage(one(), 'k1', 3)
    expect(npc(s)).toMatchObject({ currentHp: 4, defeated: false })
    s = applyNpcDamage(s, 'k1', 99)
    expect(npc(s)).toMatchObject({ currentHp: 0, defeated: true })
  })

  it('HP temporário absorve primeiro (PHB p.198)', () => {
    let s = setNpcTempHp(one(), 'k1', 5)
    s = applyNpcDamage(s, 'k1', 3)
    expect(npc(s)).toMatchObject({ tempHp: 2, currentHp: 7 })
    s = applyNpcDamage(s, 'k1', 4)
    expect(npc(s)).toMatchObject({ tempHp: 0, currentHp: 5 })
  })

  it('HP temporário não empilha: fica o maior (PHB p.198)', () => {
    let s = setNpcTempHp(one(), 'k1', 5)
    s = setNpcTempHp(s, 'k1', 3)
    expect(npc(s).tempHp).toBe(5)
  })

  it('cura respeita o teto e desfaz defeated', () => {
    let s = applyNpcDamage(one(), 'k1', 99)
    s = applyNpcHealing(s, 'k1', 3)
    expect(npc(s)).toMatchObject({ currentHp: 3, defeated: false })
    s = applyNpcHealing(s, 'k1', 999)
    expect(npc(s).currentHp).toBe(7)
  })

  it('ignora valores negativos e lixo', () => {
    expect(npc(applyNpcDamage(one(), 'k1', -5)).currentHp).toBe(7)
    expect(npc(applyNpcHealing(one(), 'k1', 'abc')).currentHp).toBe(7)
  })

  it('não toca em combatente PJ (HP dele vive na ficha)', () => {
    const s = addPc(emptyEncounterState(), { characterId: 'a', name: 'Ana' })
    expect(applyNpcDamage(s, 'k1', 5).combatants[0].currentHp).toBeUndefined()
  })
})

describe('condições de monstro', () => {
  it('liga e desliga', () => {
    let s = toggleNpcCondition(one(), 'k1', 'prone')
    expect(npc(s).conditions).toEqual(['prone'])
    s = toggleNpcCondition(s, 'k1', 'poisoned')
    expect(npc(s).conditions).toEqual(['prone', 'poisoned'])
    s = toggleNpcCondition(s, 'k1', 'prone')
    expect(npc(s).conditions).toEqual(['poisoned'])
  })
})

describe('removeCombatant', () => {
  it('passa o turno pro seguinte quando remove o ativo', () => {
    let s = addNpc(addNpc(one(), OGRE), GOBLIN)
    s = startEncounter(rollInitiative(s, () => 0.5).state)
    const activeAntes = s.activeId
    s = removeCombatant(s, activeAntes)
    expect(s.combatants.some(c => c.id === activeAntes)).toBe(false)
    expect(s.activeId).not.toBe(activeAntes)
    expect(s.combatants.some(c => c.id === s.activeId)).toBe(true)
  })

  it('remover o último ativo deixa activeId null', () => {
    let s = startEncounter(rollInitiative(one(), () => 0.5).state)
    s = removeCombatant(s, 'k1')
    expect(s).toMatchObject({ combatants: [], activeId: null })
  })

  it('id inexistente devolve o mesmo state', () => {
    const s = one()
    expect(removeCombatant(s, 'nope')).toBe(s)
  })
})

describe('markOrphans', () => {
  it('marca PJ cuja ficha saiu da mesa e desmarca quando volta', () => {
    let s = addPc(addPc(emptyEncounterState(), { characterId: 'a', name: 'Ana' }), { characterId: 'b', name: 'Bruno' })
    s = markOrphans(s, ['a'])
    expect(s.combatants.map(c => c.orphaned)).toEqual([false, true])
    s = markOrphans(s, ['a', 'b'])
    expect(s.combatants.map(c => c.orphaned)).toEqual([false, false])
  })
})

describe('totalXp', () => {
  it('soma só os monstros', () => {
    let s = addPc(emptyEncounterState(), { characterId: 'a', name: 'Ana' })
    s = addNpc(addNpc(s, GOBLIN), OGRE)
    expect(totalXp(s)).toBe(500)
  })
})
