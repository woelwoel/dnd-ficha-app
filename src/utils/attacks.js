/**
 * Cálculo de ataques de arma (PHB p.149).
 *
 * Um ataque é descrito por:
 *   - abilityOverride?: string ('str'|'dex'...) — força um atributo específico
 *   - damageDice: string ('1d8')
 *   - damageType: string ('cortante' etc.)
 *   - properties: string[] ('finesse', 'versatile', 'ranged', 'thrown', 'light'...)
 *   - versatileDice?: string ('1d10') — dano alternativo de duas mãos
 *   - proficient: boolean — proficiente na arma (soma BP ao ataque)
 *   - magicBonus: number — bônus mágico (soma ataque e dano)
 *
 * O modificador de ataque/dano usa o maior entre FOR/DES quando a arma tem
 * `finesse`; caso contrário, DES para armas à distância ('ranged'), FOR para
 * corpo-a-corpo. Se houver `abilityOverride`, ele vence.
 */

import { getModifier } from './calculations'

const RANGED_PROPERTIES = new Set(['ranged', 'alcance', 'à distância', 'a distancia'])
const FINESSE_PROPERTIES = new Set(['finesse', 'acuidade'])

function hasProperty(properties, set) {
  return (properties ?? []).some(p => set.has(String(p).toLowerCase()))
}

/**
 * Decide qual atributo rege o ataque.
 * Ordem: override explícito → finesse (maior FOR/DES) → ranged (DES) → FOR.
 */
export function resolveAttackAbility(attack, attributes) {
  if (attack?.abilityOverride) return attack.abilityOverride
  const str = attributes?.str ?? 10
  const dex = attributes?.dex ?? 10
  if (hasProperty(attack?.properties, FINESSE_PROPERTIES)) {
    return getModifier(dex) >= getModifier(str) ? 'dex' : 'str'
  }
  if (hasProperty(attack?.properties, RANGED_PROPERTIES)) return 'dex'
  return 'str'
}

/**
 * Calcula o bônus de ataque (para rolar 1d20 + bônus).
 *
 * @param {object} attack
 * @param {object} attributes
 * @param {number} profBonus   bônus de proficiência do personagem
 * @returns {number}
 */
export function calculateWeaponAttackBonus(attack, attributes, profBonus) {
  const abilityKey = resolveAttackAbility(attack, attributes)
  const abilityMod = getModifier(attributes?.[abilityKey] ?? 10)
  const profMod    = attack?.proficient ? (profBonus ?? 0) : 0
  const magic      = attack?.magicBonus ?? 0
  return abilityMod + profMod + magic
}

/**
 * Calcula a expressão de dano (texto) somando dado + modificador + bônus mágico.
 *
 * @param {object} attack
 * @param {object} attributes
 * @param {object} [opts]
 * @param {boolean} [opts.versatileTwoHanded=false] usa `versatileDice` se existir
 * @returns {{ expression: string, modifier: number, dice: string }}
 */
export function calculateWeaponDamage(attack, attributes, { versatileTwoHanded = false } = {}) {
  const abilityKey = resolveAttackAbility(attack, attributes)
  const abilityMod = getModifier(attributes?.[abilityKey] ?? 10)
  const magic      = attack?.magicBonus ?? 0
  const modifier   = abilityMod + magic
  const dice       = (versatileTwoHanded && attack?.versatileDice) ? attack.versatileDice : (attack?.damageDice || '1d4')
  const sign       = modifier >= 0 ? '+' : '−'
  const absMod     = Math.abs(modifier)
  const expression = modifier === 0 ? dice : `${dice} ${sign} ${absMod}`
  return { expression, modifier, dice }
}
