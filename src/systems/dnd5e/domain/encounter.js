/**
 * Domínio puro do encontro de combate (spec 2026-07-26 Mesa de Combate).
 *
 * Sem React e sem Supabase: recebe e devolve o `state` do encontro, que é o
 * jsonb da tabela `encounters`. Regra do PJ NÃO mora aqui — combatente `pc` só
 * referencia a ficha (`characterId`), porque HP duplicado é HP dessincronizado.
 */
import { getModifier } from '../utils/calculations'
import { parseDiceNotation } from './spellMechanics'

export function emptyEncounterState() {
  return { round: 0, activeId: null, started: false, combatants: [], nextSeq: 1 }
}

function rollNotation({ count, sides, mod }, rng) {
  let total = mod
  for (let i = 0; i < count; i++) total += Math.floor(rng() * sides) + 1
  return Math.max(1, total)
}

/** Campos do combatente `npc` derivados do statblock SRD. */
export function npcStatsFromMonster(monster, { rollHp = false, rng = Math.random } = {}) {
  const notation = parseDiceNotation(monster?.hit_points_roll ?? '')
  const maxHp = rollHp && notation
    ? rollNotation(notation, rng)
    : Math.max(1, monster?.hit_points ?? 1)
  return {
    // armor_class é ARRAY de objetos no SRD, não número.
    ac: monster?.armor_class?.[0]?.value ?? 10,
    maxHp,
    initiativeBonus: getModifier(monster?.dexterity ?? 10),
    xp: monster?.xp ?? 0,
  }
}

export function addPc(state, { characterId, name, initiativeBonus = 0 }) {
  return {
    ...state,
    nextSeq: state.nextSeq + 1,
    combatants: [...state.combatants, {
      id: `k${state.nextSeq}`,
      kind: 'pc',
      characterId,
      name,
      initiative: null,
      initiativeBonus,
      orphaned: false,
    }],
  }
}

export function addNpc(state, monster, opts = {}) {
  const stats = npcStatsFromMonster(monster, opts)
  // Ordinal = maior já usado + 1. Contar os presentes reusaria o número de um
  // monstro removido e colidiria com quem sobrou.
  const ordinal = state.combatants.reduce(
    (max, c) => (c.monsterIndex === monster.index ? Math.max(max, c.ordinal ?? 1) : max),
    0,
  ) + 1
  return {
    ...state,
    nextSeq: state.nextSeq + 1,
    combatants: [...state.combatants, {
      id: `k${state.nextSeq}`,
      kind: 'npc',
      monsterIndex: monster.index,
      ordinal,
      name: ordinal === 1 ? monster.name : `${monster.name} ${ordinal}`,
      initiative: null,
      initiativeBonus: stats.initiativeBonus,
      ac: stats.ac,
      maxHp: stats.maxHp,
      currentHp: stats.maxHp,
      tempHp: 0,
      xp: stats.xp,
      conditions: [],
      defeated: false,
    }],
  }
}

/** Ordena por iniciativa desc; empate por bônus desc; depois nome (determinístico). */
export function sortByInitiative(combatants) {
  return [...combatants].sort((a, b) =>
    (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity)
    || (b.initiativeBonus ?? 0) - (a.initiativeBonus ?? 0)
    || String(a.name).localeCompare(String(b.name), 'pt-BR'),
  )
}

/**
 * Rola d20+bônus pra todo mundo de uma vez. `rng` é uma FUNÇÃO (não um valor
 * já rolado) porque essa função invoca o dado uma vez por combatente; o
 * teste passa um `rng` fixo pra tornar as N rolagens determinísticas.
 * @returns {{ state: object, rolls: Array<{id,die,bonus,total}> }}
 */
export function rollInitiative(state, rng = Math.random) {
  const rolls = []
  const combatants = state.combatants.map(c => {
    const die = Math.floor(rng() * 20) + 1
    const bonus = c.initiativeBonus ?? 0
    rolls.push({ id: c.id, die, bonus, total: die + bonus })
    return { ...c, initiative: die + bonus }
  })
  return { state: { ...state, combatants: sortByInitiative(combatants) }, rolls }
}

/** Correção manual (o jogador rolou o dado físico dele e falou o número). */
export function setInitiative(state, id, value) {
  const n = Number(value)
  const valid = value !== '' && value !== null && Number.isFinite(n)
  const combatants = state.combatants.map(c =>
    c.id === id ? { ...c, initiative: valid ? n : null } : c)
  return { ...state, combatants: sortByInitiative(combatants) }
}

export function startEncounter(state) {
  const combatants = sortByInitiative(state.combatants)
  return { ...state, combatants, started: true, round: 1, activeId: combatants[0]?.id ?? null }
}

export function nextTurn(state) {
  if (!state.started || state.combatants.length === 0) return state
  const i = state.combatants.findIndex(c => c.id === state.activeId)
  const next = i + 1
  if (next >= state.combatants.length) {
    return { ...state, round: state.round + 1, activeId: state.combatants[0].id }
  }
  return { ...state, activeId: state.combatants[next].id }
}

export function previousTurn(state) {
  if (!state.started || state.combatants.length === 0) return state
  const i = state.combatants.findIndex(c => c.id === state.activeId)
  if (i <= 0) {
    if (state.round <= 1) return { ...state, activeId: state.combatants[0].id }
    return { ...state, round: state.round - 1, activeId: state.combatants[state.combatants.length - 1].id }
  }
  return { ...state, activeId: state.combatants[i - 1].id }
}
