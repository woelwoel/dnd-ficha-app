import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseSubclassFeatures, detectFeatureUses } from '../../systems/dnd5e/domain/subclassFeatures'

const choices = JSON.parse(readFileSync('public/srd-data/xanathar-class-choices-pt.json', 'utf8'))
// Opções de subclasse (exclui choices internas como invocações/disparos arcanos).
const NON_SUBCLASS = new Set(['eldritch_invocations', 'arcane_shots'])
const subclassOptions = Object.values(choices)
  .flatMap(c => c.choices ?? [])
  .filter(ch => !NON_SUBCLASS.has(ch.id))
  .flatMap(ch => ch.options ?? [])

describe('subclasses do xanathar-class-choices-pt.json', () => {
  it('toda subclasse parseia em features por nível', () => {
    expect(subclassOptions.length).toBeGreaterThan(0)
    for (const opt of subclassOptions) {
      const { summary, features } = parseSubclassFeatures(opt.desc)
      expect(summary.length, opt.value).toBeGreaterThan(20)
      expect(features.length, opt.value).toBeGreaterThanOrEqual(3)
      expect(features.every(f => f.level >= 1 && f.level <= 20), opt.value).toBe(true)
    }
  })
})

describe('caminhos XGE do bárbaro', () => {
  const barbaro = choices.barbaro?.choices.find(c => c.id === 'primal_path')
  it.each([['guardiao-ancestral'], ['arauto-da-tempestade'], ['fanatico']])(
    '%s parseia features em 3/6/10/14', (v) => {
    const opt = barbaro?.options.find(o => o.value === v)
    expect(opt, v).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [3, 6, 10, 14]) expect(levels, `${v} nv${lvl}`).toContain(lvl)
  })
})

describe('arquétipos XGE do guerreiro', () => {
  const g = () => choices.guerreiro?.choices
  it.each([['arqueiro-arcano'], ['cavaleiro'], ['samurai']])('%s parseia features', (v) => {
    const opt = g().find(c => c.id === 'martial_archetype').options.find(o => o.value === v)
    expect(opt, v).toBeTruthy()
    expect(parseSubclassFeatures(opt.desc).features.length, v).toBeGreaterThanOrEqual(3)
  })
  it('Disparos Arcanos: choice gated ao Arqueiro Arcano, escala por nível', () => {
    const shots = g().find(c => c.id === 'arcane_shots')
    expect(shots.requires).toEqual({ martial_archetype: 'arqueiro-arcano' })
    expect(shots.multiSelectByLevel['3']).toBe(2)
    expect(shots.multiSelectByLevel['18']).toBe(6)
    expect(shots.options.length).toBe(8)
    expect(shots.options.every(o => o.source === 'xanathar')).toBe(true)
  })
})

describe('tradições XGE do monge', () => {
  const monge = choices.monge?.choices.find(c => c.id === 'monastic_tradition')
  it.each([['mestre-bebado'], ['kensei'], ['alma-solar']])('%s parseia features em 3/6/11/17', (v) => {
    const opt = monge?.options.find(o => o.value === v)
    expect(opt, v).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [3, 6, 11, 17]) expect(levels, `${v} nv${lvl}`).toContain(lvl)
  })
})

describe('arquétipos XGE do ladino', () => {
  const ladino = choices.ladino?.choices.find(c => c.id === 'roguish_archetype')
  it.each([['inquiridor'], ['mentor'], ['batedor'], ['espadachim']])('%s parseia features em 3/9/13/17', (v) => {
    const opt = ladino?.options.find(o => o.value === v)
    expect(opt, v).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [3, 9, 13, 17]) expect(levels, `${v} nv${lvl}`).toContain(lvl)
  })
})

describe('círculos XGE do druida', () => {
  const druida = choices.druida?.choices.find(c => c.id === 'druid_circle')
  it.each([['sonhos'], ['pastor']])('%s parseia features em 2/6/10/14', (circle) => {
    const opt = druida?.options.find(o => o.value === circle)
    expect(opt, circle).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [2, 6, 10, 14]) expect(levels, `${circle} nv${lvl}`).toContain(lvl)
  })
})

describe('hexblade (O Lâmina Maldita)', () => {
  const patron = choices.bruxo.choices.find(c => c.id === 'patron')
  const hexblade = patron.options.find(o => o.value === 'hexblade')

  it('existe na choice patron do PHB (level 1)', () => {
    expect(patron.level).toBe(1)
    expect(hexblade).toBeTruthy()
  })

  it('tem features nos níveis 1, 6, 10 e 14', () => {
    const levels = parseSubclassFeatures(hexblade.desc).features.map(f => f.level)
    for (const lvl of [1, 6, 10, 14]) expect(levels, `nível ${lvl}`).toContain(lvl)
  })

  it('Maldição ganha tracker 1x/descanso curto', () => {
    // /maldição/ (não /maldi/, que casaria "Guerreiro Maldito" primeiro).
    const curse = parseSubclassFeatures(hexblade.desc).features.find(f => /maldição/i.test(f.name ?? ''))
    expect(curse, 'feature Maldição').toBeTruthy()
    expect(detectFeatureUses(`${curse.name}: ${curse.desc}`)).toMatchObject({ max: 1, recharge: 'short' })
  })
})
