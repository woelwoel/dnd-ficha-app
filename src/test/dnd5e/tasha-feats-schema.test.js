import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Vitest roda a partir da raiz do repo, então o caminho relativo ao cwd resolve.
const feats = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/srd-data/tasha-feats-pt.json'), 'utf-8'),
)

describe('tasha-feats-pt.json', () => {
  it('não está vazio', () => {
    expect(Array.isArray(feats)).toBe(true)
    expect(feats.length).toBeGreaterThan(0)
  })

  it('todo item tem index, name, desc e source=tasha', () => {
    for (const f of feats) {
      expect(typeof f.index).toBe('string')
      expect(f.index).toMatch(/^[a-z0-9-]+$/)
      expect(typeof f.name).toBe('string')
      expect(typeof f.desc).toBe('string')
      expect(f.desc.length).toBeGreaterThan(10)
      expect(f.source).toBe('tasha')
    }
  })

  it('índices são únicos', () => {
    const idx = feats.map(f => f.index)
    expect(new Set(idx).size).toBe(idx.length)
  })

  it('prereq, quando presente, usa um type conhecido', () => {
    const known = new Set(['spellcasting', 'ability', 'ability_or', 'proficiency'])
    for (const f of feats.filter(f => f.prereq)) {
      expect(known.has(f.prereq.type)).toBe(true)
    }
  })

  it('attrBonus, quando presente, tem amount e choices de atributos válidos', () => {
    const attrs = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha'])
    for (const f of feats.filter(f => f.attrBonus)) {
      expect(typeof f.attrBonus.amount).toBe('number')
      expect(Array.isArray(f.attrBonus.choices)).toBe(true)
      expect(f.attrBonus.choices.length).toBeGreaterThan(0)
      for (const c of f.attrBonus.choices) expect(attrs.has(c)).toBe(true)
    }
  })

  it('descrições não carregam ruído de rodapé/paginação do PDF', () => {
    for (const f of feats) {
      expect(f.desc).not.toMatch(/Opções de Personagens/)
      expect(f.desc).not.toMatch(/-----\s*p\.\d+/)
      expect(f.desc.toLowerCase()).not.toContain('pré-requisito')
    }
  })
})
