import { useMemo } from 'react'
import {
  getModifier,
  formatModifier,
  getProficiencyBonus,
  calculateMaxHp,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  calculatePassivePerception,
} from '../utils/calculations'

/**
 * Mapeia abreviações PT-BR do atributo de magia para a chave
 * usada no objeto character.attributes
 */
const SPELL_ABILITY_TO_KEY = {
  INT: 'int',
  SAB: 'wis',
  CAR: 'cha',
  FOR: 'str',
  DES: 'dex',
  CON: 'con',
}

/**
 * Hook de cálculos reativos da ficha.
 *
 * @param {object} character - objeto completo do personagem (do useCharacter)
 * @param {object|null} classData - dados da classe do SRD (para calcular HP sugerido)
 * @returns {object} todos os valores derivados, recalculados quando as dependências mudam
 *
 * Valores retornados:
 * - profBonus       : bônus de proficiência pelo nível
 * - mods            : objeto {str, dex, con, int, wis, cha} com os 6 modificadores
 * - suggestedAC     : CA sugerida = 10 + mod DES (sem armadura)
 * - suggestedMaxHp  : PV máximo calculado pela classe/CON (null se classData não disponível)
 * - initiative      : mod DES (iniciativa padrão)
 * - spellSaveDC     : CD da magia (null se sem atributo de magia)
 * - spellAttackBonus: bônus de ataque de magia (null se sem atributo de magia)
 * - savingThrows    : objeto com os 6 valores de salvaguarda calculados
 * - passivePerception: percepção passiva (10 + mod SAB + prof se proficiente)
 * - hpPercent       : PV atual como % do máximo (para barra de vida)
 * - spellAbilityKey : chave do atributo de magia ('int', 'wis', etc.) ou null
 * - fmt             : função de formatação de modificador (+2, -1, etc.)
 * - calcMod         : função pura getModifier, para cálculos pontuais em componentes
 */
export function useCharacterCalculations(character, classData = null) {
  const { attributes, info, spellcasting, proficiencies, combat } = character

  // Dependências explícitas para o useMemo — evita recalcular por referências de objeto
  const level        = info?.level ?? 1
  const spellAbilityLabel = spellcasting?.ability ?? null
  const saves        = proficiencies?.savingThrows
  const skills       = proficiencies?.skills
  const currentHp    = combat?.currentHp ?? 0
  const maxHp        = combat?.maxHp ?? 0
  const { str = 10, dex = 10, con = 10, int = 10, wis = 10, cha = 10 } = attributes ?? {}

  return useMemo(() => {
    // ── Bônus de proficiência ──────────────────────────────────────
    const profBonus = getProficiencyBonus(level)

    // ── Modificadores dos 6 atributos ─────────────────────────────
    const mods = {
      str: getModifier(str),
      dex: getModifier(dex),
      con: getModifier(con),
      int: getModifier(int),
      wis: getModifier(wis),
      cha: getModifier(cha),
    }

    // ── CA sugerida (sem armadura: 10 + DES) ──────────────────────
    const suggestedAC = 10 + mods.dex

    // ── HP máximo sugerido (precisa do dado de vida da classe) ─────
    const suggestedMaxHp = classData
      ? calculateMaxHp(classData, level, con)
      : null

    // ── Iniciativa (mod DES) ──────────────────────────────────────
    const initiative = mods.dex

    // ── Atributo de magia → chave do objeto attributes ────────────
    const spellAbilityKey = spellAbilityLabel
      ? (SPELL_ABILITY_TO_KEY[spellAbilityLabel] ?? null)
      : null

    const spellScore = spellAbilityKey ? (attributes?.[spellAbilityKey] ?? 10) : 10

    // ── Magia: CD e bônus de ataque ───────────────────────────────
    const spellSaveDC = spellAbilityKey
      ? calculateSpellSaveDC(spellScore, profBonus)
      : null

    const spellAttackBonus = spellAbilityKey
      ? calculateSpellAttackBonus(spellScore, profBonus)
      : null

    // ── Salvaguardas dos 6 atributos ──────────────────────────────
    const savingThrows = {}
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const isProficient = saves?.includes(key) ?? false
      savingThrows[key] = mods[key] + (isProficient ? profBonus : 0)
    }

    // ── Percepção passiva ─────────────────────────────────────────
    const isPerceptionProficient = skills?.includes('perception') ?? false
    const passivePerception = calculatePassivePerception(wis, profBonus, isPerceptionProficient)

    // ── Porcentagem de PV atual ───────────────────────────────────
    const hpPercent = maxHp > 0
      ? Math.min(100, Math.round((currentHp / maxHp) * 100))
      : 0

    // ── Cor da barra de PV ────────────────────────────────────────
    const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444'

    return {
      profBonus,
      mods,
      suggestedAC,
      suggestedMaxHp,
      initiative,
      spellSaveDC,
      spellAttackBonus,
      savingThrows,
      passivePerception,
      hpPercent,
      hpColor,
      spellAbilityKey,
      // Helpers exportados para uso pontual em componentes
      fmt:     formatModifier,
      calcMod: getModifier,
    }
  }, [level, str, dex, con, int, wis, cha, spellAbilityLabel, saves, skills, currentHp, maxHp, classData])
}
