import { describe, it, expect } from 'vitest'
import { getFightingStyles, hasFightingStyle } from '../../systems/dnd5e/domain/fightingStyles'

/**
 * Estilos de Combate (PHB p.72) — resolvedor.
 *
 * A escolha do wizard mora em `info.chosenFeatures` sob ids/valores em
 * português (`fighting_style`, `fighting_style_paladin`,
 * `fighting_style_ranger` × `defesa`, `arqueiro`, ...). O motor de CA e de
 * ataques fala inglês. Este resolvedor é a ponte.
 */
function char({ cls = 'paladino', level = 2, chosen = {}, multiclasses = [] } = {}) {
  return {
    info: { class: cls, level, chosenFeatures: chosen, multiclasses },
  }
}

describe('getFightingStyles', () => {
  it('traduz a escolha do paladino (fighting_style_paladin)', () => {
    expect(getFightingStyles(char({ chosen: { fighting_style_paladin: 'defesa' } })))
      .toEqual(['defense'])
  })

  it('traduz a escolha do guerreiro (fighting_style)', () => {
    expect(getFightingStyles(char({ cls: 'guerreiro', chosen: { fighting_style: 'arqueiro' } })))
      .toEqual(['archery'])
  })

  it('traduz a escolha do patrulheiro (fighting_style_ranger)', () => {
    const c = char({ cls: 'patrulheiro', chosen: { fighting_style_ranger: 'duas_maos' } })
    expect(getFightingStyles(c)).toEqual(['two-weapon'])
  })

  it('traduz duelo e grande arma', () => {
    expect(getFightingStyles(char({ chosen: { fighting_style_paladin: 'duelo' } })))
      .toEqual(['dueling'])
    expect(getFightingStyles(char({ chosen: { fighting_style_paladin: 'grande_arma' } })))
      .toEqual(['great-weapon'])
  })

  it('lê também o chosenFeatures de cada multiclasse', () => {
    const c = char({
      cls: 'guerreiro',
      chosen: { fighting_style: 'defesa' },
      multiclasses: [{ class: 'paladino', level: 2, chosenFeatures: { fighting_style_paladin: 'duelo' } }],
    })
    expect(getFightingStyles(c).sort()).toEqual(['defense', 'dueling'])
  })

  it('não duplica quando primária e multiclasse escolhem o mesmo estilo', () => {
    const c = char({
      cls: 'guerreiro',
      chosen: { fighting_style: 'defesa' },
      multiclasses: [{ class: 'paladino', level: 2, chosenFeatures: { fighting_style_paladin: 'defesa' } }],
    })
    expect(getFightingStyles(c)).toEqual(['defense'])
  })

  it('ignora estilos sem mecânica implementada (Proteção, Tasha)', () => {
    expect(getFightingStyles(char({ chosen: { fighting_style_paladin: 'protecao' } }))).toEqual([])
    expect(getFightingStyles(char({ chosen: { fighting_style_paladin: 'interceptador' } }))).toEqual([])
  })

  it('devolve lista vazia sem escolha, e tolera personagem incompleto', () => {
    expect(getFightingStyles(char())).toEqual([])
    expect(getFightingStyles({})).toEqual([])
    expect(getFightingStyles(null)).toEqual([])
  })
})

describe('hasFightingStyle', () => {
  it('responde pela chave em inglês', () => {
    const c = char({ chosen: { fighting_style_paladin: 'defesa' } })
    expect(hasFightingStyle(c, 'defense')).toBe(true)
    expect(hasFightingStyle(c, 'dueling')).toBe(false)
  })
})
