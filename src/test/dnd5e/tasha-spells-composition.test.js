import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-spells-pt.json'), 'utf-8'))
const base = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-spells-pt.json'), 'utf-8'))

// Espelha o COMPOSED.spells do SrdProvider: concat PHB + Tasha.
const all = [...base, ...tasha]
const forClass = cls => all.filter(s => s.classes?.includes(cls)).map(s => s.index)

describe('composição PHB+Tasha — magias novas aparecem na classe certa', () => {
  it('o catálogo Tasha tem 21 magias e o composto não tem index duplicado', () => {
    expect(tasha).toHaveLength(21)
    const seen = new Set()
    for (const s of all) { expect(seen.has(s.index), `dup: ${s.index}`).toBe(false); seen.add(s.index) }
  })
  it('patrulheiro recebe as invocações de fera/feérico/elemental', () => {
    const p = forClass('patrulheiro')
    for (const i of ['invocar-fera', 'invocar-feerico', 'invocar-elemental']) expect(p).toContain(i)
  })
  it('clérigo/paladino recebem Invocar Celestial e Mortalha Espiritual', () => {
    expect(forClass('clerigo')).toContain('invocar-celestial')
    expect(forClass('paladino')).toContain('mortalha-espiritual')
  })
  it('artífice recebe os truques de lâmina/chicote e Beberagem Cáustica', () => {
    const a = forClass('artifice')
    for (const i of ['lamina-estrondosa', 'chicote-eletrico', 'beberagem-caustica']) expect(a).toContain(i)
  })
  it('mago recebe Lâmina do Desastre (9º) e Sonho do Véu Azul (7º)', () => {
    const m = forClass('mago')
    expect(m).toContain('lamina-do-desastre')
    expect(m).toContain('sonho-do-veu-azul')
  })
})
