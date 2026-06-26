import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const tasha = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/tasha-spells-pt.json'), 'utf-8'),
)
const base = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/phb-spells-pt.json'), 'utf-8'),
)

const SCHOOLS = new Set([
  'evocação', 'transmutação', 'conjuração', 'abjuração',
  'encantamento', 'adivinhação', 'ilusão', 'necromancia',
])
const CLASSES = new Set([
  'artifice', 'barbaro', 'bardo', 'clerigo', 'druida', 'feiticeiro',
  'guerreiro', 'ladino', 'mago', 'monge', 'paladino', 'patrulheiro', 'bruxo',
])
const byIndex = Object.fromEntries(tasha.map(s => [s.index, s]))

function expectValidSpell(idx) {
  const s = byIndex[idx]
  expect(s, `${idx} ausente`).toBeTruthy()
  expect(typeof s.name).toBe('string'); expect(s.name.length).toBeGreaterThan(2)
  expect(typeof s.level).toBe('number')
  expect(SCHOOLS.has(s.school), `${idx} escola inválida: ${s.school}`).toBe(true)
  expect(typeof s.ritual).toBe('boolean')
  expect(typeof s.concentration).toBe('boolean')
  expect(s.casting_time.length).toBeGreaterThan(0)
  expect(s.range.length).toBeGreaterThan(0)
  expect(s.duration.length).toBeGreaterThan(0)
  expect(typeof s.components).toBe('string')
  expect(typeof s.material).toBe('string')
  expect(s.desc.length, `${idx} desc curta`).toBeGreaterThan(40)
  expect(typeof s.higher_level).toBe('string')
  expect(s.source).toBe('tasha')
  expect(Array.isArray(s.classes) && s.classes.length > 0, `${idx} sem classes`).toBe(true)
  for (const c of s.classes) expect(CLASSES.has(c), `${idx} classe inválida: ${c}`).toBe(true)
}

describe('tasha-spells — schema de toda entrada', () => {
  it('toda magia do arquivo tem schema válido', () => {
    for (const s of tasha) expectValidSpell(s.index)
  })
  it('nenhum index de Tasha colide com o catálogo base', () => {
    const baseIdx = new Set(base.map(s => s.index))
    for (const s of tasha) expect(baseIdx.has(s.index), `colisão: ${s.index}`).toBe(false)
  })
  it('indices únicos dentro do arquivo Tasha', () => {
    const seen = new Set()
    for (const s of tasha) { expect(seen.has(s.index), `dup: ${s.index}`).toBe(false); seen.add(s.index) }
  })
})

describe('tasha-spells — magias não-invocação (Task 1)', () => {
  const ESPERADAS = [
    'chicote-eletrico', 'lamina-da-chama-esverdeada', 'lamina-estrondosa',
    'rompante-de-espadas', 'beberagem-caustica', 'chicote-mental',
    'fortaleza-intelectual', 'mortalha-espiritual', 'disfarce-sobrenatural',
    'sonho-do-veu-azul', 'lamina-do-desastre',
  ]
  for (const idx of ESPERADAS) {
    it(`${idx} presente e válida`, () => expectValidSpell(idx))
  }
})
