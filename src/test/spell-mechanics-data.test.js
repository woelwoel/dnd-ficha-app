import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseDiceNotation, DAMAGE_TYPES_PT } from '../systems/dnd5e/domain/spellMechanics'
import { ABILITY_KEYS } from '../systems/dnd5e/domain/attributes'
import { findUncovered, loadSpellSources } from '../../scripts/gen-spell-mechanics.mjs'

const DATA = path.resolve(process.cwd(), 'public/srd-data')
const mech = JSON.parse(fs.readFileSync(path.join(DATA, 'spell-mechanics-pt.json'), 'utf8'))
const spells = loadSpellSources(DATA)
const byIndex = new Map(spells.map(s => [s.index, s]))

const ENTRY_KEYS = ['attack', 'save', 'damage', 'heal', 'upcast', 'cantripScaling', 'beams']
const entries = Object.entries(mech).filter(([k]) => k !== '_ignore')
const curated = entries.filter(([, v]) => !v._draft)

describe('spell-mechanics-pt.json — validacao integral (entradas curadas)', () => {
  it('todo index de entrada e de _ignore existe nas fontes', () => {
    const missing = [...entries.map(([k]) => k), ...(mech._ignore ?? [])].filter(k => !byIndex.has(k))
    expect(missing).toEqual([])
  })

  it('_ignore nao duplica entrada', () => {
    const dup = (mech._ignore ?? []).filter(k => mech[k])
    expect(dup).toEqual([])
  })

  // Loop único (não it.each: array vazio antes da curadoria quebraria o runner)
  it('todas as entradas curadas sao validas', () => {
    for (const [index, e] of curated) {
      const spell = byIndex.get(index)
      expect(Object.keys(e).filter(k => !ENTRY_KEYS.includes(k)), `${index}: chaves`).toEqual([])
      expect(Boolean(e.damage?.length || e.heal), `${index}: sem dano nem cura`).toBe(true)
      for (const pkt of e.damage ?? []) {
        expect(parseDiceNotation(pkt.dice), `${index}: dice ${pkt.dice}`).not.toBeNull()
        expect(DAMAGE_TYPES_PT, `${index}: type ${pkt.type}`).toContain(pkt.type)
        if ('addMod' in pkt) expect(typeof pkt.addMod, `${index}: addMod`).toBe('boolean')
      }
      if (e.heal) expect(parseDiceNotation(e.heal.dice), `${index}: heal.dice`).not.toBeNull()
      if (e.save) expect(ABILITY_KEYS, `${index}: save.ability`).toContain(e.save.ability)
      if (e.upcast) {
        const per = parseDiceNotation(e.upcast.perSlot)
        expect(per, `${index}: upcast.perSlot`).not.toBeNull()
        const target = e.damage?.length ? parseDiceNotation(e.damage[0].dice) : parseDiceNotation(e.heal.dice)
        expect(per.sides, `${index}: upcast de lados diferentes`).toBe(target.sides)
        expect(spell.level, `${index}: upcast em truque`).toBeGreaterThan(0)
        if ('perLevels' in e.upcast) {
          expect(Number.isInteger(e.upcast.perLevels) && e.upcast.perLevels >= 1, `${index}: perLevels`).toBe(true)
        }
      }
      if (e.cantripScaling) {
        expect(spell.level, `${index}: cantripScaling em magia com nivel`).toBe(0)
        expect(e.beams?.cantripScaling, `${index}: cantripScaling raiz E em beams`).toBeUndefined()
      }
      if (e.beams) {
        expect(e.beams.base, `${index}: beams.base`).toBeGreaterThanOrEqual(1)
        if (e.beams.perSlot) expect(e.upcast, `${index}: beams.perSlot E upcast.perSlot`).toBeUndefined()
        if (e.beams.cantripScaling) expect(spell.level, `${index}: beams.cantripScaling`).toBe(0)
      }
    }
  })

  it('arquivo 100% curado: nenhuma entrada _draft', () => {
    const pending = entries.filter(([, v]) => v._draft).map(([k]) => k)
    expect(pending).toEqual([])
  })
})

describe('guard-rail — cobertura de fontes', () => {
  it('nenhuma magia rolavel descoberta (mechanics ou _ignore)', () => {
    expect(findUncovered(spells, mech)).toEqual([])
  })
})
