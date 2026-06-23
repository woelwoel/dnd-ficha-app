// src/test/srd-combat-tags.test.js
import { describe, it, expect } from 'vitest'
import progression from '../../public/srd-data/phb-class-progression-pt.json'
import choices from '../../public/srd-data/phb-class-choices-pt.json'
import { COMBAT_TIERS, FEATURE_CATEGORIES } from '../systems/dnd5e/domain/featureCategories'

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

describe('âncoras de classe base', () => {
  const byName = (cls, name) => {
    for (const lvl of progression[cls].levels ?? [])
      for (const f of lvl.features ?? [])
        if (f.name.startsWith(name)) return f
    return null
  }

  const ESSENCIAL = [
    ['barbaro', 'Fúria'], ['barbaro', 'Ataque Extra'], ['barbaro', 'Crítico Brutal'],
    ['barbaro', 'Defesa Desarmada'],
    ['guerreiro', 'Estilo de Combate'], ['guerreiro', 'Ataque Extra'], ['guerreiro', 'Surto de Ação'],
    ['ladino', 'Ataque Furtivo'], ['ladino', 'Esquiva Instintiva'],
    ['paladino', 'Golpe Divino'], ['paladino', 'Ataque Extra'],
    ['monge', 'Artes Marciais'], ['monge', 'Golpe Atordoante'], ['monge', 'Ki'],
  ]
  const SITUACIONAL = [
    ['barbaro', 'Sentido de Perigo'], ['barbaro', 'Fúria Implacável'],
    ['guerreiro', 'Indomável'], ['ladino', 'Sentido Cego'], ['ladino', 'Mente Escorregadia'],
    ['paladino', 'Toque Purificador'], ['monge', 'Tranquilidade Mental'],
  ]
  const NAO_COMBATE = [
    ['barbaro', 'Força Indomável', undefined],
    ['paladino', 'Saúde Divina', 'defesa'], ['paladino', 'Sentido Divino', undefined],
    ['patrulheiro', 'Passo da Terra', 'exploracao'], ['patrulheiro', 'Inimigo Favorito', undefined],
    ['monge', 'Pureza de Corpo', 'defesa'],
  ]

  it.each(ESSENCIAL)('%s/%s é combate essencial', (cls, name) => {
    expect(byName(cls, name)?.combat).toBe('essencial')
  })
  it.each(SITUACIONAL)('%s/%s é combate situacional', (cls, name) => {
    expect(byName(cls, name)?.combat).toBe('situacional')
  })
  it.each(NAO_COMBATE)('%s/%s não é combate (category=%s)', (cls, name, cat) => {
    const f = byName(cls, name)
    expect(f?.combat).toBeUndefined()
    if (cat) expect(f?.category).toBe(cat)
  })
})

describe('âncoras de subclasse', () => {
  const opt = (cls, choiceId, value) =>
    (choices[cls].choices.find(c => c.id === choiceId)?.options ?? [])
      .find(o => o.value === value) ?? null

  it('Estilo de Combate / Defesa é combate essencial', () => {
    expect(opt('guerreiro', 'fighting_style', 'defesa')?.combat).toBe('essencial')
  })
  it('Estilo de Combate / Arqueiro é combate essencial', () => {
    expect(opt('guerreiro', 'fighting_style', 'arqueiro')?.combat).toBe('essencial')
  })
})
