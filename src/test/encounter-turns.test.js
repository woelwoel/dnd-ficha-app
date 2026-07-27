import { describe, it, expect } from 'vitest'
import {
  emptyEncounterState, addPc, rollInitiative, setInitiative,
  sortByInitiative, startEncounter, nextTurn, previousTurn,
} from '../systems/dnd5e/domain/encounter'

function party() {
  let s = emptyEncounterState()
  s = addPc(s, { characterId: 'a', name: 'Ana',   initiativeBonus: 2 })
  s = addPc(s, { characterId: 'b', name: 'Bruno', initiativeBonus: 0 })
  s = addPc(s, { characterId: 'c', name: 'Caio',  initiativeBonus: 5 })
  return s
}

describe('sortByInitiative', () => {
  it('ordena desc, desempata por bônus e depois por nome', () => {
    const list = [
      { id: '1', name: 'Zed',  initiative: 12, initiativeBonus: 1 },
      { id: '2', name: 'Alba', initiative: 12, initiativeBonus: 1 },
      { id: '3', name: 'Cid',  initiative: 12, initiativeBonus: 4 },
      { id: '4', name: 'Duna', initiative: 20, initiativeBonus: 0 },
    ]
    expect(sortByInitiative(list).map(c => c.name)).toEqual(['Duna', 'Cid', 'Alba', 'Zed'])
  })

  it('joga quem não rolou pro fim', () => {
    const list = [
      { id: '1', name: 'Sem', initiative: null, initiativeBonus: 9 },
      { id: '2', name: 'Com', initiative: 3, initiativeBonus: 0 },
    ]
    expect(sortByInitiative(list).map(c => c.name)).toEqual(['Com', 'Sem'])
  })
})

describe('rollInitiative', () => {
  it('rola d20 + bônus pra todos e devolve o detalhe do dado', () => {
    const { state, rolls } = rollInitiative(party(), () => 0.5) // d20 = 11
    expect(rolls).toEqual([
      { id: 'k1', die: 11, bonus: 2, total: 13 },
      { id: 'k2', die: 11, bonus: 0, total: 11 },
      { id: 'k3', die: 11, bonus: 5, total: 16 },
    ])
    expect(state.combatants.map(c => c.name)).toEqual(['Caio', 'Ana', 'Bruno'])
  })
})

describe('setInitiative', () => {
  it('sobrescreve o valor e reordena', () => {
    const { state } = rollInitiative(party(), () => 0.5)
    const next = setInitiative(state, 'k2', 30)
    expect(next.combatants.map(c => c.name)).toEqual(['Bruno', 'Caio', 'Ana'])
  })

  it('valor não numérico volta pra null', () => {
    const { state } = rollInitiative(party(), () => 0.5)
    expect(setInitiative(state, 'k1', '').combatants.find(c => c.id === 'k1').initiative).toBeNull()
  })
})

describe('startEncounter / nextTurn / previousTurn', () => {
  it('começa na rodada 1 com o primeiro da ordem', () => {
    const { state } = rollInitiative(party(), () => 0.5)
    const s = startEncounter(state)
    expect(s).toMatchObject({ started: true, round: 1, activeId: 'k3' })
  })

  it('avança e vira a rodada ao passar do último', () => {
    let s = startEncounter(rollInitiative(party(), () => 0.5).state)
    s = nextTurn(s); expect(s.activeId).toBe('k1'); expect(s.round).toBe(1)
    s = nextTurn(s); expect(s.activeId).toBe('k2'); expect(s.round).toBe(1)
    s = nextTurn(s); expect(s.activeId).toBe('k3'); expect(s.round).toBe(2)
  })

  it('volta a rodada ao recuar do primeiro', () => {
    let s = startEncounter(rollInitiative(party(), () => 0.5).state)
    s = nextTurn(s)          // Ana, rodada 1
    s = previousTurn(s)
    expect(s).toMatchObject({ activeId: 'k3', round: 1 })
    s = previousTurn(s)      // já na rodada 1: não desce
    expect(s).toMatchObject({ activeId: 'k3', round: 1 })
    s = nextTurn(nextTurn(nextTurn(s))) // rodada 2, Caio
    expect(s.round).toBe(2)
    s = previousTurn(s)
    expect(s).toMatchObject({ activeId: 'k2', round: 1 })
  })

  it('não faz nada antes de começar', () => {
    const s = party()
    expect(nextTurn(s)).toBe(s)
    expect(previousTurn(s)).toBe(s)
  })
})
