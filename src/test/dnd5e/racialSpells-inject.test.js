import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { injectRacialSpells } from '../../systems/dnd5e/domain/racialSpells'

const SRD = JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8'))

const drow = (level, spells = []) => ({
  info: { race: 'elfo', subrace: 'elfo-negro-drow', level, multiclasses: [] },
  spellcasting: { ability: null, spells },
})

describe('injectRacialSpells', () => {
  it('cria a magia com atributo do traço, selo e proveniência', () => {
    const c = injectRacialSpells(drow(5), SRD)
    const fogo = c.spellcasting.spells.find(s => s.index === 'fogo-das-fadas')
    expect(fogo.ability).toBe('cha')
    expect(fogo.source).toBe('race')
    expect(fogo.sourceLabel).toBe('Magia Drow')
    expect(fogo.alwaysPrepared).toBe(true)
    expect(fogo.raceCreated).toBe(true)
    expect(fogo.raceGrants).toEqual([{ raceKey: 'elfo-negro-drow', grantIdx: 1 }])
    expect(fogo.desc.length).toBeGreaterThan(50) // texto real do catálogo
  })

  it('respeita o gating por nível', () => {
    expect(injectRacialSpells(drow(1), SRD).spellcasting.spells.map(s => s.index))
      .toEqual(['globos-de-luz'])
    expect(injectRacialSpells(drow(5), SRD).spellcasting.spells.map(s => s.index))
      .toEqual(['globos-de-luz', 'fogo-das-fadas', 'escuridao'])
  })

  it('idempotente: segunda passada devolve o MESMO objeto', () => {
    const once = injectRacialSpells(drow(5), SRD)
    expect(injectRacialSpells(once, SRD)).toBe(once)
  })

  it('magia já conhecida pela classe: ganha proveniência, mantém ability e NÃO vira raceCreated', () => {
    const conhecida = { id: 'x1', index: 'escuridao', name: 'Escuridão', level: 2, ability: 'int', prepared: true }
    const c = injectRacialSpells(drow(5, [conhecida]), SRD)
    const escuridao = c.spellcasting.spells.find(s => s.index === 'escuridao')
    expect(escuridao.ability).toBe('int')
    expect(escuridao.id).toBe('x1')
    expect(escuridao.raceCreated).toBeUndefined()
    expect(escuridao.raceGrants).toEqual([{ raceKey: 'elfo-negro-drow', grantIdx: 2 }])
  })

  it('raça sem magia inata: devolve o MESMO objeto', () => {
    const c = { info: { race: 'humano', subrace: '', level: 5, multiclasses: [] }, spellcasting: { spells: [] } }
    expect(injectRacialSpells(c, SRD)).toBe(c)
  })

  it('sem catálogo: devolve o MESMO objeto (não apaga nada)', () => {
    const c = drow(5)
    expect(injectRacialSpells(c, [])).toBe(c)
    expect(injectRacialSpells(c, null)).toBe(c)
  })

  it('subir de nível acrescenta sem tocar no que já existe', () => {
    const nv1 = injectRacialSpells(drow(1), SRD)
    const marcado = {
      ...nv1,
      info: { ...nv1.info, level: 3 },
      spellcasting: {
        ...nv1.spellcasting,
        spells: nv1.spellcasting.spells.map(s => ({ ...s, usadoPeloJogador: true })),
      },
    }
    const nv3 = injectRacialSpells(marcado, SRD)
    expect(nv3.spellcasting.spells[0].usadoPeloJogador).toBe(true)
    expect(nv3.spellcasting.spells.map(s => s.index)).toEqual(['globos-de-luz', 'fogo-das-fadas'])
  })
})
