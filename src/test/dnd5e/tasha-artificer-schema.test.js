import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (f) =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'public/srd-data', f), 'utf-8'))

describe('tasha — classe Artífice', () => {
  const classes = read('tasha-classes-pt.json')
  const prog = read('tasha-class-progression-pt.json')
  const choices = read('tasha-class-choices-pt.json')

  it('classe artifice presente, d8, saves CON+INT, conjuração INT, source tasha', () => {
    const a = classes.find((c) => c.index === 'artifice')
    expect(a).toBeTruthy()
    expect(a.hit_die).toBe(8)
    expect(a.source).toBe('tasha')
    expect(a.spellcasting_ability).toBe('Inteligência')
    expect(a.saving_throws).toEqual(expect.arrayContaining(['Constituição', 'Inteligência']))
    expect(a.skill_choices.count).toBe(2)
    expect(a.skill_choices.from.length).toBe(7)
  })

  it('progressão tem 20 níveis com features; sem spell_slots_table (engine calcula)', () => {
    expect(prog.artifice.levels).toHaveLength(20)
    expect(prog.artifice.levels[0].features.length).toBeGreaterThan(0) // nv1: Engenharia Mágica + Conjuração
    expect(prog.artifice).not.toHaveProperty('spell_slots_table')
    expect(prog.artifice.cantrips_known).toHaveLength(20)
  })

  it('escolha de subclasse no nível 3 com as 4 especializações', () => {
    const ch = choices.artifice.choices.find((c) => c.level === 3)
    expect(ch).toBeTruthy()
    expect(ch.id).toBe('artificer_specialization')
    expect(ch.options.map((o) => o.value).sort()).toEqual([
      'alquimista', 'armeiro', 'atirador', 'ferreiro-de-batalha',
    ])
    for (const o of ch.options) expect(o.desc.length).toBeGreaterThan(20)
  })

  it('descrições sem ruído de paginação nem artefatos de glifo', () => {
    const all = JSON.stringify({ classes, prog, choices })
    expect(all).not.toMatch(/-----\s*p\.\d+/)
    expect(all).not.toMatch(/Opções de Personagens/)
    expect(all).not.toMatch(/\bld\d/)   // 'ld8' (1 renderizado como l)
    expect(all).not.toMatch(/\+ l\b/)   // '+ l' (+1)
  })
})
