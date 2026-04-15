import { useState, useCallback } from 'react'
import { ABILITY_SCORES } from '../utils/calculations'

/**
 * IDs dos campos com erro, em ordem de prioridade.
 * Usados pelo botão "Revisar erros" para focar o primeiro campo inválido.
 */
export const ERROR_FIELD_IDS = {
  name:        'field-name',
  race:        'field-race',
  class:       'field-class',
  level:       'field-level',
  attr_str:    'field-attr-str',
  attr_dex:    'field-attr-dex',
  attr_con:    'field-attr-con',
  attr_int:    'field-attr-int',
  attr_wis:    'field-attr-wis',
  attr_cha:    'field-attr-cha',
  armorClass:  'field-armorClass',
  currentHp:   'field-currentHp',
}

/* ── Validadores por aba ──────────────────────────────────────────── */

function validateFicha(character) {
  const errors = {}
  const { info, attributes, combat } = character

  // Informações básicas
  if (!info.name?.trim())
    errors.name = 'Nome é obrigatório'

  if (!info.race)
    errors.race = 'Raça é obrigatória'

  if (!info.class)
    errors.class = 'Classe é obrigatória'

  const lvl = Number(info.level)
  if (isNaN(lvl) || lvl < 1 || lvl > 20)
    errors.level = 'Nível deve estar entre 1 e 20'

  // Atributos: valor válido é 3–20 (point buy/array; 1-30 é técnico, mas 3-20 é o padrão de jogo)
  for (const { key, name } of ABILITY_SCORES) {
    const v = Number(attributes[key])
    if (isNaN(v) || v < 3 || v > 20)
      errors[`attr_${key}`] = `${name}: valor deve estar entre 3 e 20`
  }

  // Combate
  if (Number(combat.armorClass) < 10)
    errors.armorClass = 'Classe de Armadura mínima é 10'

  if (Number(combat.maxHp) > 0 && Number(combat.currentHp) > Number(combat.maxHp))
    errors.currentHp = 'PV atual não pode exceder PV máximo'

  return errors
}

// Slots de magia precisariam de dados assíncronos (5e-SRD-Levels.json),
// então a validação quantitativa é feita inline no componente Spells.
// Aqui apenas garantimos que, se a classe for conjuradora, o atributo de
// magia esteja definido.
function validateMagias(character) {
  const errors = {}
  const SPELLCASTERS = ['bard','cleric','druid','paladin','ranger','sorcerer','warlock','wizard']
  const cls = character.info.class?.toLowerCase()
  if (cls && SPELLCASTERS.includes(cls) && !character.spellcasting.ability) {
    errors.spellAbility = 'Defina o atributo de conjuração na aba Magias'
  }
  return errors
}

const TAB_VALIDATORS = {
  ficha:   validateFicha,
  magias:  validateMagias,
}

/* ── Hook ─────────────────────────────────────────────────────────── */

/**
 * Gerencia validação por aba.
 *
 * @param {object} character - estado completo do personagem
 * @returns {object}
 *   - validateTab(tabId)    : valida e retorna objeto de erros (sem mutar estado)
 *   - getTabErrors(tabId)   : retorna erros APENAS se a aba já foi "tocada"
 *   - markTouched(tabId)    : marca a aba como tocada (erros passam a ser exibidos)
 *   - isTabTouched(tabId)   : booleano
 *   - hasErrors(tabId)      : booleano — se a aba tem erros (independente de tocada)
 *   - focusFirstError(tabId): foca o primeiro campo inválido da aba no DOM
 */
export function useTabValidation(character) {
  // Abas que o usuário já tentou sair (validação visível)
  const [touchedTabs, setTouchedTabs] = useState(new Set())

  /** Executa a validação e retorna os erros, sem alterar estado */
  const validateTab = useCallback((tabId) => {
    const validator = TAB_VALIDATORS[tabId]
    if (!validator) return {}
    return validator(character)
  }, [character])

  /** Retorna erros apenas se a aba já foi tocada */
  const getTabErrors = useCallback((tabId) => {
    if (!touchedTabs.has(tabId)) return {}
    return validateTab(tabId)
  }, [touchedTabs, validateTab])

  /** Marca a aba como "tocada" — a partir daí os erros são exibidos */
  const markTouched = useCallback((tabId) => {
    setTouchedTabs(prev => {
      if (prev.has(tabId)) return prev
      return new Set([...prev, tabId])
    })
  }, [])

  const isTabTouched = useCallback((tabId) => touchedTabs.has(tabId), [touchedTabs])

  const hasErrors = useCallback((tabId) => {
    return Object.keys(validateTab(tabId)).length > 0
  }, [validateTab])

  /**
   * Foca e rola até o primeiro campo inválido da aba.
   * Usa os IDs definidos em ERROR_FIELD_IDS na ordem de prioridade.
   */
  const focusFirstError = useCallback((tabId) => {
    const errors = validateTab(tabId)
    for (const [key, fieldId] of Object.entries(ERROR_FIELD_IDS)) {
      if (errors[key]) {
        const el = document.getElementById(fieldId)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus?.()
          return
        }
      }
    }
  }, [validateTab])

  return {
    validateTab,
    getTabErrors,
    markTouched,
    isTabTouched,
    hasErrors,
    focusFirstError,
  }
}
