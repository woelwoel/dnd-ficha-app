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

const ENTRY_KEYS = ['attack', 'save', 'damage', 'heal', 'upcast', 'cantripScaling', 'beams', 'effect']
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
      expect(Boolean(e.damage?.length || e.heal || e.effect), `${index}: sem dano, cura nem efeito`).toBe(true)
      for (const pkt of e.damage ?? []) {
        expect(parseDiceNotation(pkt.dice), `${index}: dice ${pkt.dice}`).not.toBeNull()
        expect(DAMAGE_TYPES_PT, `${index}: type ${pkt.type}`).toContain(pkt.type)
        if ('addMod' in pkt) expect(typeof pkt.addMod, `${index}: addMod`).toBe('boolean')
      }
      if (e.heal) expect(parseDiceNotation(e.heal.dice), `${index}: heal.dice`).not.toBeNull()
      if (e.save) expect(ABILITY_KEYS, `${index}: save.ability`).toContain(e.save.ability)
      if (e.upcast) {
        expect(spell.level, `${index}: upcast em truque`).toBeGreaterThan(0)
        const packet = e.upcast.packet ?? 0
        const target = e.damage?.length ? parseDiceNotation(e.damage[packet]?.dice ?? '') : parseDiceNotation(e.heal.dice)
        expect(target, `${index}: upcast.packet fora dos pacotes`).not.toBeNull()
        if ('packet' in e.upcast) {
          expect(Number.isInteger(e.upcast.packet) && e.upcast.packet >= 0, `${index}: packet`).toBe(true)
          expect(e.damage?.length ?? 0, `${index}: packet sem damage`).toBeGreaterThan(e.upcast.packet)
        }
        if (e.upcast.tiers) {
          expect(e.upcast.perSlot, `${index}: tiers E perSlot`).toBeUndefined()
          expect(e.upcast.perLevels, `${index}: tiers E perLevels`).toBeUndefined()
          for (const [lvl, dice] of Object.entries(e.upcast.tiers)) {
            expect(Number(lvl), `${index}: tier ${lvl} abaixo do nivel base`).toBeGreaterThan(spell.level)
            const t = parseDiceNotation(dice)
            expect(t, `${index}: tier ${lvl} dice`).not.toBeNull()
            expect(t.sides, `${index}: tier ${lvl} de lados diferentes`).toBe(target.sides)
          }
        } else {
          const per = parseDiceNotation(e.upcast.perSlot)
          expect(per, `${index}: upcast.perSlot`).not.toBeNull()
          expect(per.sides, `${index}: upcast de lados diferentes`).toBe(target.sides)
          if ('perLevels' in e.upcast) {
            expect(Number.isInteger(e.upcast.perLevels) && e.upcast.perLevels >= 1, `${index}: perLevels`).toBe(true)
          }
        }
      }
      for (const pkt of e.damage ?? []) {
        if ('onHit' in pkt) {
          expect(typeof pkt.onHit, `${index}: onHit`).toBe('boolean')
          expect(Boolean(e.attack), `${index}: onHit sem attack`).toBe(true)
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
      if (e.effect) {
        const EF_KEYS = ['concentration', 'mods', 'riders', 'advantages', 'summary']
        const MOD_KEYS = ['ac', 'saves', 'saveAbility', 'speed', 'speedMultiplier']
        expect(Object.keys(e.effect).filter(k => !EF_KEYS.includes(k)), `${index}: effect chaves`).toEqual([])
        expect(typeof e.effect.summary === 'string' && e.effect.summary.length > 0, `${index}: effect.summary`).toBe(true)
        for (const k of Object.keys(e.effect.mods ?? {})) {
          expect(MOD_KEYS, `${index}: effect.mods.${k}`).toContain(k)
        }
        if (e.effect.mods?.speedMultiplier != null) {
          expect(e.effect.mods.speedMultiplier, `${index}: speedMultiplier`).toBeGreaterThanOrEqual(1)
        }
        for (const k of Object.keys(e.effect.mods?.saveAbility ?? {})) {
          expect(ABILITY_KEYS, `${index}: effect saveAbility ${k}`).toContain(k)
        }
        for (const r of e.effect.riders ?? []) {
          expect(parseDiceNotation(r.dice), `${index}: rider ${r.dice}`).not.toBeNull()
          expect(r.categories?.length, `${index}: rider sem categoria`).toBeGreaterThan(0)
          for (const c of r.categories) expect(['attack', 'save', 'check'], `${index}: rider cat ${c}`).toContain(c)
        }
        for (const a of e.effect.advantages ?? []) {
          for (const c of a.categories ?? []) expect(['attack', 'save', 'check'], `${index}: adv cat ${c}`).toContain(c)
          for (const ab of a.abilities ?? []) expect(ABILITY_KEYS, `${index}: adv ability ${ab}`).toContain(ab)
        }
      }
    }
  })

  it('arquivo 100% curado: nenhuma entrada _draft', () => {
    const pending = entries.filter(([, v]) => v._draft).map(([k]) => k)
    expect(pending).toEqual([])
  })

  it('buffs classicos tem effect curado', () => {
    for (const idx of ['bencao', 'escudo-da-fe', 'velocidade', 'orientacao', 'resistencia']) {
      expect(mech[idx]?.effect, `${idx}: sem effect`).toBeTruthy()
    }
  })
})

describe('fidelidade XGE — correcoes da auditoria 2026-07-14', () => {
  it('raio-de-caos: 2d8 + 1d6 do golpe (onHit), upcast +1d6 no d6', () => {
    expect(mech['raio-de-caos']).toEqual({
      attack: true,
      damage: [{ dice: '2d8', type: 'força' }, { dice: '1d6', type: 'força', onHit: true }],
      upcast: { perSlot: '1d6', packet: 1 },
    })
  })

  it('diabo-da-poeira: metade do dano no sucesso', () => {
    expect(mech['diabo-da-poeira'].save).toEqual({ ability: 'str', halfOnSuccess: true })
  })

  it('dragao-ilusorio: salvaguarda de Inteligencia', () => {
    expect(mech['dragao-ilusorio'].save.ability).toBe('int')
  })

  it('faca-de-gelo: upcast +1d6 no pacote de frio', () => {
    expect(mech['faca-de-gelo'].upcast).toEqual({ perSlot: '1d6', packet: 1 })
  })

  it('lamina-sombria: upcast por faixas de slot (3-4=3d8, 5-6=4d8, 7+=5d8)', () => {
    expect(mech['lamina-sombria'].upcast).toEqual({ tiers: { 3: '3d8', 5: '4d8', 7: '5d8' } })
  })
})

describe('guard-rail — cobertura de fontes', () => {
  it('nenhuma magia rolavel descoberta (mechanics ou _ignore)', () => {
    expect(findUncovered(spells, mech)).toEqual([])
  })
})
