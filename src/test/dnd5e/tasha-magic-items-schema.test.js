import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-magic-items-pt.json'), 'utf-8'))
const phb = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-magic-items-pt.json'), 'utf-8'))

const RARITIES = new Set(['comum', 'incomum', 'raro', 'muito-raro', 'lendario'])
const CATEGORIES = new Set(['item-maravilhoso', 'tatuagem'])

describe('catálogo de itens mágicos de Tasha — schema', () => {
  it('tem o fan-out completo (>= 35 itens)', () => {
    expect(tasha.length).toBeGreaterThanOrEqual(35)
  })

  it('cada item tem o schema certo, raridade/categoria válidas e SEM source no cru', () => {
    for (const it of tasha) {
      expect(typeof it.index, it.index).toBe('string')
      expect(it.index, `${it.index} não é kebab-case ASCII`).toMatch(/^[a-z0-9-]+$/)
      expect(typeof it.name).toBe('string')
      expect(RARITIES.has(it.rarity), `${it.index}: rarity inválida "${it.rarity}"`).toBe(true)
      expect(CATEGORIES.has(it.category), `${it.index}: category inválida "${it.category}"`).toBe(true)
      expect(typeof it.requiresAttunement, it.index).toBe('boolean')
      expect(it.description.length, it.index).toBeGreaterThan(40)
      expect(it.source, `${it.index} grava source no cru`).toBeUndefined()
    }
  })

  it('índices únicos e sem colisão com o catálogo PHB', () => {
    const idx = tasha.map(i => i.index)
    expect(new Set(idx).size).toBe(idx.length)
    const phbSet = new Set(phb.map(i => i.index))
    for (const i of idx) expect(phbSet.has(i), `${i} colide com PHB`).toBe(false)
  })

  it('inclui as 11 tatuagens de Tasha', () => {
    const tats = tasha.filter(i => i.category === 'tatuagem')
    expect(tats.length).toBe(11)
  })
})
