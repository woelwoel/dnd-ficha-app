import { describe, it, expect } from 'vitest'
import { matchesFilters, EMPTY_FILTERS, countActiveFilters } from '../systems/dnd5e/utils/spellFilters'

const acao    = { name: 'Bola de Fogo', school: 'evocação',    ritual: false, concentration: false, components: 'V, S, M', casting_time: '1 ação' }
const bonus   = { name: 'Hexar',        school: 'encantamento',ritual: false, concentration: true,  components: 'V, S, M', casting_time: '1 ação bônus' }
const reacao  = { name: 'Escudo',       school: 'abjuração',   ritual: false, concentration: false, components: 'V, S',    casting_time: '1 reação, que você toma quando é atingido' }
const ritual  = { name: 'Detectar Magia', school: 'adivinhação', ritual: true, concentration: true,  components: 'V, S',    casting_time: '1 ação' }
const minutos = { name: 'Identificar',  school: 'adivinhação', ritual: true,  concentration: false, components: 'V, S, M', casting_time: '1 minuto' }
const semV    = { name: 'Modelar Água', school: 'transmutação',ritual: false, concentration: false, components: 'S',       casting_time: '1 ação' }

describe('matchesFilters', () => {
  it('filtro vazio passa qualquer magia', () => {
    expect(matchesFilters(acao,    EMPTY_FILTERS)).toBe(true)
    expect(matchesFilters(ritual,  EMPTY_FILTERS)).toBe(true)
    expect(matchesFilters(minutos, EMPTY_FILTERS)).toBe(true)
  })

  it('escola única', () => {
    const f = { ...EMPTY_FILTERS, schools: new Set(['evocação']) }
    expect(matchesFilters(acao, f)).toBe(true)
    expect(matchesFilters(bonus, f)).toBe(false)
  })

  it('escola múltipla (OR dentro)', () => {
    const f = { ...EMPTY_FILTERS, schools: new Set(['evocação', 'abjuração']) }
    expect(matchesFilters(acao, f)).toBe(true)
    expect(matchesFilters(reacao, f)).toBe(true)
    expect(matchesFilters(bonus, f)).toBe(false)
  })

  it('concentração yes/no/any', () => {
    expect(matchesFilters(bonus, { ...EMPTY_FILTERS, concentration: 'yes' })).toBe(true)
    expect(matchesFilters(acao,  { ...EMPTY_FILTERS, concentration: 'yes' })).toBe(false)
    expect(matchesFilters(acao,  { ...EMPTY_FILTERS, concentration: 'no'  })).toBe(true)
    expect(matchesFilters(bonus, { ...EMPTY_FILTERS, concentration: 'no'  })).toBe(false)
    expect(matchesFilters(bonus, { ...EMPTY_FILTERS, concentration: 'any' })).toBe(true)
  })

  it('ritual yes/any', () => {
    expect(matchesFilters(ritual, { ...EMPTY_FILTERS, ritual: 'yes' })).toBe(true)
    expect(matchesFilters(acao,   { ...EMPTY_FILTERS, ritual: 'yes' })).toBe(false)
    expect(matchesFilters(acao,   { ...EMPTY_FILTERS, ritual: 'any' })).toBe(true)
  })

  it('componentes tri-state', () => {
    // V sim, S não, M qualquer
    const f = { ...EMPTY_FILTERS, components: { v: 'yes', s: 'no', m: 'any' } }
    expect(matchesFilters(acao, f)).toBe(false)    // tem S
    expect(matchesFilters(semV, f)).toBe(false)    // sem V
    expect(matchesFilters({ ...acao, components: 'V' }, f)).toBe(true)
  })

  it('casting time Ação não casa Ação Bônus', () => {
    const f = { ...EMPTY_FILTERS, castingTimes: new Set(['action']) }
    expect(matchesFilters(acao, f)).toBe(true)
    expect(matchesFilters(bonus, f)).toBe(false)
    expect(matchesFilters(reacao, f)).toBe(false)
  })

  it('casting time Bônus casa "1 ação bônus"', () => {
    const f = { ...EMPTY_FILTERS, castingTimes: new Set(['bonus']) }
    expect(matchesFilters(bonus, f)).toBe(true)
    expect(matchesFilters(acao, f)).toBe(false)
  })

  it('casting time Reação casa qualquer "1 reação..."', () => {
    const f = { ...EMPTY_FILTERS, castingTimes: new Set(['reaction']) }
    expect(matchesFilters(reacao, f)).toBe(true)
    expect(matchesFilters(acao, f)).toBe(false)
  })

  it('casting time Minutos casa "1 minuto"', () => {
    const f = { ...EMPTY_FILTERS, castingTimes: new Set(['minutes']) }
    expect(matchesFilters(minutos, f)).toBe(true)
    expect(matchesFilters(acao, f)).toBe(false)
  })

  it('combinação AND entre dimensões', () => {
    const f = {
      ...EMPTY_FILTERS,
      schools: new Set(['evocação']),
      concentration: 'no',
    }
    expect(matchesFilters(acao, f)).toBe(true)
    expect(matchesFilters(bonus, f)).toBe(false) // escola errada
    const hipo = { ...acao, concentration: true }
    expect(matchesFilters(hipo, { ...EMPTY_FILTERS, schools: new Set(['evocação']), concentration: 'no' })).toBe(false)
  })

  it('combinação completa de 5 dimensões', () => {
    const f = {
      schools: new Set(['abjuração']),
      concentration: 'no',
      ritual: 'any',
      components: { v: 'yes', s: 'yes', m: 'no' },
      castingTimes: new Set(['reaction']),
    }
    expect(matchesFilters(reacao, f)).toBe(true)
  })
})

describe('countActiveFilters', () => {
  it('vazio retorna 0', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0)
  })

  it('soma escolas, tempos, e cada flag não-any', () => {
    const f = {
      schools: new Set(['evocação', 'abjuração']),   // +2
      concentration: 'no',                            // +1
      ritual: 'yes',                                  // +1
      components: { v: 'yes', s: 'any', m: 'no' },   // +2
      castingTimes: new Set(['action']),              // +1
    }
    expect(countActiveFilters(f)).toBe(7)
  })
})
