import { useCallback, useMemo } from 'react'
import { ABILITY_SCORES } from '../utils/calculations'
import { SPELLCASTER_CLASSES } from '../domain/rules'

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

  // Faixa alinhada ao editor de atributo da ficha v2 (1–30): itens e efeitos
  // do 5e passam de 20 (Manopla da Força de Ogro, tomos), e o mínimo de 3 só
  // vale para rolagem de criação, não para uma ficha em jogo.
  for (const { key, name } of ABILITY_SCORES) {
    const v = Number(attributes[key])
    if (Number.isNaN(v) || v < 1 || v > 30)
      errors[`attr_${key}`] = `${name}: valor deve estar entre 1 e 30`
  }

  // CA pode ser qualquer valor não-negativo. (Antes travava em ≥10, mas no
  // 5e existem efeitos/itens que reduzem temporariamente abaixo disso, e o
  // usuário deve poder editar livremente.)
  if (Number(combat.armorClass) < 0)
    errors.armorClass = 'Classe de Armadura não pode ser negativa'

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

  // Alias histórico de `validateTab`. Já filtrou por "abas tocadas", gate que
  // só o layout v1 alimentava — sem ele os erros nunca apareciam no v2.
  const getTabErrors = validateTab

  return {
    validateTab,
    getTabErrors,
  }
}
