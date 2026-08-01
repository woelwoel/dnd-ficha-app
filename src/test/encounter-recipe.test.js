import { describe, it, expect } from 'vitest'
import { describeRecipe, nextCopyName } from '../systems/dnd5e/domain/encounterRecipe'

const catalogo = new Map([
  ['goblin', { index: 'goblin', name: 'Goblin' }],
  ['hobgoblin', { index: 'hobgoblin', name: 'Hobgoblin' }],
  ['orc', { index: 'orc', name: 'Orc' }],
  ['ogre', { index: 'ogre', name: 'Ogro' }],
  ['worg', { index: 'worg', name: 'Worg' }],
  ['bugbear', { index: 'bugbear', name: 'Urso-coruja' }],
])

describe('describeRecipe', () => {
  it('resume a composição com a contagem', () => {
    const r = [{ monsterIndex: 'goblin', count: 4 }, { monsterIndex: 'hobgoblin', count: 1 }]
    expect(describeRecipe(r, catalogo)).toBe('4× Goblin · 1× Hobgoblin')
  })

  it('corta em quatro espécies e conta o resto', () => {
    const r = ['goblin', 'hobgoblin', 'orc', 'ogre', 'worg', 'bugbear']
      .map(monsterIndex => ({ monsterIndex, count: 1 }))

    expect(describeRecipe(r, catalogo)).toBe('1× Goblin · 1× Hobgoblin · 1× Orc · 1× Ogro · +2 espécies')
  })

  it('monstro fora do catálogo aparece pelo índice, não some', () => {
    const r = [{ monsterIndex: 'tarrasque-caseiro', count: 1 }]
    expect(describeRecipe(r, catalogo)).toBe('1× tarrasque-caseiro')
  })

  it('receita vazia devolve string vazia', () => {
    expect(describeRecipe([], catalogo)).toBe('')
    expect(describeRecipe(null, catalogo)).toBe('')
  })

  it('contagem ausente ou inválida vale 1', () => {
    const r = [{ monsterIndex: 'goblin' }, { monsterIndex: 'orc', count: 0 }]
    expect(describeRecipe(r, catalogo)).toBe('1× Goblin · 1× Orc')
  })
})

describe('nextCopyName', () => {
  it('acrescenta (cópia) quando o nome está livre', () => {
    expect(nextCopyName('Emboscada', ['Emboscada'])).toBe('Emboscada (cópia)')
  })

  it('numera a partir da segunda cópia', () => {
    expect(nextCopyName('Emboscada', ['Emboscada', 'Emboscada (cópia)']))
      .toBe('Emboscada (cópia 2)')
    expect(nextCopyName('Emboscada', ['Emboscada', 'Emboscada (cópia)', 'Emboscada (cópia 2)']))
      .toBe('Emboscada (cópia 3)')
  })

  it('ignora diferença de caixa e espaço, como o índice único do banco', () => {
    expect(nextCopyName('Emboscada', ['  EMBOSCADA (Cópia) ']))
      .toBe('Emboscada (cópia 2)')
  })

  it('não estoura o limite de 80 caracteres da coluna', () => {
    const longo = 'a'.repeat(80)
    const nome = nextCopyName(longo, [longo])
    expect(nome.length).toBeLessThanOrEqual(80)
    expect(nome).toMatch(/\(cópia\)$/)
  })
})
