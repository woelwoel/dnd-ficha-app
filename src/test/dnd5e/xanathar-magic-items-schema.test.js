import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const xge = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/xanathar-magic-items-pt.json'), 'utf-8'))
const phb = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-magic-items-pt.json'), 'utf-8'))
const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-magic-items-pt.json'), 'utf-8'))

const CATEGORIES = new Set(['item-maravilhoso', 'armadura', 'cajado', 'arma', 'varinha'])

describe('catálogo de itens mágicos comuns do XGE — schema', () => {
  it('tem os 48 itens comuns', () => {
    expect(xge.length).toBe(48)
  })

  it('cada item tem schema válido, é comum e NÃO grava source no cru', () => {
    for (const it of xge) {
      expect(it.index, `${it.index} não é kebab-case ASCII`).toMatch(/^[a-z0-9-]+$/)
      expect(typeof it.name, it.index).toBe('string')
      expect(it.name.length, it.index).toBeGreaterThan(3)
      expect(it.rarity, `${it.index}: raridade`).toBe('comum')
      expect(CATEGORIES.has(it.category), `${it.index}: category inválida "${it.category}"`).toBe(true)
      expect(typeof it.requiresAttunement, it.index).toBe('boolean')
      expect(it.description.length, `${it.index}: desc curta`).toBeGreaterThan(20)
      expect(it.source, `${it.index} grava source no cru`).toBeUndefined()
    }
  })

  it('índices únicos e sem colisão com PHB nem Tasha', () => {
    const idx = xge.map(i => i.index)
    expect(new Set(idx).size).toBe(idx.length)
    const base = new Set([...phb, ...tasha].map(i => i.index))
    for (const i of idx) expect(base.has(i), `${i} colide com catálogo base`).toBe(false)
  })

  it('alguns itens exigem sintonização e outros não', () => {
    const attune = xge.filter(i => i.requiresAttunement).map(i => i.index)
    expect(attune).toContain('amuleto-do-fragmento-negro')
    expect(attune.length).toBeGreaterThanOrEqual(5)
    expect(xge.some(i => !i.requiresAttunement)).toBe(true)
  })
})
