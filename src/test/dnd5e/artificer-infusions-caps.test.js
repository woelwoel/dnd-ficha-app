import { describe, it, expect } from 'vitest'
import { getInfusionCaps, artificerLevelOf } from '../../systems/dnd5e/domain/artificerInfusions'

describe('getInfusionCaps', () => {
  it('nv1 = sem infusões', () => expect(getInfusionCaps(1)).toEqual({ known: 0, active: 0 }))
  it('nv2 = 4 conhecidas / 2 ativas', () => expect(getInfusionCaps(2)).toEqual({ known: 4, active: 2 }))
  it('nv6 = 6 / 3', () => expect(getInfusionCaps(6)).toEqual({ known: 6, active: 3 }))
  it('nv10 = 8 / 4', () => expect(getInfusionCaps(10)).toEqual({ known: 8, active: 4 }))
  it('nv14 = 10 / 5', () => expect(getInfusionCaps(14)).toEqual({ known: 10, active: 5 }))
  it('nv18 = 12 / 6', () => expect(getInfusionCaps(18)).toEqual({ known: 12, active: 6 }))
})

describe('artificerLevelOf', () => {
  it('classe primária Artífice usa info.level', () => {
    expect(artificerLevelOf({ info: { class: 'artifice', level: 5, multiclasses: [] } })).toBe(5)
  })
  it('Artífice em multiclasse usa o nível DA classe', () => {
    expect(artificerLevelOf({ info: { class: 'mago', level: 3, multiclasses: [{ class: 'artifice', level: 4 }] } })).toBe(4)
  })
  it('sem Artífice = 0', () => {
    expect(artificerLevelOf({ info: { class: 'mago', level: 3, multiclasses: [] } })).toBe(0)
  })
})
