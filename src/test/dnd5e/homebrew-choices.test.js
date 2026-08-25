import { describe, it, expect } from 'vitest'
import choices from '../../../public/srd-data/homebrew-class-choices-pt.json'
import { RITES, bloodCursesKnown } from '../../systems/dnd5e/domain/bloodHunter'
import { FIGHTING_STYLE_BY_VALUE } from '../../systems/dnd5e/domain/fightingStyles'

describe('escolhas do Caçador de Sangue', () => {
  const lista = choices['cacador-de-sangue'].choices
  const por = id => lista.find(c => c.id === id)

  it('oferece os três Rituais Primais a partir do 1º nível', () => {
    const c = por('cacador_de_sangue_primal_rite')
    expect(c.level).toBe(1)
    expect(c.options.map(o => o.value).sort()).toEqual(['chamas', 'congelamento', 'tempestade'])
  })

  it('escala os Rituais Primais no 6º e no 11º níveis', () => {
    expect(por('cacador_de_sangue_primal_rite').multiSelectByLevel)
      .toEqual({ 1: 1, 6: 2, 11: 3 })
  })

  it('só abre os Rituais Esotéricos no 14º nível', () => {
    const c = por('cacador_de_sangue_esoteric_rite')
    expect(c.level).toBe(14)
    expect(c.options.map(o => o.value).sort()).toEqual(['eter', 'morto', 'rugido'])
  })

  /** Chave de rito fora do catálogo faria o painel do rito não achar o dano. */
  it('usa exatamente as chaves de rito que o domínio conhece', () => {
    const todos = [
      ...por('cacador_de_sangue_primal_rite').options,
      ...por('cacador_de_sangue_esoteric_rite').options,
    ]
    for (const o of todos) {
      expect(RITES[o.value], `rito desconhecido: ${o.value}`).toBeDefined()
    }
  })

  it('oferece os quatro Estilos de Luta no 2º nível', () => {
    const c = por('cacador_de_sangue_fighting_style')
    expect(c.level).toBe(2)
    expect(c.options).toHaveLength(4)
  })

  /**
   * O JSON grava a chave em PT (`arqueiro`), que `FIGHTING_STYLE_BY_VALUE`
   * traduz para a chave de motor. Valor fora desse mapa é aceito em silêncio
   * pela UI e simplesmente não soma nada no ataque.
   */
  it('usa chaves de Estilo de Luta que o motor sabe traduzir', () => {
    for (const o of por('cacador_de_sangue_fighting_style').options) {
      expect(FIGHTING_STYLE_BY_VALUE[o.value], `estilo desconhecido: ${o.value}`).toBeDefined()
    }
  })

  it('lista as oito maldições de sangue, cada uma com o parágrafo de amplificação', () => {
    const c = por('cacador_de_sangue_blood_curses')
    expect(c.level).toBe(2)
    expect(c.options).toHaveLength(8)
    for (const o of c.options) {
      expect(o.desc, o.name).toMatch(/Amplifique:/)
    }
  })

  /** A escala do picker tem de bater com a regra em `bloodHunter.js`. */
  it('escala as maldições conhecidas igual ao domínio', () => {
    const byLevel = por('cacador_de_sangue_blood_curses').multiSelectByLevel
    for (const [nivel, quantas] of Object.entries(byLevel)) {
      expect(bloodCursesKnown(Number(nivel)), `nível ${nivel}`).toBe(quantas)
    }
    expect(Object.keys(byLevel).map(Number)).toEqual([2, 5, 9, 13, 16, 20])
  })

  it('mostra as quatro Ordens no 3º nível', () => {
    const c = por('cacador_de_sangue_order')
    expect(c.level).toBe(3)
    expect(c.options.map(o => o.value).sort()).toEqual(
      ['alma-profana', 'cacador-de-espectros', 'licantropo', 'mutante']
    )
  })
})
