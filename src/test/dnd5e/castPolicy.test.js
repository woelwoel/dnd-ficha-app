import { describe, it, expect } from 'vitest'
import { getSpellCastPolicy, specialCastingUses } from '../../systems/dnd5e/domain/castPolicy'

const drow = (level = 5, spells = []) => ({
  info: { race: 'elfo', subrace: 'elfo-negro-drow', level, multiclasses: [], feats: [] },
  spellcasting: { spells },
})

const racial = (index, grantIdx, over = {}) => ({
  index, name: index, level: 2, raceCreated: true,
  raceGrants: [{ raceKey: 'elfo-negro-drow', grantIdx }],
  ...over,
})

describe('getSpellCastPolicy', () => {
  it('magia sem proveniência nenhuma → null (comportamento padrão)', () => {
    expect(getSpellCastPolicy({ index: 'bola-de-fogo', level: 3 }, drow())).toBeNull()
  })

  it('magia criada pela raça: sem espaços, um uso grátis por descanso longo', () => {
    const p = getSpellCastPolicy(racial('fogo-das-fadas', 1, { level: 1 }), drow())
    expect(p.slots).toBe(false)
    expect(p.atWill).toBe(false)
    expect(p.freeCast).toEqual([{
      recharge: 'long', trackerId: 'raca-elfo-negro-drow-fogo-das-fadas',
      source: 'raca', label: 'Magia Drow', castAtLevel: 1,
    }])
  })

  it('Repreensão Infernal do tiefling conjura como 2º nível', () => {
    const tief = {
      info: { race: 'tiefling', subrace: '', level: 5, multiclasses: [], feats: [] },
      spellcasting: { spells: [] },
    }
    const spell = {
      index: 'repreensao-infernal', name: 'Repreensão Infernal', level: 1, raceCreated: true,
      raceGrants: [{ raceKey: 'tiefling', grantIdx: 1 }],
    }
    expect(getSpellCastPolicy(spell, tief).freeCast[0].castAtLevel).toBe(2)
  })

  it('truque racial: à vontade, sem tracker', () => {
    const p = getSpellCastPolicy(racial('globos-de-luz', 0, { level: 0 }), drow())
    expect(p.atWill).toBe(true)
    expect(p.freeCast).toEqual([])
  })

  it('magia que a classe também dá (raceCreated ausente): espaços continuam valendo', () => {
    const p = getSpellCastPolicy(racial('escuridao', 2, { raceCreated: undefined }), drow())
    expect(p.slots).toBe(true)
    expect(p.freeCast).toHaveLength(1)
  })

  it('une raça e talento: dois usos independentes da mesma magia', () => {
    const char = {
      info: {
        race: 'elfo', subrace: 'elfo-negro-drow', level: 5, multiclasses: [],
        feats: [{ index: 'tocado-pelas-sombras', name: 'Tocado pelas Sombras' }],
      },
      spellcasting: { spells: [] },
    }
    const spell = {
      index: 'escuridao', name: 'Escuridão', level: 2, raceCreated: true,
      raceGrants: [{ raceKey: 'elfo-negro-drow', grantIdx: 2 }],
      featGrants: [{ featIndex: 'tocado-pelas-sombras', featGrant: 1 }],
    }
    const p = getSpellCastPolicy(spell, char)
    expect(p.freeCast).toHaveLength(2)
    expect(p.freeCast.map(f => f.source).sort()).toEqual(['feat', 'raca'])
    expect(p.slots).toBe(true) // o talento permite espaços; a raça não tira
  })

  it('grantIdx órfão é ignorado sem derrubar a ficha', () => {
    expect(getSpellCastPolicy(racial('escuridao', 99), drow())).toBeNull()
  })
})

describe('specialCastingUses', () => {
  it('um tracker por concessão com uso grátis, nenhum pra truque', () => {
    const c = drow(5, [
      racial('globos-de-luz', 0, { name: 'Globos De Luz', level: 0 }),
      racial('fogo-das-fadas', 1, { name: 'Fogo Das Fadas', level: 1 }),
      racial('escuridao', 2, { name: 'Escuridão' }),
    ])
    expect(specialCastingUses(c)).toEqual([
      { id: 'raca-elfo-negro-drow-fogo-das-fadas', name: 'Fogo Das Fadas (Magia Drow)', max: 1, used: 0, recharge: 'long', source: 'raca' },
      { id: 'raca-elfo-negro-drow-escuridao',      name: 'Escuridão (Magia Drow)',      max: 1, used: 0, recharge: 'long', source: 'raca' },
    ])
  })

  it('magia de talento também gera tracker, com o nome do talento', () => {
    const c = {
      info: {
        race: 'humano', subrace: '', level: 4, multiclasses: [],
        feats: [{ index: 'telepatico', name: 'Telepático' }],
      },
      spellcasting: {
        spells: [{
          index: 'detectar-pensamentos', name: 'Detectar Pensamentos', level: 2,
          featGrants: [{ featIndex: 'telepatico', featGrant: 0 }],
        }],
      },
    }
    expect(specialCastingUses(c)).toEqual([{
      id: 'feat-telepatico-detectar-pensamentos',
      name: 'Detectar Pensamentos (Talento: Telepático)',
      max: 1, used: 0, recharge: 'long', source: 'feat',
    }])
  })

  it('ficha sem magia especial nenhuma → lista vazia', () => {
    expect(specialCastingUses({
      info: { race: 'humano', level: 1, multiclasses: [], feats: [] },
      spellcasting: { spells: [] },
    })).toEqual([])
  })
})
