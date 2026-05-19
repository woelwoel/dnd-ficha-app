// src/components/CharacterWizardV2/hooks/useBlockStatus.js
import { useMemo } from 'react'
import { BLOCKS } from '../blocks-config'
import { getRaceRequirements } from '../blocks/race-helpers'
import {
  isASIChoiceComplete, isChoiceDone,
  getLeveledChoices, computeBonusCantripsNeeded, getASILevels,
} from '../blocks/class-helpers'
import { allPicksDone } from '../blocks/class/equipment-helpers'

const ATTR_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function statusOf(blockId, draft, srdData = {}) {
  switch (blockId) {
    case 'race': {
      if (!draft.race) return 'vazio'
      const reqs = getRaceRequirements(draft, null, null)
      if (reqs.draconicAncestry && !draft.draconicAncestry) return 'parcial'
      if (reqs.highElfCantrip && !draft.racialCantrip) return 'parcial'
      if (reqs.freeAbility > 0 && (draft.racialAbilityChoices?.length ?? 0) < reqs.freeAbility) return 'parcial'
      if (reqs.racialSkills > 0 && (draft.racialSkills?.length ?? 0) < reqs.racialSkills) return 'parcial'
      return 'completo'
    }

    case 'class': {
      if (!draft.class) return 'vazio'
      const { classChoices, classProgression, classEquipment } = srdData
      // Sem dados SRD, considera completo (PR 1 fallback).
      if (!classChoices && !classProgression && !classEquipment) return 'completo'

      const leveledChoices = getLeveledChoices(classChoices?.[draft.class], draft.level ?? 1, draft.chosenFeatures)
      const allChoicesDone = leveledChoices.every(c =>
        isChoiceDone(c, draft.chosenFeatures?.[c.id])
      )
      if (!allChoicesDone) return 'parcial'

      const asiLevels = getASILevels(classProgression?.[draft.class], draft.level ?? 1)
      const allASIDone = asiLevels.every(l => isASIChoiceComplete(draft.asiChoices?.[l]))
      if (!allASIDone) return 'parcial'

      const bonusNeeded = computeBonusCantripsNeeded(leveledChoices, draft.chosenFeatures ?? {})
      const bonusGiven = draft.bonusSpells?.length ?? 0
      if (bonusGiven < bonusNeeded) return 'parcial'

      if (classEquipment) {
        const eqData = classEquipment[draft.class]
        const mode = draft.classEquipmentChoice ?? 'equipment'
        if (mode === 'equipment' && eqData) {
          const totalChoices = eqData.choices?.length ?? 0
          const doneChoices = (eqData.choices ?? []).filter(c =>
            !!draft.classEquipmentChoices?.[c.id]
          ).length
          if (doneChoices < totalChoices) return 'parcial'
          if (!allPicksDone(eqData, draft.classEquipmentChoices ?? {}, draft.classEquipmentPicks ?? {})) return 'parcial'
        }
        if (mode === 'gold' && (draft.classStartingGold ?? 0) === 0) return 'parcial'
      }

      return 'completo'
    }

    case 'background':
      return draft.background ? 'completo' : 'vazio'

    case 'attributes': {
      const vals = ATTR_KEYS.map(k => draft.baseAttributes?.[k] ?? 0)
      const filled = vals.filter(v => v > 0).length
      if (filled === 0) return 'vazio'
      if (filled === 6) return 'completo'
      return 'parcial'
    }

    case 'skills': {
      const chosen = draft.chosenSkills?.length ?? 0
      const { classes } = srdData
      if (!classes) return chosen > 0 ? 'completo' : 'vazio'
      const cls = classes.find(c => c.index === draft.class)
      const limit = cls?.skill_choices?.count ?? null
      if (limit == null) return chosen > 0 ? 'completo' : 'vazio'
      if (chosen === 0) return 'vazio'
      if (chosen < limit) return 'parcial'
      return 'completo'
    }

    case 'spells': {
      const total = (draft.spells?.length ?? 0) + (draft.bonusSpells?.length ?? 0)
      // Classes que ganham magias só em níveis mais altos — completo automático
      const NON_CASTERS_WITH_DELAYED_SPELLS = new Set(['paladino', 'patrulheiro'])
      if (NON_CASTERS_WITH_DELAYED_SPELLS.has(draft.class)) return 'completo'
      const { classes } = srdData
      if (classes) {
        const cls = classes.find(c => c.index === draft.class)
        if (cls && !cls.spellcasting_ability) return 'completo'
      }
      return total > 0 ? 'completo' : 'vazio'
    }

    case 'concept':
      return draft.name?.trim() ? 'completo' : 'vazio'

    case 'review':
      // tratado abaixo (precisa olhar todos os outros)
      return 'vazio'

    default:
      return 'vazio'
  }
}

function blockedBy(blockId, draft) {
  switch (blockId) {
    case 'attributes':
      return draft.race ? [] : ['race']
    case 'skills': {
      const list = []
      if (!draft.class) list.push('class')
      if (!draft.background) list.push('background')
      return list
    }
    case 'spells':
      return draft.class ? [] : ['class']
    default:
      return []
  }
}

export function getBlockStatus(blockId, draft, srdData = {}) {
  if (blockId === 'review') {
    // Review fica bloqueado até todos os outros não-bloqueados estarem completos.
    const others = BLOCKS.filter(b => b.id !== 'review')
    const allReady = others.every(b => {
      const blocked = blockedBy(b.id, draft).length > 0
      if (blocked) return true   // bloqueado conta como "ainda não pronto, mas não impede"
      return getBlockStatus(b.id, draft, srdData).status === 'completo'
    })
    if (allReady) return { status: 'completo', missing: [], blockedBy: [] }
    return { status: 'bloqueado', missing: [], blockedBy: ['outros'] }
  }

  const bb = blockedBy(blockId, draft)
  if (bb.length > 0) {
    return { status: 'bloqueado', missing: [], blockedBy: bb }
  }
  return { status: statusOf(blockId, draft, srdData), missing: [], blockedBy: [] }
}

export function useBlockStatus(draft, srdData = {}) {
  return useMemo(() => {
    const map = {}
    BLOCKS.forEach(b => { map[b.id] = getBlockStatus(b.id, draft, srdData) })
    return map
  }, [draft, srdData])
}
