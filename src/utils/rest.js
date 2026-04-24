/**
 * Ações de descanso (PHB p.186).
 *
 * Descanso Curto (1 hora):
 *   - O personagem pode gastar Hit Dice e recuperar HP: cada HD gasto cura
 *     `rolagem + mod CON` (mínimo 1 por HD).
 *   - Não recupera slots de magia, exceto Pact Magic (Bruxo — PHB p.107).
 *
 * Descanso Longo (8 horas):
 *   - HP volta ao máximo.
 *   - Recupera metade dos HD totais (mínimo 1).
 *   - Todos os slots de magia são restaurados (inclui Pact Magic).
 *
 * Esta camada é pura: recebe estado + parâmetros e retorna o próximo estado,
 * sem efeitos colaterais (thunks ficam no componente).
 */

import { toHitDicePool } from './hitDice'
import { getModifier } from './calculations'

/**
 * Aplica um descanso curto.
 *
 * @param {object} character              Personagem completo.
 * @param {object} params                 Parâmetros do descanso.
 * @param {Array<{die:string, roll:number}>} params.spent
 *        Lista de HD gastos nesta rodada — cada item indica o tipo de dado
 *        ('d8', 'd10', ...) e o valor rolado. A cura é `roll + mod CON`
 *        (mínimo 1), por HD gasto.
 * @param {boolean} [params.restoreWarlockSlots=true]
 *        Restaura slots de Pact Magic do Bruxo (ver {@link getWarlockPactSlots}).
 *        Bruxo é a única classe que recupera slots em descanso curto.
 * @returns {object} próximo `character`
 */
export function performShortRest(character, { spent = [], restoreWarlockSlots = true } = {}) {
  const combat = character.combat ?? {}
  const pool = { ...toHitDicePool(combat.hitDice) }
  const conMod = getModifier(character.attributes?.con ?? 10)

  let healing = 0
  for (const { die, roll } of spent) {
    const bucket = pool[die]
    if (!bucket) continue
    const remaining = Math.max(0, (bucket.total ?? 0) - (bucket.used ?? 0))
    if (remaining <= 0) continue
    pool[die] = { ...bucket, used: (bucket.used ?? 0) + 1 }
    healing += Math.max(1, (roll ?? 0) + conMod)
  }

  const currentHp = Math.min(
    combat.maxHp ?? 0,
    Math.max(0, (combat.currentHp ?? 0) + healing)
  )

  let spellcasting = character.spellcasting
  if (restoreWarlockSlots) {
    // Bruxo recupera seus slots (Pact Magic) em descanso curto. Como o slot
    // do Pact é fundido com o rastreador por nível, zeramos o nível específico
    // do Pact. A responsabilidade de saber qual é esse nível fica no chamador,
    // mas como simplificação segura zeramos TODOS os slots somente se o bruxo
    // for a única classe conjuradora. Se houver mistura, o caller deve passar
    // `restoreWarlockSlots: false` e tratar manualmente.
    const onlyWarlock = character.info?.class === 'bruxo'
      && !(character.info?.multiclasses ?? []).some(mc =>
        ['mago', 'clerigo', 'druida', 'bardo', 'feiticeiro', 'paladino', 'patrulheiro'].includes(mc.class)
      )
    if (onlyWarlock) {
      spellcasting = { ...spellcasting, usedSlots: {} }
    }
  }

  return {
    ...character,
    combat: { ...combat, currentHp, hitDice: { pool } },
    spellcasting,
  }
}

/**
 * Aplica um descanso longo.
 *
 * @param {object} character  Personagem completo.
 * @returns {object}  próximo `character` com HP cheio, metade dos HD de volta
 *                    (mín. 1 no total), todos os slots restaurados e 0 de HP
 *                    temporário (PHB p.186).
 */
export function performLongRest(character) {
  const combat = character.combat ?? {}
  const pool = { ...toHitDicePool(combat.hitDice) }

  const totalHd = Object.values(pool).reduce((s, v) => s + (v?.total ?? 0), 0)
  let regainBudget = Math.max(1, Math.floor(totalHd / 2))

  // Distribui a recuperação priorizando dados mais usados (maiores `used`).
  const ordered = Object.entries(pool)
    .map(([die, v]) => ({ die, used: v?.used ?? 0, total: v?.total ?? 0 }))
    .filter(e => e.used > 0 && e.total > 0)
    .sort((a, b) => b.used - a.used)

  for (const entry of ordered) {
    if (regainBudget <= 0) break
    const recover = Math.min(entry.used, regainBudget)
    pool[entry.die] = { total: entry.total, used: entry.used - recover }
    regainBudget -= recover
  }

  return {
    ...character,
    combat: {
      ...combat,
      currentHp: combat.maxHp ?? 0,
      tempHp: 0,
      hitDice: { pool },
      // Mantém concentração? Em regra não — mas "inconsciente" quebra conc.,
      // não descanso per se. Mantemos estado para não surpreender o jogador.
      deathSaves: { successes: 0, failures: 0 },
    },
    spellcasting: {
      ...(character.spellcasting ?? {}),
      usedSlots: {},
    },
  }
}
