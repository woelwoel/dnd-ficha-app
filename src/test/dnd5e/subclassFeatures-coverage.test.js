// src/test/dnd5e/subclassFeatures-coverage.test.js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseSubclassFeatures } from '../../systems/dnd5e/domain/subclassFeatures'

const read = f => JSON.parse(fs.readFileSync(path.resolve('public/srd-data', f), 'utf-8'))
const SUB_IDS = new Set(['primal_path','bard_college','divine_domain','druid_circle',
  'martial_archetype','monastic_tradition','sacred_oath','ranger_archetype',
  'roguish_archetype','sorcerous_origin','arcane_tradition','patron','artificer_specialization'])

function subclassOptions() {
  const out = []
  for (const file of ['phb-class-choices-pt.json','tasha-class-choices-pt.json']) {
    const cat = read(file)
    for (const cls of Object.keys(cat))
      for (const ch of cat[cls].choices ?? [])
        if (SUB_IDS.has(ch.id))
          for (const o of ch.options ?? []) out.push({ cls, id: ch.id, value: o.value, desc: o.desc })
  }
  return out
}

describe('parseSubclassFeatures — cobertura das 70 opções reais', () => {
  it('toda opção de subclasse produz ≥1 feature sem desc vazia', () => {
    const bad = []
    for (const o of subclassOptions()) {
      const { features } = parseSubclassFeatures(o.desc)
      if (features.length === 0) { bad.push(`${o.cls}/${o.value}: 0 features`); continue }
      for (const f of features)
        if (!f.desc || !f.desc.trim() || !Number.isInteger(f.level) || f.level < 1 || f.level > 20)
          bad.push(`${o.cls}/${o.value}: feature inválida (nv ${f.level})`)
    }
    expect(bad).toEqual([])
  })
})
