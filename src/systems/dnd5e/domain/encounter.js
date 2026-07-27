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
