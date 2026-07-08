import { describe, it, expect } from 'vitest'
import { meetsRacePrereq, formatRacePrereq } from '../../systems/dnd5e/domain/featPrereqs'

describe('meetsRacePrereq', () => {
  const prereq = { type: 'race', races: ['anao', 'elfo-negro-drow'] }

  it('casa pela raca', () =>
    expect(meetsRacePrereq(prereq, { race: 'anao', subrace: 'anao-da-colina' })).toBe(true))

  it('casa pela sub-raca', () =>
    expect(meetsRacePrereq(prereq, { race: 'elfo', subrace: 'elfo-negro-drow' })).toBe(true))

  it('rejeita quem nao e', () =>
    expect(meetsRacePrereq(prereq, { race: 'humano', subrace: '' })).toBe(false))

  it('prereq de outro tipo nunca bloqueia aqui', () =>
    expect(meetsRacePrereq({ type: 'ability' }, { race: 'humano' })).toBe(true))

  it('sem prereq passa', () =>
    expect(meetsRacePrereq(null, { race: 'humano' })).toBe(true))

  it('sem info de raca nao casa prereq de raca', () =>
    expect(meetsRacePrereq(prereq, {})).toBe(false))
})

describe('formatRacePrereq', () => {
  it('rotulo legivel com "ou"', () =>
    expect(formatRacePrereq({ type: 'race', races: ['anao', 'halfling'] })).toBe('Anão ou Halfling'))

  it('sub-raca ganha rotulo proprio', () =>
    expect(formatRacePrereq({ type: 'race', races: ['elfo-negro-drow'] })).toBe('Drow'))

  it('codigo desconhecido cai no proprio codigo', () =>
    expect(formatRacePrereq({ type: 'race', races: ['aarakocra'] })).toBe('aarakocra'))
})
