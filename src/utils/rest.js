/**
 * Ações de descanso (PHB p.186).
 *
 * Descanso Curto (1 hora):
 *   - O personagem pode gastar Hit Dice e recuperar HP: cada HD gasto cura
 *     `rolagem + mod CON` (mínimo 1 por HD).
 *   - Não recupera slots de magia, EXCETO Pact Magic (Bruxo — PHB p.107).
 *   - Recarrega features com `recharge: 'short'` (Action Surge, Second Wind,
 *     Ki, Bardic Inspiration ≥5, etc.).
 *
 * Descanso Longo (8 horas):
 *   - HP volta ao máximo.
 *   - Recupera metade dos HD totais (mínimo 1).
 *   - Todos os slots de magia são restaurados (inclui Pact Magic).
 *   - Recarrega features com `recharge: 'short' | 'long' | 'dawn'`.
 *
 * Esta camada é pura: recebe estado + parâmetros e retorna o próximo estado,
 * sem efeitos colaterais (thunks ficam no componente).
 */

import { toHitDicePool } from './hitDice'
import { getModifier } from './calculations'
import { CASTER_TYPE, isUnifiedSlotCaster } from './spellcasting'

/**
 * Decide se o personagem é "apenas Bruxo" para fins de Short Rest.
 * Definição derivada (não hardcoded): nenhuma classe (primária ou MC)
 * está em `CASTER_TYPE` (i.e., não é full nem half caster).
 */
function isWarlockOnly(character) {
  const primary = character?.info?.class
  const mcs     = character?.info?.multiclasses ?? []
  if (primary !== 'bruxo' && !mcs.some(m => m.class === 'bruxo')) return false
  if (primary && isUnifiedSlotCaster(primary)) return false
  for (const m of mcs) if (isUnifiedSlotCaster(m.class)) return false
  return true
}

/**
 * Recarrega `combat.classFeatureUses` cujo `recharge` esteja na lista.
 * Ex.: `recharges = ['short']` em descanso curto, `['short', 'long', 'dawn']`
 * em descanso longo.
 */
function rechargeFeatures(uses, recharges) {
  if (!Array.isArray(uses) || uses.length === 0) return uses ?? []
  const set = new Set(recharges)
  return uses.map(u => set.has(u.recharge) ? { ...u, used: 0 } : u)
}

/**
 * Aplica um descanso curto.
 *
 * @param {object} character
 * @param {object} params
 * @param {Array<{die:string, roll:number}>} params.spent
 *        HD gastos (cada item: tipo de dado e valor rolado).
 * @returns {object} próximo `character`
 */
export function performShortRest(character, { spent = [] } = {}) {
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

  // Pact Magic: zera slot do Bruxo. Quando há mistura com unified caster, o
  // controle vira manual (caller). Aqui, recuperamos pactSlotsUsed sempre que
  // o personagem TEM níveis de bruxo — Pact Magic recarrega no curto.
  const hasWarlock = character.info?.class === 'bruxo'
    || (character.info?.multiclasses ?? []).some(mc => mc.class === 'bruxo')
  let spellcasting = character.spellcasting
  if (hasWarlock) {
    spellcasting = { ...(spellcasting ?? {}), pactSlotsUsed: 0 }
    // Compat: se o personagem é APENAS bruxo, também zera `usedSlots` (que
    // historicamente foi usado para rastrear slots de pact em fichas v2).
    if (isWarlockOnly(character)) {
      spellcasting = { ...spellcasting, usedSlots: {} }
    }
  }

  return {
    ...character,
    combat: {
      ...combat,
      currentHp,
      hitDice: { pool },
      classFeatureUses: rechargeFeatures(combat.classFeatureUses, ['short']),
    },
    spellcasting,
  }
}

/**
 * Aplica um descanso longo.
 *
 * Comportamento de HD:
 *   - Por padrão (`recoverChoices` vazio), distribui o orçamento (metade
 *     dos HD totais, mín. 1) priorizando os dados mais usados.
 *   - Se o jogador passar `recoverChoices: [{ die, count }]`, respeita a
 *     escolha (até o orçamento total).
 *
 * @param {object} character
 * @param {object} [opts]
 * @param {Array<{die:string,count:number}>} [opts.recoverChoices]
 * @returns {object}
 */
export function performLongRest(character, { recoverChoices = null } = {}) {
  const combat = character.combat ?? {}
  const pool = { ...toHitDicePool(combat.hitDice) }

  const totalHd = Object.values(pool).reduce((s, v) => s + (v?.total ?? 0), 0)
  let regainBudget = Math.max(1, Math.floor(totalHd / 2))

  if (Array.isArray(recoverChoices) && recoverChoices.length > 0) {
    for (const { die, count } of recoverChoices) {
      if (regainBudget <= 0) break
      const bucket = pool[die]
      if (!bucket) continue
      const recover = Math.min(bucket.used ?? 0, Math.max(0, count), regainBudget)
      pool[die] = { total: bucket.total, used: (bucket.used ?? 0) - recover }
      regainBudget -= recover
    }
  } else {
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
  }

  return {
    ...character,
    combat: {
      ...combat,
      currentHp: combat.maxHp ?? 0,
      tempHp: 0,
      hitDice: { pool },
      deathSaves: { successes: 0, failures: 0 },
      classFeatureUses: rechargeFeatures(combat.classFeatureUses, ['short', 'long', 'dawn']),
    },
    spellcasting: {
      ...(character.spellcasting ?? {}),
      usedSlots: {},
      pactSlotsUsed: 0,
    },
  }
}

// Compat: caller antigo passava `restoreWarlockSlots`; ignoramos e
// derivamos automaticamente do estado.
export const __INTERNAL_isWarlockOnly = isWarlockOnly
