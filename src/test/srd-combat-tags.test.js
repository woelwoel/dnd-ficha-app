// src/test/srd-combat-tags.test.js
import { describe, it, expect } from 'vitest'
import progression from '../../public/srd-data/phb-class-progression-pt.json'
import choices from '../../public/srd-data/phb-class-choices-pt.json'
import { COMBAT_TIERS, FEATURE_CATEGORIES } from '../domain/featureCategories'

const VALID_ACTION_TYPES = ['ação', 'ação bônus', 'reação', 'passiva']

function allBaseFeatures() {
  const out = []
  for (const [cls, data] of Object.entries(progression)) {
    for (const lvl of data.levels ?? []) {
      for (const f of lvl.features ?? []) out.push({ cls, ...f })
    }
  }
  return out
}

function allChoiceOptions() {
  const out = []
  for (const [cls, data] of Object.entries(choices)) {
    for (const ch of data.choices ?? []) {
      for (const o of ch.options ?? []) out.push({ cls, choice: ch.id, ...o })
    }
  }
  return out
}

describe('integridade das marcações de combate', () => {
  it('toda feature/opção usa combat/category/actionType válidos (ou ausentes)', () => {
    const bad = []
    for (const f of [...allBaseFeatures(), ...allChoiceOptions()]) {
      if (f.combat !== undefined && !COMBAT_TIERS.includes(f.combat))
        bad.push(`combat inválido "${f.combat}" em ${f.cls}/${f.name}`)
      if (f.category !== undefined && !FEATURE_CATEGORIES.includes(f.category))
        bad.push(`category inválida "${f.category}" em ${f.cls}/${f.name}`)
      if (f.actionType !== undefined && !VALID_ACTION_TYPES.includes(f.actionType))
        bad.push(`actionType inválido "${f.actionType}" em ${f.cls}/${f.name}`)
      if (f.combat !== undefined && f.category !== undefined)
        bad.push(`combat E category juntos em ${f.cls}/${f.name} (mutuamente exclusivos)`)
    }
    expect(bad).toEqual([])
  })
})
