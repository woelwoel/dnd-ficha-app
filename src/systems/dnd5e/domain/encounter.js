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

/**
 * Remove as condições cujo prazo já venceu na rodada informada.
 *
 * `conditionUntil[id]` é a rodada ABSOLUTA em que a condição some — não uma
 * contagem regressiva. Absoluto sobrevive ao `previousTurn` (que decrementa a
 * rodada) sem recalcular nada, e combatente gravado antes desta mudança, sem a
 * chave, simplesmente nunca expira sozinho.
 */
function expireConditions(state, round) {
  return {
    ...state,
    combatants: state.combatants.map(c => {
      const until = c.conditionUntil
      if (!until) return c
      const vencidas = Object.keys(until).filter(id => round >= until[id])
      if (vencidas.length === 0) return c
      const restante = { ...until }
      for (const id of vencidas) delete restante[id]
      return {
        ...c,
        conditions: (c.conditions ?? []).filter(id => !vencidas.includes(id)),
        conditionUntil: restante,
      }
    }),
  }
}

export function nextTurn(state) {
  if (!state.started || state.combatants.length === 0) return state
  const i = state.combatants.findIndex(c => c.id === state.activeId)
  const next = i + 1
  if (next >= state.combatants.length) {
    const round = state.round + 1
    return expireConditions({ ...state, round, activeId: state.combatants[0].id }, round)
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

/** Aplica `fn` só no combatente `npc` de id dado (PJ passa pela RPC, não aqui). */
function mapNpc(state, id, fn) {
  return {
    ...state,
    combatants: state.combatants.map(c => (c.id === id && c.kind === 'npc' ? fn(c) : c)),
  }
}

function toAmount(v) {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function applyNpcDamage(state, id, amount) {
  const dmg = toAmount(amount)
  if (dmg === 0) return state
  return mapNpc(state, id, c => {
    const absorbed = Math.min(c.tempHp ?? 0, dmg)
    const currentHp = Math.max(0, (c.currentHp ?? 0) - (dmg - absorbed))
    return { ...c, tempHp: (c.tempHp ?? 0) - absorbed, currentHp, defeated: currentHp === 0 }
  })
}

/** PHB p.196: dano dividido arredonda pra baixo. */
export function halfDamage(amount) {
  return Math.floor(Math.max(0, Number(amount) || 0) / 2)
}

/**
 * Dano em vários monstros de uma vez (bola de fogo e afins).
 *
 * Existe pra ser UMA escrita: um `applyNpcDamage` por alvo significaria um
 * `update` por alvo, e o segundo save sairia com a versão que o primeiro acabou
 * de invalidar — conflito de propósito, recarga do servidor no meio da
 * aplicação e metade da área aplicada.
 *
 * @param {Array<{id: string, amount: number}>} hits
 */
export function applyNpcDamageMany(state, hits) {
  return (hits ?? []).reduce(
    (s, h) => applyNpcDamage(s, h.id, h.amount),
    state,
  )
}

export function applyNpcHealing(state, id, amount) {
  const heal = toAmount(amount)
  if (heal === 0) return state
  return mapNpc(state, id, c => {
    const currentHp = Math.min(c.maxHp ?? 0, (c.currentHp ?? 0) + heal)
    return { ...c, currentHp, defeated: currentHp === 0 }
  })
}

/** PHB p.198: HP temporário não empilha — fica o maior. */
export function setNpcTempHp(state, id, amount) {
  const t = toAmount(amount)
  return mapNpc(state, id, c => ({ ...c, tempHp: Math.max(t, c.tempHp ?? 0) }))
}

export function toggleNpcCondition(state, id, conditionId) {
  return mapNpc(state, id, c => {
    const list = c.conditions ?? []
    return {
      ...c,
      conditions: list.includes(conditionId)
        ? list.filter(x => x !== conditionId)
        : [...list, conditionId],
    }
  })
}

/**
 * Marca (ou tira) o prazo de uma condição de monstro. `rounds` é a duração em
 * rodadas a partir de AGORA; 0 (ou vazio) tira o prazo sem tirar a condição.
 */
export function setConditionDuration(state, id, conditionId, rounds) {
  const n = Math.floor(Number(rounds))
  return mapNpc(state, id, c => {
    const until = { ...(c.conditionUntil ?? {}) }
    if (Number.isFinite(n) && n > 0) until[conditionId] = (state.round ?? 0) + n
    else delete until[conditionId]
    return { ...c, conditionUntil: until }
  })
}

/**
 * Rola iniciativa só para um combatente (monstro que entrou no meio da luta) e
 * reordena. Não mexe em `activeId` nem na rodada: `nextTurn` acha o ativo por
 * id, não por índice, então inserir alguém antes dele não faz ninguém agir duas
 * vezes nem pular a vez.
 */
export function rollInitiativeFor(state, id, rng = Math.random) {
  const alvo = state.combatants.find(c => c.id === id)
  if (!alvo) return state
  const initiative = Math.floor(rng() * 20) + 1 + (alvo.initiativeBonus ?? 0)
  const combatants = state.combatants.map(c => (c.id === id ? { ...c, initiative } : c))
  return { ...state, combatants: sortByInitiative(combatants) }
}

/**
 * Devolve UM combatente ao estado de um snapshot anterior, sobre o estado
 * atual. É o motor do desfazer: restaurar o `state` inteiro seria mais simples
 * e errado — atropelaria o que o outro aparelho do Mestre mudou no meio e
 * reverteria a rodada junto.
 */
export function restoreCombatant(state, snapshot) {
  if (!snapshot || !state.combatants.some(c => c.id === snapshot.id)) return state
  return {
    ...state,
    combatants: state.combatants.map(c => (c.id === snapshot.id ? snapshot : c)),
  }
}

export function removeCombatant(state, id) {
  const i = state.combatants.findIndex(c => c.id === id)
  if (i === -1) return state
  const rest = state.combatants.filter(c => c.id !== id)
  if (state.activeId !== id) return { ...state, combatants: rest }
  if (rest.length === 0) return { ...state, combatants: rest, activeId: null }
  // O removido era o último da ordem: mesma volta do nextTurn ao passar do
  // fim da lista — vai pro primeiro e avança a rodada. Se não era o último,
  // quem ocupa o índice `i` em `rest` já é o sucessor natural.
  if (i >= rest.length) {
    return { ...state, combatants: rest, activeId: rest[0].id, round: state.round + 1 }
  }
  return { ...state, combatants: rest, activeId: rest[i].id }
}

/**
 * Marca PJ cuja ficha não está mais legível na mesa (o trigger da migration
 * 0007 desvincula a ficha quando o membro sai). Combatente órfão CONTINUA na
 * ordem de iniciativa — só perde as ações de escrita.
 */
export function markOrphans(state, liveCharacterIds) {
  const live = new Set(liveCharacterIds)
  return {
    ...state,
    combatants: state.combatants.map(c =>
      c.kind === 'pc' ? { ...c, orphaned: !live.has(c.characterId) } : c),
  }
}

export function totalXp(state) {
  return state.combatants.reduce((s, c) => s + (c.kind === 'npc' ? (c.xp ?? 0) : 0), 0)
}
