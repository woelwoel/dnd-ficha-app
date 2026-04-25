/**
 * Cálculo de ataques de arma (PHB p.149) com Fighting Styles (PHB p.72).
 *
 * Um ataque é descrito por:
 *   - abilityOverride?: 'str'|'dex'|'con'|'int'|'wis'|'cha' (validado)
 *   - damageDice: string ('1d8')
 *   - damageType: string ('cortante' etc.)
 *   - properties: string[] ('finesse', 'versatile', 'ranged', 'thrown', 'light'...)
 *   - versatileDice?: string ('1d10') — dano alternativo de duas mãos
 *   - proficient: boolean — proficiente na arma (soma BP ao ataque)
 *   - magicBonus: number — bônus mágico (soma ataque e dano)
 *   - fightingStyle?: 'archery' | 'dueling' | 'great-weapon' | 'two-weapon' | 'none'
 *   - offHand?: boolean — TRUE se o ataque é um golpe off-hand (TWF)
 *   - useThrown?: boolean — força ranged (DEX) para arma com `thrown`
 *
 * Atributo regente: override (validado) → finesse (maior FOR/DES) → ranged (DES)
 *                   → thrown explicit (DES via flag) → FOR.
 */

import { getModifier } from './calculations'

const VALID_ABILITY_KEYS = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha'])
const RANGED_PROPERTIES   = new Set(['ranged', 'alcance', 'à distância', 'a distancia'])
const FINESSE_PROPERTIES  = new Set(['finesse', 'acuidade'])
const THROWN_PROPERTIES   = new Set(['thrown', 'arremesso', 'arremessável', 'arremessavel'])
const TWO_HANDED_PROPS    = new Set(['two-handed', 'duas mãos', 'duas maos'])
const VERSATILE_PROPS     = new Set(['versatile', 'versátil', 'versatil'])

/** Seguro: aceita undefined e normaliza para lowercase. */
function hasProperty(properties, set) {
  return (properties ?? []).some(p => set.has(String(p).toLowerCase()))
}

/**
 * Decide qual atributo rege o ataque.
 * Ordem: override (validado) → finesse (maior FOR/DES) → ranged → thrown
 *        explícito (DES) → FOR.
 *
 * `abilityOverride` inválido é IGNORADO (cai na heurística).
 */
export function resolveAttackAbility(attack, attributes) {
  const override = attack?.abilityOverride
  if (override && VALID_ABILITY_KEYS.has(override)) return override

  const str = attributes?.str ?? 10
  const dex = attributes?.dex ?? 10

  if (hasProperty(attack?.properties, FINESSE_PROPERTIES)) {
    return getModifier(dex) >= getModifier(str) ? 'dex' : 'str'
  }
  if (hasProperty(attack?.properties, RANGED_PROPERTIES)) return 'dex'
  // 'thrown' sozinho é melee por padrão; jogador opta por DES via `useThrown`.
  if (attack?.useThrown && hasProperty(attack?.properties, THROWN_PROPERTIES)) return 'dex'
  return 'str'
}

/**
 * Aplica modificadores de Fighting Style ao bônus DE ATAQUE.
 *  - Archery   : +2 a ataque com armas à distância (PHB p.72).
 *  - Outros    : sem efeito no ataque.
 */
function fightingStyleAttackBonus(attack) {
  if (attack?.fightingStyle === 'archery'
      && hasProperty(attack.properties, RANGED_PROPERTIES)) {
    return 2
  }
  return 0
}

/**
 * Aplica modificadores de Fighting Style ao mod de DANO e modifica
 * a string de dado quando aplicável (Great Weapon Fighting re-rola 1/2).
 *
 *  - Dueling      : +2 dano usando arma de mão única SEM segunda arma/escudo
 *                   na outra mão (UI deve repassar via flag — aqui assumimos
 *                   que se a arma NÃO é versátil two-handed e não é offHand,
 *                   o estilo se aplica).
 *  - Great Weapon : re-rola 1/2 nos dados — anotamos o dado com sufixo "(rr1-2)"
 *                   e somamos 0 ao mod (efeito é estatístico, não fixo).
 *  - Two-Weapon   : permite somar ability mod ao DANO do ataque off-hand
 *                   (sem ele, off-hand recebe apenas dado, sem mod).
 *
 * Retorna `{ extraDamageMod, diceOverride }`.
 */
function fightingStyleDamageMods(attack, abilityMod, { versatileTwoHanded }) {
  let extraDamageMod = 0
  let diceOverride = null

  switch (attack?.fightingStyle) {
    case 'dueling': {
      const isMelee = !hasProperty(attack.properties, RANGED_PROPERTIES)
      const isTwoHanded = hasProperty(attack.properties, TWO_HANDED_PROPS)
        || (versatileTwoHanded && hasProperty(attack.properties, VERSATILE_PROPS))
      if (isMelee && !isTwoHanded && !attack.offHand) extraDamageMod += 2
      break
    }
    case 'great-weapon': {
      const isTwoHanded = hasProperty(attack.properties, TWO_HANDED_PROPS)
        || (versatileTwoHanded && hasProperty(attack.properties, VERSATILE_PROPS))
      const isMelee = !hasProperty(attack.properties, RANGED_PROPERTIES)
      if (isMelee && isTwoHanded) {
        const baseDice = (versatileTwoHanded && attack.versatileDice) ? attack.versatileDice : (attack.damageDice || '1d4')
        diceOverride = `${baseDice} (rr 1-2)`
      }
      break
    }
    default:
      break
  }

  // Two-Weapon Fighting: off-hand normalmente perde abilityMod no dano (PHB p.195).
  // Quando o personagem TEM o estilo TWF, esse mod é restaurado.
  if (attack?.offHand && attack?.fightingStyle !== 'two-weapon' && abilityMod > 0) {
    extraDamageMod -= abilityMod
  }

  return { extraDamageMod, diceOverride }
}

/**
 * Calcula o bônus de ataque (para rolar 1d20 + bônus).
 *
 * @param {object} attack
 * @param {object} attributes
 * @param {number} profBonus
 * @returns {number}
 */
export function calculateWeaponAttackBonus(attack, attributes, profBonus) {
  const abilityKey = resolveAttackAbility(attack, attributes)
  const abilityMod = getModifier(attributes?.[abilityKey] ?? 10)
  const profMod    = attack?.proficient ? (profBonus ?? 0) : 0
  const magic      = Number(attack?.magicBonus ?? 0)
  const styleMod   = fightingStyleAttackBonus(attack)
  return abilityMod + profMod + magic + styleMod
}

/**
 * Calcula a expressão de dano (texto) somando dado + modificador + mágico
 * + ajustes de Fighting Style.
 *
 * @param {object} attack
 * @param {object} attributes
 * @param {object} [opts]
 * @param {boolean} [opts.versatileTwoHanded=false]
 * @returns {{ expression:string, modifier:number, dice:string }}
 */
export function calculateWeaponDamage(attack, attributes, { versatileTwoHanded = false } = {}) {
  const abilityKey = resolveAttackAbility(attack, attributes)
  const abilityMod = getModifier(attributes?.[abilityKey] ?? 10)
  const magic      = Number(attack?.magicBonus ?? 0)

  const { extraDamageMod, diceOverride } = fightingStyleDamageMods(
    attack, abilityMod, { versatileTwoHanded }
  )

  const modifier = abilityMod + magic + extraDamageMod
  const dice = diceOverride
    ?? ((versatileTwoHanded && attack?.versatileDice)
      ? attack.versatileDice
      : (attack?.damageDice || '1d4'))

  const sign   = modifier >= 0 ? '+' : '−'
  const absMod = Math.abs(modifier)
  const expression = modifier === 0 ? dice : `${dice} ${sign} ${absMod}`
  return { expression, modifier, dice }
}
