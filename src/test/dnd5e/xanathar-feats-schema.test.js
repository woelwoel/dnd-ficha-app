import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const feats = JSON.parse(readFileSync('public/srd-data/xanathar-feats-pt.json', 'utf8'))
const ATTRS = ['str', 'dex', 'con', 'int', 'wis', 'cha']
// Códigos válidos de raça/sub-raça do app (phb-races-pt.json).
const RACES = [
  'anao', 'elfo', 'halfling', 'humano', 'draconato', 'gnomo',
  'meio-elfo', 'meio-orc', 'tiefling',
  'anao-da-colina', 'anao-da-montanha', 'duergar',
  'alto-elfo', 'elfo-da-floresta', 'elfo-negro-drow',
  'pes-leves', 'robusto', 'gnomo-da-floresta', 'gnomo-das-rochas',
]

describe('xanathar-feats-pt.json — talentos raciais', () => {
  it('tem os 15 talentos raciais', () => expect(feats).toHaveLength(15))

  it('todos carimbados e com prereq de raca valido', () => {
    const seen = new Set()
    for (const f of feats) {
      expect(f.index, JSON.stringify(f)).toMatch(/^[a-z0-9-]+$/)
      expect(seen.has(f.index), f.index).toBe(false); seen.add(f.index)
      expect(f.name?.length, f.index).toBeGreaterThan(2)
      expect(f.desc?.length, f.index).toBeGreaterThan(50)
      expect(f.source, f.index).toBe('xanathar')
      expect(f.prereq?.type, f.index).toBe('race')
      expect(Array.isArray(f.prereq.races) && f.prereq.races.length > 0, f.index).toBe(true)
      expect(f.prereq.races.every(r => RACES.includes(r)), `${f.index}: ${f.prereq.races}`).toBe(true)
    }
  })

  it('attrBonus quando presente segue o schema', () => {
    for (const f of feats.filter(f => f.attrBonus)) {
      expect(f.attrBonus.amount, f.index).toBe(1)
      expect(f.attrBonus.choices.length, f.index).toBeGreaterThan(0)
      expect(f.attrBonus.choices.every(c => ATTRS.includes(c)), f.index).toBe(true)
    }
  })

  it('descs nao carregam ruido de OCR mecanico (ld4 etc.)', () => {
    for (const f of feats) {
      expect(f.desc, f.index).not.toMatch(/\bld\d/)
      expect(f.desc, f.index).not.toMatch(/Meio-[Oo]re\b/)
    }
  })
})
