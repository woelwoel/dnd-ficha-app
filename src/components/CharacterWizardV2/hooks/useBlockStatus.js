// src/components/CharacterWizardV2/hooks/useBlockStatus.js
import { useMemo } from 'react'
import { BLOCKS } from '../blocks-config'

const ATTR_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function statusOf(blockId, draft) {
  switch (blockId) {
    case 'race':
      return draft.race ? 'completo' : 'vazio'

    case 'class':
      return draft.class ? 'completo' : 'vazio'

    case 'background':
      return draft.background ? 'completo' : 'vazio'

    case 'attributes': {
      const vals = ATTR_KEYS.map(k => draft.baseAttributes?.[k] ?? 0)
      const filled = vals.filter(v => v > 0).length
      if (filled === 0) return 'vazio'
      if (filled === 6) return 'completo'
      return 'parcial'
    }

    case 'skills':
      return (draft.chosenSkills?.length ?? 0) > 0 ? 'completo' : 'vazio'

    case 'spells': {
      const total = (draft.spells?.length ?? 0) + (draft.bonusSpells?.length ?? 0)
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

export function getBlockStatus(blockId, draft) {
  if (blockId === 'review') {
    // Review fica bloqueado até todos os outros não-bloqueados estarem completos.
    const others = BLOCKS.filter(b => b.id !== 'review')
    const allReady = others.every(b => {
      const blocked = blockedBy(b.id, draft).length > 0
      if (blocked) return true   // bloqueado conta como "ainda não pronto, mas não impede"
      return statusOf(b.id, draft) === 'completo'
    })
    if (allReady) return { status: 'completo', missing: [], blockedBy: [] }
    return { status: 'bloqueado', missing: [], blockedBy: ['outros'] }
  }

  const bb = blockedBy(blockId, draft)
  if (bb.length > 0) {
    return { status: 'bloqueado', missing: [], blockedBy: bb }
  }
  return { status: statusOf(blockId, draft), missing: [], blockedBy: [] }
}

export function useBlockStatus(draft) {
  return useMemo(() => {
    const map = {}
    BLOCKS.forEach(b => { map[b.id] = getBlockStatus(b.id, draft) })
    return map
  }, [draft])
}
