import { describe, it, expect } from 'vitest'
import {
  emptyEncounterState, addPc, addNpc, startEncounter, nextTurn, previousTurn,
  restoreCombatant, rollInitiativeFor, setConditionDuration, toggleNpcCondition,
} from '../systems/dnd5e/domain/encounter'

const GOBLIN = {
  index: 'goblin', name: 'Goblin', hit_points: 7, xp: 50,
  armor_class: [{ value: 15 }], dexterity: 14,
}
const ORC = {
  index: 'orc', name: 'Orc', hit_points: 15, xp: 100,
  armor_class: [{ value: 13 }], dexterity: 12,
}

/** Mesa iniciada: 1 PJ + 2 monstros, iniciativas fixas e previsíveis. */
function mesa() {
  let s = emptyEncounterState()
  s = addPc(s, { characterId: 'pj', name: 'Ana', initiativeBonus: 3 })
  s = addNpc(s, GOBLIN)
  s = addNpc(s, ORC)
  s = {
    ...s,
    combatants: s.combatants.map((c, i) => ({ ...c, initiative: 20 - i * 5 })),
  }
  return startEncounter(s)
}

describe('restoreCombatant', () => {
  it('devolve só o combatente alvo ao estado do snapshot', () => {
    const s = mesa()
    const goblin = s.combatants.find(c => c.name === 'Goblin')
    const ferido = {
      ...s,
      combatants: s.combatants.map(c =>
        c.id === goblin.id ? { ...c, currentHp: 1, tempHp: 0, defeated: false } : c),
    }

    const voltou = restoreCombatant(ferido, goblin)

    expect(voltou.combatants.find(c => c.id === goblin.id)).toEqual(goblin)
  })

  it('não toca nos outros combatentes nem na rodada nem no turno ativo', () => {
    const s = mesa()
    const goblin = s.combatants.find(c => c.name === 'Goblin')
    // O outro monstro mudou DEPOIS do snapshot — desfazer o goblin não pode
    // atropelar essa mudança, que é o que um restore de state inteiro faria.
    const depois = nextTurn({
      ...s,
      combatants: s.combatants.map(c =>
        c.name === 'Orc' ? { ...c, currentHp: 2 } : { ...c, currentHp: 1 }),
    })

    const voltou = restoreCombatant(depois, goblin)

    expect(voltou.combatants.find(c => c.name === 'Orc').currentHp).toBe(2)
    expect(voltou.round).toBe(depois.round)
    expect(voltou.activeId).toBe(depois.activeId)
  })

  it('ignora snapshot de combatente que já saiu da lista', () => {
    const s = mesa()
    const fantasma = { ...s.combatants[1], id: 'k999' }

    expect(restoreCombatant(s, fantasma)).toEqual(s)
  })
})

describe('rollInitiativeFor', () => {
  it('rola só para o id pedido e preserva a iniciativa dos outros', () => {
    let s = mesa()
    s = addNpc(s, GOBLIN)
    const novo = s.combatants[s.combatants.length - 1]
    expect(novo.initiative).toBeNull()
    const antes = s.combatants.filter(c => c.id !== novo.id)
      .map(c => [c.id, c.initiative])

    // rng fixo em 0,5 → d20 = 11; goblin tem bônus +2 → 13
    const depois = rollInitiativeFor(s, novo.id, () => 0.5)

    expect(depois.combatants.find(c => c.id === novo.id).initiative).toBe(13)
    expect(depois.combatants.filter(c => c.id !== novo.id).map(c => [c.id, c.initiative]))
      .toEqual(antes)
  })

  it('reordena a lista mantendo quem está no turno', () => {
    let s = mesa()
    const ativoAntes = s.activeId
    s = addNpc(s, ORC)
    const novo = s.combatants[s.combatants.length - 1]

    // rng 0,95 → d20 = 20; orc tem bônus +1 → 21, o primeiro da ordem
    const depois = rollInitiativeFor(s, novo.id, () => 0.95)

    expect(depois.combatants[0].id).toBe(novo.id)
    expect(depois.activeId).toBe(ativoAntes)
    expect(depois.round).toBe(s.round)
  })

  it('devolve o estado intacto quando o id não existe', () => {
    const s = mesa()
    expect(rollInitiativeFor(s, 'k999', () => 0.5)).toEqual(s)
  })
})

describe('condições com duração', () => {
  it('setConditionDuration grava a rodada absoluta de expiração', () => {
    const s = mesa()
    const goblin = s.combatants.find(c => c.name === 'Goblin')

    // Rodada 1 + 2 rodadas de duração → some ao entrar na rodada 3.
    const marcado = setConditionDuration(s, goblin.id, 'frightened', 2)

    expect(marcado.combatants.find(c => c.id === goblin.id).conditionUntil)
      .toEqual({ frightened: 3 })
  })

  it('duração zero ou vazia remove o prazo sem remover a condição', () => {
    let s = mesa()
    const goblin = s.combatants.find(c => c.name === 'Goblin')
    s = toggleNpcCondition(s, goblin.id, 'frightened')
    s = setConditionDuration(s, goblin.id, 'frightened', 2)

    const semPrazo = setConditionDuration(s, goblin.id, 'frightened', 0)
    const alvo = semPrazo.combatants.find(c => c.id === goblin.id)

    expect(alvo.conditionUntil).toEqual({})
    expect(alvo.conditions).toContain('frightened')
  })

  it('nextTurn remove a condição quando a rodada de expiração chega', () => {
    let s = mesa()
    const goblin = s.combatants.find(c => c.name === 'Goblin')
    s = toggleNpcCondition(s, goblin.id, 'frightened')
    s = toggleNpcCondition(s, goblin.id, 'prone')
    s = setConditionDuration(s, goblin.id, 'frightened', 1) // some na rodada 2

    // Uma volta inteira da ordem para chegar à rodada 2.
    let depois = s
    for (let i = 0; i < s.combatants.length; i++) depois = nextTurn(depois)

    const alvo = depois.combatants.find(c => c.id === goblin.id)
    expect(depois.round).toBe(2)
    expect(alvo.conditions).toEqual(['prone'])
    expect(alvo.conditionUntil).toEqual({})
  })

  it('condição sem prazo atravessa as rodadas intacta', () => {
    let s = mesa()
    const goblin = s.combatants.find(c => c.name === 'Goblin')
    s = toggleNpcCondition(s, goblin.id, 'prone')

    let depois = s
    for (let i = 0; i < s.combatants.length * 3; i++) depois = nextTurn(depois)

    expect(depois.combatants.find(c => c.id === goblin.id).conditions).toEqual(['prone'])
  })

  it('combatente gravado antes desta mudança atravessa nextTurn intacto', () => {
    const s = mesa()
    // Sem a chave `conditionUntil`, como está gravado no banco hoje.
    const antigo = {
      ...s,
      combatants: s.combatants.map(c =>
        c.kind === 'npc' ? { ...c, conditions: ['poisoned'], conditionUntil: undefined } : c),
    }

    const depois = nextTurn(antigo)

    for (const c of depois.combatants.filter(x => x.kind === 'npc')) {
      expect(c.conditions).toEqual(['poisoned'])
    }
  })

  it('previousTurn não ressuscita condição já expirada', () => {
    let s = mesa()
    const goblin = s.combatants.find(c => c.name === 'Goblin')
    s = toggleNpcCondition(s, goblin.id, 'frightened')
    s = setConditionDuration(s, goblin.id, 'frightened', 1)

    let depois = s
    for (let i = 0; i < s.combatants.length; i++) depois = nextTurn(depois)
    depois = previousTurn(depois)

    expect(depois.combatants.find(c => c.id === goblin.id).conditions).toEqual([])
  })
})
