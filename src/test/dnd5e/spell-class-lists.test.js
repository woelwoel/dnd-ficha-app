import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Guarda das listas de classe das magias (`classes` no catálogo PT).
 *
 * O catálogo PT nasceu do SRD 5.1, que ENXUGA algumas listas: Fogo das Fadas,
 * por exemplo, aparece lá só como magia de druida, apesar de ser magia de bardo
 * desde sempre no PHB (p.239). Quem regenerar o JSON a partir do SRD perde a
 * correção de novo — daí este teste.
 *
 * Só entram aqui casos VERIFICADOS contra o PHB, um por linha, com o motivo.
 */
const SPELLS = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'public/srd-data/phb-spells-pt.json'), 'utf-8'),
)

const byIndex = idx => SPELLS.find(s => s.index === idx)

/* Magias de bardo que o SRD não carimba como tal (PHB, lista do Bardo p.209). */
const BARDO_FALTANTES = [
  ['fogo-das-fadas',         'Fogo das Fadas — nv 1, lista do Bardo e do Druida (PHB p.239)'],
  ['forjar-morte',           'Fingir Morte — nv 3, lista do Bardo (PHB p.240)'],
  ['espada-de-mordenkainen', 'Espada de Mordenkainen — nv 7, lista do Bardo (PHB p.257)'],
]

describe('listas de classe do catálogo de magias', () => {
  it.each(BARDO_FALTANTES)('%s é magia de bardo', (index, motivo) => {
    const spell = byIndex(index)
    expect(spell, `${index} sumiu do catálogo`).toBeTruthy()
    expect(spell.classes, motivo).toContain('bardo')
  })

  it('nenhuma magia lista uma classe repetida', () => {
    const repetidas = SPELLS
      .filter(s => new Set(s.classes ?? []).size !== (s.classes ?? []).length)
      .map(s => s.index)
    expect(repetidas).toEqual([])
  })
})
