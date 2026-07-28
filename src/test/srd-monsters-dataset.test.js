import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

describe('dataset de monstros no SrdProvider', () => {
  it('está registrado como lazy e aponta pro arquivo SRD', () => {
    const src = readFileSync('src/systems/dnd5e/data/SrdProvider.jsx', 'utf8')
    expect(src).toMatch(/monsters:\s*\{\s*pt:\s*'5e-SRD-Monsters\.json'[^}]*lazy:\s*true/)
  })

  it('o arquivo existe e tem os campos que a conta de dificuldade usa', () => {
    const list = JSON.parse(readFileSync('public/srd-data/5e-SRD-Monsters.json', 'utf8'))
    expect(list.length).toBeGreaterThan(300)
    const goblin = list.find(m => m.index === 'goblin')
    expect(goblin).toMatchObject({ xp: 50 })
    expect(goblin.armor_class[0].value).toBe(15)
  })
})
