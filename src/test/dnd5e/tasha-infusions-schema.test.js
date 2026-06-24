import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const inf = JSON.parse(readFileSync(resolve(process.cwd(), 'public/srd-data/tasha-infusions-pt.json'), 'utf-8'))

describe('tasha-infusions-pt.json', () => {
  it('não vazio', () => {
    expect(Array.isArray(inf)).toBe(true)
    expect(inf.length).toBeGreaterThan(0)
  })

  it('campos por item', () => {
    for (const i of inf) {
      expect(i.index).toMatch(/^[a-z0-9-]+$/)
      expect(typeof i.name).toBe('string')
      expect(typeof i.desc).toBe('string')
      expect(i.desc.length).toBeGreaterThan(10)
      expect(Number.isInteger(i.prereq)).toBe(true)
      expect(i.source).toBe('tasha')
    }
  })

  it('índices únicos', () => {
    const ix = inf.map(i => i.index)
    expect(new Set(ix).size).toBe(ix.length)
  })

  it('sem ruído/glifo', () => {
    const s = JSON.stringify(inf)
    expect(s).not.toMatch(/-----\s*p\.\d+/)
    expect(s).not.toMatch(/\bld\d/)
    expect(s).not.toMatch(/\+ l\b/)
  })
})
