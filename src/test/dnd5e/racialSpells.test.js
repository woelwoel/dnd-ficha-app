import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { RACIAL_SPELL_DEFS, getRacialGrants, racialTrackerId } from '../../systems/dnd5e/domain/racialSpells'

const CATALOG = JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8'))
const byIndex = new Map(CATALOG.map(s => [s.index, s]))

const drow = (level = 5) => ({ info: { race: 'elfo', subrace: 'elfo-negro-drow', level, multiclasses: [] } })

describe('RACIAL_SPELL_DEFS', () => {
  it('guard-rail: toda magia declarada existe no catálogo', () => {
    const faltando = []
    for (const [raceKey, def] of Object.entries(RACIAL_SPELL_DEFS)) {
      for (const g of def.grants) {
        if (!byIndex.has(g.spell)) faltando.push(`${raceKey}: ${g.spell}`)
      }
    }
    expect(faltando).toEqual([])
  })

  it('guard-rail: o nome declarado bate com o do catálogo', () => {
    const divergentes = []
    for (const def of Object.values(RACIAL_SPELL_DEFS)) {
      for (const g of def.grants) {
        const real = byIndex.get(g.spell)
        if (real && real.name !== g.name) divergentes.push(`${g.spell}: "${g.name}" ≠ "${real.name}"`)
      }
    }
    expect(divergentes).toEqual([])
  })
})

describe('getRacialGrants', () => {
  it('drow nv1 recebe só o truque', () => {
    const r = getRacialGrants(drow(1))
    expect(r.raceKey).toBe('elfo-negro-drow')
    expect(r.label).toBe('Magia Drow')
    expect(r.ability).toBe('cha')
    expect(r.grants.map(g => g.spell)).toEqual(['globos-de-luz'])
  })

  it('drow nv3 ganha fogo das fadas; nv5 ganha escuridão', () => {
    expect(getRacialGrants(drow(3)).grants.map(g => g.spell)).toEqual(['globos-de-luz', 'fogo-das-fadas'])
    expect(getRacialGrants(drow(5)).grants.map(g => g.spell))
      .toEqual(['globos-de-luz', 'fogo-das-fadas', 'escuridao'])
  })

  it('grantIdx é a posição ABSOLUTA na declaração (não a filtrada)', () => {
    const r = getRacialGrants(drow(5))
    expect(r.grants.map(g => g.grantIdx)).toEqual([0, 1, 2])
    const nv3 = getRacialGrants(drow(3))
    expect(nv3.grants.at(-1).grantIdx).toBe(1)
  })

  it('nível TOTAL conta multiclasse', () => {
    const c = { info: { race: 'elfo', subrace: 'elfo-negro-drow', level: 2, multiclasses: [{ class: 'mago', level: 1 }] } }
    expect(getRacialGrants(c).grants.map(g => g.spell)).toEqual(['globos-de-luz', 'fogo-das-fadas'])
  })

  it('tiefling casa pela RAÇA (não tem sub-raça)', () => {
    const r = getRacialGrants({ info: { race: 'tiefling', subrace: '', level: 5, multiclasses: [] } })
    expect(r.label).toBe('Legado Infernal')
    expect(r.grants.map(g => g.spell)).toEqual(['taumaturgia', 'repreensao-infernal', 'escuridao'])
    expect(r.grants[1].castAtLevel).toBe(2) // "como uma magia de 2º nível"
  })

  it('sub-raça vence a raça (anão comum não tem magia; duergar tem)', () => {
    expect(getRacialGrants({ info: { race: 'anao', subrace: 'anao-da-colina', level: 5, multiclasses: [] } })).toBeNull()
    const d = getRacialGrants({ info: { race: 'anao', subrace: 'duergar', level: 5, multiclasses: [] } })
    expect(d.ability).toBe('int')
    expect(d.grants.map(g => g.spell)).toEqual(['aumentarreduzir', 'invisibilidade'])
  })

  it('raça sem magia inata → null', () => {
    expect(getRacialGrants({ info: { race: 'humano', subrace: '', level: 5, multiclasses: [] } })).toBeNull()
  })
})

describe('racialTrackerId', () => {
  it('é estável e separa raças que concedem a MESMA magia', () => {
    expect(racialTrackerId('elfo-negro-drow', 'escuridao')).toBe('raca-elfo-negro-drow-escuridao')
    expect(racialTrackerId('tiefling', 'escuridao')).toBe('raca-tiefling-escuridao')
  })
})
