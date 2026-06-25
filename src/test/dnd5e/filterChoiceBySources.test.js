import { describe, it, expect } from 'vitest'
import { filterChoiceBySources } from '../../systems/dnd5e/domain/sources'

const choice = {
  id: 'primal_path',
  options: [
    { value: 'berserker', name: 'Berserker' },              // phb (sem source)
    { value: 'besta', name: 'Besta', source: 'tasha' },
    { value: 'magia-selvagem', name: 'Magia Selvagem', source: 'tasha' },
  ],
}

describe('filterChoiceBySources', () => {
  it('sem activeSources oferece só PHB', () => {
    const r = filterChoiceBySources(choice, {}, undefined)
    expect(r.options.map(o => o.value)).toEqual(['berserker'])
  })

  it('com tasha ativo oferece phb + tasha', () => {
    const r = filterChoiceBySources(choice, {}, ['tasha'])
    expect(r.options.map(o => o.value)).toEqual(['berserker', 'besta', 'magia-selvagem'])
  })

  it('preserva a opção já escolhida mesmo com a fonte desligada (valor string)', () => {
    const r = filterChoiceBySources(choice, { primal_path: 'besta' }, undefined)
    expect(r.options.map(o => o.value)).toEqual(['berserker', 'besta'])
  })

  it('preserva escolhidos em multiSelect array', () => {
    const multi = { id: 'manobras', options: choice.options }
    const r = filterChoiceBySources(multi, { manobras: ['besta'] }, undefined)
    expect(r.options.map(o => o.value)).toContain('besta')
  })

  it('preserva escolhidos em multiSelect string "a,b" (formato da ficha)', () => {
    const multi = { id: 'manobras', options: choice.options }
    const r = filterChoiceBySources(multi, { manobras: 'besta,magia-selvagem' }, undefined)
    expect(r.options.map(o => o.value)).toEqual(
      expect.arrayContaining(['berserker', 'besta', 'magia-selvagem']),
    )
  })

  it('não muta a choice original', () => {
    filterChoiceBySources(choice, {}, ['tasha'])
    expect(choice.options).toHaveLength(3)
  })
})
