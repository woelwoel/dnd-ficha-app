import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const xge = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/xanathar-spells-pt.json'), 'utf-8'))
const phb = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-spells-pt.json'), 'utf-8'))
const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-spells-pt.json'), 'utf-8'))

const SCHOOLS = new Set([
  'evocação', 'transmutação', 'conjuração', 'abjuração',
  'encantamento', 'adivinhação', 'ilusão', 'necromancia',
])
const CLASSES = new Set([
  'artifice', 'barbaro', 'bardo', 'clerigo', 'druida', 'feiticeiro',
  'guerreiro', 'ladino', 'mago', 'monge', 'paladino', 'patrulheiro', 'bruxo',
])

describe('xanathar-spells — schema de toda entrada', () => {
  it('toda magia tem schema válido', () => {
    for (const s of xge) {
      expect(typeof s.index, `${s.name} index`).toBe('string')
      expect(s.index, s.name).toMatch(/^[a-z0-9-]+$/)
      expect(s.name.length, `${s.index} name`).toBeGreaterThan(2)
      expect(typeof s.level, `${s.index} level`).toBe('number')
      expect(s.level, `${s.index} level range`).toBeGreaterThanOrEqual(0)
      expect(s.level, `${s.index} level range`).toBeLessThanOrEqual(9)
      expect(SCHOOLS.has(s.school), `${s.index} escola inválida: ${s.school}`).toBe(true)
      expect(typeof s.ritual, `${s.index} ritual`).toBe('boolean')
      expect(typeof s.concentration, `${s.index} concentration`).toBe('boolean')
      expect(s.casting_time.length, `${s.index} casting`).toBeGreaterThan(0)
      expect(s.range.length, `${s.index} range`).toBeGreaterThan(0)
      expect(s.duration.length, `${s.index} duration`).toBeGreaterThan(0)
      expect(typeof s.components, `${s.index} components`).toBe('string')
      expect(typeof s.material, `${s.index} material`).toBe('string')
      expect(s.desc.length, `${s.index} desc curta`).toBeGreaterThan(40)
      expect(typeof s.higher_level, `${s.index} higher_level`).toBe('string')
      expect(s.source, `${s.index} source`).toBe('xanathar')
      expect(Array.isArray(s.classes) && s.classes.length > 0, `${s.index} sem classes`).toBe(true)
      for (const c of s.classes) expect(CLASSES.has(c), `${s.index} classe inválida: ${c}`).toBe(true)
    }
  })

  it('componentes só usam letras V/S/M', () => {
    for (const s of xge) {
      if (s.components) expect(s.components, s.index).toMatch(/^[VSM](,\s*[VSM])*$/)
    }
  })

  it('concentração ⇔ duração menciona "Concentração"', () => {
    for (const s of xge) {
      expect(s.concentration, `${s.index}: ${s.duration}`).toBe(/concentra/i.test(s.duration))
    }
  })
})

describe('xanathar-spells — integridade do catálogo', () => {
  it('tem exatamente 95 magias', () => {
    expect(xge).toHaveLength(95)
  })

  it('índices únicos dentro do arquivo', () => {
    const seen = new Set()
    for (const s of xge) { expect(seen.has(s.index), `dup: ${s.index}`).toBe(false); seen.add(s.index) }
  })

  it('nenhum índice colide com PHB nem Tasha', () => {
    const base = new Set([...phb, ...tasha].map(s => s.index))
    for (const s of xge) expect(base.has(s.index), `colisão: ${s.index}`).toBe(false)
  })
})

describe('xanathar-spells — composição/filtro por classe', () => {
  const all = [...phb, ...tasha, ...xge]
  const forClass = cls => all.filter(s => s.classes?.includes(cls)).map(s => s.index)

  it('feiticeiro recebe Raio de Caos; mago recebe Grito Psíquico', () => {
    expect(forClass('feiticeiro')).toContain('raio-de-caos')
    expect(forClass('mago')).toContain('grito-psiquico')
  })
  it('patrulheiro recebe Golpe de Zephyr e Ataque do Vento de Aço', () => {
    const p = forClass('patrulheiro')
    for (const i of ['golpe-de-zephyr', 'ataque-do-vento-de-aco']) expect(p).toContain(i)
  })
  it('clérigo recebe Arma Sagrada; paladino também', () => {
    expect(forClass('clerigo')).toContain('arma-sagrada')
    expect(forClass('paladino')).toContain('arma-sagrada')
  })
})
