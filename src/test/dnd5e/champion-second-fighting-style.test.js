import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'
import { FIGHTING_STYLE_BY_VALUE } from '../../systems/dnd5e/domain/fightingStyles'

const phb = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/phb-class-choices-pt.json'), 'utf-8'),
)
const tasha = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'),
)

const choiceOf = (cat, cls, id) => cat[cls]?.choices.find(c => c.id === id)
const values = ch => (ch?.options ?? []).map(o => o.value).sort()

describe('Estilo de Combate Adicional do Campeão (guerreiro nv10)', () => {
  const segundo = choiceOf(phb, 'guerreiro', 'fighting_style_champion')

  it('existe como escolha de nível 10 travada no arquétipo Campeão', () => {
    expect(segundo).toBeDefined()
    expect(segundo.level).toBe(10)
    expect(segundo.requires).toEqual({ martial_archetype: 'campeao' })
    expect(segundo.featureName).toBe('Estilo de Combate Adicional')
  })

  it('não deixa repetir o estilo de nível 1', () => {
    expect(segundo.excludesOptionsOf).toBe('fighting_style')
  })

  it('oferece exatamente os mesmos estilos do PHB de nível 1', () => {
    expect(values(segundo)).toEqual(values(choiceOf(phb, 'guerreiro', 'fighting_style')))
  })

  it('com Tasha ativa, herda também os estilos de Tasha', () => {
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    expect(values(choiceOf(merged, 'guerreiro', 'fighting_style_champion')))
      .toEqual(values(choiceOf(merged, 'guerreiro', 'fighting_style')))
  })

  it('os estilos com mecânica continuam mapeados no resolvedor', () => {
    const comMecanica = (segundo.options ?? []).filter(o => FIGHTING_STYLE_BY_VALUE[o.value])
    expect(comMecanica.length).toBeGreaterThanOrEqual(4)
  })

  it('toda opção tem descrição legível', () => {
    for (const o of segundo.options) {
      expect(o.name, o.value).toBeTruthy()
      expect(o.desc?.length ?? 0, o.value).toBeGreaterThan(40)
    }
  })
})
