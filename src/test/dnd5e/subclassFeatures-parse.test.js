// src/test/dnd5e/subclassFeatures-parse.test.js
import { describe, it, expect } from 'vitest'
import { parseSubclassFeatures } from '../../systems/dnd5e/domain/subclassFeatures'

describe('parseSubclassFeatures', () => {
  it('formato PHB limpo: bullets "Nv N — Nome: desc" viram features nomeadas', () => {
    const desc = [
      'Escola de Evocação — dano. Magos que destroem.',
      '',
      'Features por nível:',
      '• Nv 2 — Escriba Evocador: copiar magias de Evocação custa metade.',
      '• Nv 2 — Reformar Magia: protege aliados na área.',
      '• Nv 6 — Evocador Atento: soma mod. INT ao dano de uma criatura.',
      '• Nv 14 — Sobrecarga: 1×/desc. longo lança magia +2.',
    ].join('\n')
    const { summary, features } = parseSubclassFeatures(desc)
    expect(summary).toMatch(/Escola de Evocação/)
    expect(features).toHaveLength(4)
    expect(features[0]).toEqual({ level: 2, name: 'Escriba Evocador', desc: 'copiar magias de Evocação custa metade.' })
    expect(features[2]).toEqual({ level: 6, name: 'Evocador Atento', desc: 'soma mod. INT ao dano de uma criatura.' })
  })

  it('formato Tasha denso (sem "Nome:" curto): name = null, desc = bullet inteiro', () => {
    const desc = [
      'Algo nas profundezas fez um pacto com você.',
      'Features por nível:',
      '• Nv 1 — Lista Expandida de Magias (círculos 1–5). Tentáculo das Profundezas: ação bônus. Usos = bônus de proficiência.',
    ].join('\n')
    const { features } = parseSubclassFeatures(desc)
    expect(features).toHaveLength(1)
    expect(features[0].level).toBe(1)
    expect(features[0].name).toBeNull()
    expect(features[0].desc).toMatch(/Tentáculo das Profundezas/)
  })

  it('desc sem seção "Features por nível": features vazio, summary = tudo', () => {
    const { summary, features } = parseSubclassFeatures('Texto solto sem bullets.')
    expect(features).toEqual([])
    expect(summary).toBe('Texto solto sem bullets.')
  })
})
