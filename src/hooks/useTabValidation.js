import { useState, useCallback, useMemo } from 'react'
import { ABILITY_SCORES } from '../utils/calculations'
import { SPELLCASTER_CLASSES } from '../domain/rules'

/**
 * IDs dos campos com erro, em ordem de prioridade.
 * Usados pelo botão "Revisar erros" para focar o primeiro campo inválido.
 */
export const ERROR_FIELD_IDS = {
  name:        'field-name',
  race:        'field-race',
  subrace:     'field-subrace',
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

/* ── Validadores puros por aba ────────────────────────────────────── */

function validateFicha(character, races = []) {
  const errors = {}
  const { info, attributes, combat } = character

  if (!info.name?.trim())
    errors.name = 'Nome é obrigatório'

  if (!info.race)
    errors.race = 'Raça é obrigatória'

  if (info.race && races.length > 0) {
    const selectedRace = races.find(r => r.index === info.race)
    if (selectedRace?.subraces?.length > 0 && !selectedRace.optionalSubrace && info.subrace === '')
      errors.subrace = `Sub-raça é obrigatória para ${selectedRace.name}`
  }

  if (!info.class)
    errors.class = 'Classe é obrigatória'

  const lvl = Number(info.level)
  if (Number.isNaN(lvl) || lvl < 1 || lvl > 20)
    errors.level = 'Nível deve estar entre 1 e 20'

  for (const { key, name } of ABILITY_SCORES) {
    const v = Number(attributes[key])
    if (Number.isNaN(v) || v < 3 || v > 20)
      errors[`attr_${key}`] = `${name}: valor deve estar entre 3 e 20`
  }

  if (Number(combat.armorClass) < 10)
    errors.armorClass = 'Classe de Armadura mínima é 10'

  if (Number(combat.maxHp) > 0 && Number(combat.currentHp) > Number(combat.maxHp))
    errors.currentHp = 'PV atual não pode exceder PV máximo'

  return errors
}

function validateMagias(character) {
  const errors = {}
  const cls = character.info.class?.toLowerCase()
  if (cls && SPELLCASTER_CLASSES.has(cls) && !character.spellcasting.ability) {
    errors.spellAbility = 'Defina o atributo de conjuração na aba Magias'
  }
  return errors
}

const TAB_VALIDATORS = {
  ficha:  (character, deps) => validateFicha(character, deps?.races),
  magias: (character)        => validateMagias(character),
}

/* ── Hook ─────────────────────────────────────────────────────────── */

/**
 * Validação por aba com memoização. Erros recomputados apenas quando
 * `character` ou `deps.races` mudam.
 */
export function useTabValidation(character, deps = {}) {
  const [touchedTabs, setTouchedTabs] = useState(() => new Set())

  const races = deps?.races
  // Extrai apenas o que importa para evitar recomputar quando deps é
  // um objeto novo em cada render com conteúdo equivalente.
  const allErrors = useMemo(() => {
    const out = {}
    for (const tabId of Object.keys(TAB_VALIDATORS)) {
      out[tabId] = TAB_VALIDATORS[tabId](character, { races })
    }
    return out
  }, [character, races])

  const validateTab = useCallback(tabId => allErrors[tabId] ?? {}, [allErrors])

  const getTabErrors = useCallback(tabId => {
    if (!touchedTabs.has(tabId)) return {}
    return allErrors[tabId] ?? {}
  }, [touchedTabs, allErrors])

  const markTouched = useCallback(tabId => {
    setTouchedTabs(prev => {
      if (prev.has(tabId)) return prev
      const next = new Set(prev)
      next.add(tabId)
      return next
    })
  }, [])

  const hasErrors = useCallback(
    tabId => Object.keys(allErrors[tabId] ?? {}).length > 0,
    [allErrors]
  )

  const focusFirstError = useCallback(tabId => {
    const errors = allErrors[tabId] ?? {}
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
  }, [allErrors])

  return {
    validateTab,
    getTabErrors,
    markTouched,
    hasErrors,
    focusFirstError,
  }
}
