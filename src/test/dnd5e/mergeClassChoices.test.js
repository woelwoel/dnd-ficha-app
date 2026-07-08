import { describe, it, expect } from 'vitest'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'

const phb = {
  barbaro: {
    choices: [
      { level: 3, id: 'primal_path', featureName: 'Caminho Primitivo',
        options: [{ value: 'berserker', name: 'Berserker' }] },
    ],
  },
}
const tasha = {
  // classe só-Tasha
  artifice: { choices: [{ level: 3, id: 'spec', options: [{ value: 'alquimista', name: 'Alquimista' }] }] },
  // classe em colisão
  barbaro: {
    choices: [
      { level: 3, id: 'primal_path', options: [{ value: 'besta', name: 'Caminho da Besta' }] },
      { level: 3, id: 'barbaro_beast_form', requires: { primal_path: 'besta' },
        options: [{ value: 'mordida', name: 'Mordida' }] },
    ],
  },
}

describe('mergeClassChoices', () => {
  it('classe só-Tasha entra inteira com opções carimbadas', () => {
    const out = mergeClassChoices(phb, tasha, 'tasha')
    expect(out.artifice.choices[0].options[0]).toMatchObject({ value: 'alquimista', source: 'tasha' })
  })

  it('colisão de mesmo id concatena options e carimba só as de Tasha', () => {
    const out = mergeClassChoices(phb, tasha, 'tasha')
    const opts = out.barbaro.choices.find(c => c.id === 'primal_path').options
    expect(opts.map(o => o.value)).toEqual(['berserker', 'besta'])
    expect(opts.find(o => o.value === 'berserker').source).toBeUndefined()
    expect(opts.find(o => o.value === 'besta').source).toBe('tasha')
  })

  it('choice só-Tasha é anexado à classe existente', () => {
    const out = mergeClassChoices(phb, tasha, 'tasha')
    const beast = out.barbaro.choices.find(c => c.id === 'barbaro_beast_form')
    expect(beast).toBeTruthy()
    expect(beast.requires).toEqual({ primal_path: 'besta' })
    expect(beast.options[0].source).toBe('tasha')
  })

  it('não muta as entradas originais', () => {
    mergeClassChoices(phb, tasha, 'tasha')
    expect(phb.barbaro.choices[0].options).toHaveLength(1)
    expect(phb.barbaro.choices[0].options[0].source).toBeUndefined()
  })

  it('extra vazio devolve cópia equivalente do phb', () => {
    const out = mergeClassChoices(phb, {}, 'tasha')
    expect(out.barbaro.choices[0].options.map(o => o.value)).toEqual(['berserker'])
  })

  it('encadeia tres fontes preservando o carimbo de cada uma', () => {
    const basePhb = { bruxo: { choices: [{ id: 'patron', options: [{ value: 'feerico' }] }] } }
    const extTasha = { bruxo: { choices: [{ id: 'patron', options: [{ value: 'genio' }] }] } }
    const extXan = { bruxo: { choices: [{ id: 'patron', options: [{ value: 'hexblade' }] }] } }
    const merged = mergeClassChoices(mergeClassChoices(basePhb, extTasha, 'tasha'), extXan, 'xanathar')
    const opts = merged.bruxo.choices[0].options
    expect(opts.map(o => [o.value, o.source ?? 'phb'])).toEqual([
      ['feerico', 'phb'], ['genio', 'tasha'], ['hexblade', 'xanathar'],
    ])
  })
})
