import { describe, it, expect } from 'vitest'
import { parseRuneDesc, resolveChosenRunes, runeUseId } from '../../systems/dnd5e/domain/runes'
import { defaultClassFeatureUses } from '../../systems/dnd5e/domain/rules'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'
import phbChoices from '../../../public/srd-data/phb-class-choices-pt.json'
import tashaChoices from '../../../public/srd-data/tasha-class-choices-pt.json'

const classChoices = mergeClassChoices(phbChoices, tashaChoices, 'tasha')
const runeOptions = classChoices.guerreiro.choices
  .find(c => c.id === 'guerreiro_rune_knight_runes').options

function runeKnight(runas, { level = 3, archetype = 'cavaleiro-runico' } = {}) {
  return { info: { class: 'guerreiro', level, multiclasses: [], chosenFeatures: {
    martial_archetype: archetype,
    guerreiro_rune_knight_runes: runas,
  } } }
}

describe('parseRuneDesc', () => {
  it('separa passiva e invocação em todas as 6 runas do catálogo', () => {
    for (const o of runeOptions) {
      const parsed = parseRuneDesc(o.desc)
      expect(parsed.passive, `runa ${o.value}`).toBeTruthy()
      expect(parsed.invoked, `runa ${o.value}`).toBeTruthy()
      // nada de "Passiva:"/"Invocada" vazando pro texto separado
      expect(parsed.passive, `runa ${o.value}`).not.toMatch(/Invocada/)
      expect(parsed.invoked, `runa ${o.value}`).not.toMatch(/^Passiva/)
    }
  })

  it('lê o custo de ação da invocação do parêntese', () => {
    const byValue = Object.fromEntries(runeOptions.map(o => [o.value, parseRuneDesc(o.desc).type]))
    expect(byValue['nuvem']).toBe('reação')
    expect(byValue['pedra']).toBe('reação')
    expect(byValue['gelo']).toBe('ação bônus')
    expect(byValue['colina']).toBe('ação bônus')
    expect(byValue['tempestade']).toBe('ação bônus')
    // Runa do Fogo dispara ao acertar com arma — não custa ação própria
    expect(byValue['fogo']).toBe('passiva')
  })

  it('guarda o gatilho quando o parêntese traz um', () => {
    const nuvem = parseRuneDesc(runeOptions.find(o => o.value === 'nuvem').desc)
    expect(nuvem.trigger).toMatch(/acertado/)
    const gelo = parseRuneDesc(runeOptions.find(o => o.value === 'gelo').desc)
    expect(gelo.trigger).toBeFalsy()   // "(ação bônus)" é só o custo
  })

  it('capitaliza passiva e invocação — o rótulo que vinha antes foi removido', () => {
    // "Passiva: dobra o bônus…" viraria uma linha começando em minúscula na UI
    const fogo = parseRuneDesc(runeOptions.find(o => o.value === 'fogo').desc)
    expect(fogo.passive.startsWith('Dobra')).toBe(true)
    for (const o of runeOptions) {
      const { passive, invoked } = parseRuneDesc(o.desc)
      for (const [campo, txt] of [['passive', passive], ['invoked', invoked]]) {
        expect(txt[0], `runa ${o.value} (${campo})`).toBe(txt[0].toUpperCase())
      }
    }
  })

  it('texto fora do formato vira invocação inteira, sem quebrar', () => {
    const parsed = parseRuneDesc('Uma runa nova sem formato conhecido.')
    expect(parsed.passive).toBeFalsy()
    expect(parsed.invoked).toBe('Uma runa nova sem formato conhecido.')
    expect(parsed.type).toBe('passiva')
  })
})

describe('resolveChosenRunes', () => {
  it('resolve as runas escolhidas na ordem do array', () => {
    const runas = resolveChosenRunes(runeKnight(['fogo', 'nuvem']), classChoices)
    expect(runas.map(r => r.value)).toEqual(['fogo', 'nuvem'])
    expect(runas[0].name).toBe('Runa do Fogo')
    expect(runas[0].invoked).toMatch(/2d6/)
  })

  it('tira o "(nv 7+)" do nome — é gating, não nome de runa', () => {
    const [colina] = resolveChosenRunes(runeKnight(['colina'], { level: 7 }), classChoices)
    expect(colina.name).toBe('Runa da Colina')
  })

  it('cada runa carrega o id do seu tracker de invocação', () => {
    const [fogo] = resolveChosenRunes(runeKnight(['fogo']), classChoices)
    expect(fogo.useId).toBe(runeUseId('fogo'))
    expect(fogo.useId).toBe('guerreiro-rune-fogo')
  })

  it('vazio fora do Cavaleiro Rúnico, sem runas, ou sem classChoices', () => {
    expect(resolveChosenRunes(runeKnight(['fogo'], { archetype: 'campeao' }), classChoices)).toEqual([])
    expect(resolveChosenRunes(runeKnight([]), classChoices)).toEqual([])
    expect(resolveChosenRunes(runeKnight(['fogo']), null)).toEqual([])
  })

  it('ignora id de runa que não existe no catálogo', () => {
    expect(resolveChosenRunes(runeKnight(['runa-fantasma']), classChoices)).toEqual([])
  })

  it('acha as runas do Guerreiro multiclasse (chosenFeatures da entrada)', () => {
    const char = { info: {
      class: 'mago', level: 5, chosenFeatures: {},
      multiclasses: [{ class: 'guerreiro', level: 3, chosenFeatures: {
        martial_archetype: 'cavaleiro-runico',
        guerreiro_rune_knight_runes: ['pedra'],
      } }],
    } }
    expect(resolveChosenRunes(char, classChoices).map(r => r.value)).toEqual(['pedra'])
  })
})

describe('trackers de invocação (defaultClassFeatureUses)', () => {
  const runeUses = (char, choices = classChoices) =>
    defaultClassFeatureUses(char, choices).filter(u => u.id.startsWith('guerreiro-rune-'))

  it('uma invocação por runa gravada, 1 uso por descanso curto', () => {
    const uses = runeUses(runeKnight(['fogo', 'nuvem']))
    expect(uses.map(u => u.id)).toEqual(['guerreiro-rune-fogo', 'guerreiro-rune-nuvem'])
    for (const u of uses) {
      expect(u.max).toBe(1)
      expect(u.used).toBe(0)
      expect(u.recharge).toBe('short')
      expect(u.source).toBe('guerreiro')
    }
    expect(uses[0].name).toBe('Runa do Fogo')
  })

  it('nome do tracker sem o "(nv 7+)"', () => {
    const [colina] = runeUses(runeKnight(['colina'], { level: 7 }))
    expect(colina.name).toBe('Runa da Colina')
  })

  it('nada sem classChoices (retrocompatível, como os trackers de subclasse)', () => {
    expect(runeUses(runeKnight(['fogo']), null)).toEqual([])
  })

  it('nada pra outro arquétipo', () => {
    expect(runeUses(runeKnight(['fogo'], { archetype: 'campeao' }))).toEqual([])
  })

  it('o id do tracker é o mesmo que a runa resolvida carrega', () => {
    const [runa] = resolveChosenRunes(runeKnight(['tempestade'], { level: 7 }), classChoices)
    const ids = runeUses(runeKnight(['tempestade'], { level: 7 })).map(u => u.id)
    expect(ids).toContain(runa.useId)
  })
})
