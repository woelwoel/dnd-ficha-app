import { describe, it, expect } from 'vitest'
import { isItemActive, getActiveMagicEffects, getEffectiveAttributes } from '../domain/magicItems'

describe('isItemActive', () => {
  it('item que requer atunamento é ativo apenas se atunado', () => {
    expect(isItemActive({ requiresAttunement: true, attuned: true })).toBe(true)
    expect(isItemActive({ requiresAttunement: true, attuned: false })).toBe(false)
  })

  it('item sem atunamento é ativo se equipado', () => {
    expect(isItemActive({ requiresAttunement: false, equipped: true })).toBe(true)
    expect(isItemActive({ requiresAttunement: false, equipped: false })).toBe(false)
  })

  it('item sem flags retorna false', () => {
    expect(isItemActive({})).toBe(false)
  })
})

describe('getActiveMagicEffects — agregação', () => {
  it('lista vazia retorna efeitos zerados', () => {
    const r = getActiveMagicEffects([])
    expect(r.ac).toBe(0)
    expect(r.saves).toBe(0)
    expect(r.resistances).toEqual([])
  })

  it('soma bônus numéricos de AC', () => {
    const items = [
      { name: 'Anel de Proteção', requiresAttunement: true, attuned: true,
        effects: [{ type: 'ac', value: 1 }] },
      { name: 'Bracelete de Defesa', requiresAttunement: true, attuned: true,
        effects: [{ type: 'ac', value: 2 }] },
    ]
    const r = getActiveMagicEffects(items)
    expect(r.ac).toBe(3)
    expect(r.sources).toHaveLength(2)
  })

  it('ignora itens inativos', () => {
    const items = [
      { name: 'Anel atunado', requiresAttunement: true, attuned: true,
        effects: [{ type: 'ac', value: 1 }] },
      { name: 'Anel não atunado', requiresAttunement: true, attuned: false,
        effects: [{ type: 'ac', value: 1 }] },
    ]
    expect(getActiveMagicEffects(items).ac).toBe(1)
  })

  it('attrSet — maior valor ganha (não soma)', () => {
    const items = [
      { name: 'Cinto Colina', requiresAttunement: true, attuned: true,
        effects: [{ type: 'attrSet', ability: 'str', value: 21 }] },
      { name: 'Cinto Fogo',   requiresAttunement: true, attuned: true,
        effects: [{ type: 'attrSet', ability: 'str', value: 25 }] },
    ]
    expect(getActiveMagicEffects(items).attrSet.str).toBe(25)
  })

  it('attrBonus respeita max', () => {
    const items = [
      { name: 'Amuleto da Saúde', requiresAttunement: true, attuned: true,
        effects: [{ type: 'attrBonus', ability: 'con', value: 2, max: 22 }] },
    ]
    const r = getActiveMagicEffects(items)
    expect(r.attrBonus.con.value).toBe(2)
    expect(r.attrBonus.con.max).toBe(22)
  })

  it('save geral e por atributo combinam', () => {
    const items = [
      { name: 'Anel de Proteção', requiresAttunement: true, attuned: true,
        effects: [{ type: 'saves', value: 1 }] },
      { name: 'Manto de Resistência', requiresAttunement: true, attuned: true,
        effects: [{ type: 'saveAbility', ability: 'con', value: 1 }] },
    ]
    const r = getActiveMagicEffects(items)
    expect(r.saves).toBe(1)
    expect(r.saveAbility.con).toBe(1)
  })

  it('resistance acumula sem duplicar', () => {
    const items = [
      { name: 'Anel Fogo 1', requiresAttunement: true, attuned: true,
        effects: [{ type: 'resistance', damage: 'fogo' }] },
      { name: 'Anel Fogo 2', requiresAttunement: true, attuned: true,
        effects: [{ type: 'resistance', damage: 'fogo' }] },
      { name: 'Anel Frio',   requiresAttunement: true, attuned: true,
        effects: [{ type: 'resistance', damage: 'frio' }] },
    ]
    expect(getActiveMagicEffects(items).resistances.sort()).toEqual(['fogo', 'frio'])
  })

  it('advSaves de um item ativa flag global', () => {
    const items = [
      { name: 'Pedra da Boa Sorte', requiresAttunement: true, attuned: true,
        effects: [{ type: 'advSaves' }] },
    ]
    expect(getActiveMagicEffects(items).advSaves).toBe(true)
  })

  it('speed e darkvision somam', () => {
    const items = [
      { equipped: true, name: 'Botas Aladas',
        effects: [{ type: 'speed', value: 10 }] },
      { equipped: true, name: 'Óculos da Visão Noturna',
        effects: [{ type: 'darkvision', value: 60 }] },
    ]
    const r = getActiveMagicEffects(items)
    expect(r.speed).toBe(10)
    expect(r.darkvision).toBe(60)
  })

  it('attrCap pega o maior teto', () => {
    const items = [
      { name: 'Manto de Carismático', requiresAttunement: true, attuned: true,
        effects: [{ type: 'attrCap', ability: 'cha', value: 21 }] },
    ]
    expect(getActiveMagicEffects(items).attrCap.cha).toBe(21)
  })

  it('item sem effects não quebra', () => {
    const items = [
      { name: 'Item Comum', requiresAttunement: false, equipped: true },
    ]
    expect(getActiveMagicEffects(items).ac).toBe(0)
  })
})

describe('getEffectiveAttributes', () => {
  const baseAttrs = { str: 14, dex: 16, con: 13, int: 10, wis: 12, cha: 8 }

  function emptyEffectsObj() {
    return {
      attrSet: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
      attrBonus: {
        str: { value: 0, max: 20 }, dex: { value: 0, max: 20 },
        con: { value: 0, max: 20 }, int: { value: 0, max: 20 },
        wis: { value: 0, max: 20 }, cha: { value: 0, max: 20 },
      },
    }
  }

  it('sem efeitos retorna atributos inalterados', () => {
    const r = getEffectiveAttributes(baseAttrs, emptyEffectsObj())
    expect(r).toEqual(baseAttrs)
  })

  it('Cinto de Força do Gigante das Nuvens: STR vira 27', () => {
    const ef = emptyEffectsObj()
    ef.attrSet.str = 27
    expect(getEffectiveAttributes(baseAttrs, ef).str).toBe(27)
  })

  it('attrSet com value menor que score atual NÃO desce', () => {
    const ef = emptyEffectsObj()
    ef.attrSet.cha = 18
    expect(getEffectiveAttributes({ ...baseAttrs, cha: 20 }, ef).cha).toBe(20)
  })

  it('Manual da Saúde: CON 13 + 2 = 15, respeitando max 22', () => {
    const ef = emptyEffectsObj()
    ef.attrBonus.con = { value: 2, max: 22 }
    expect(getEffectiveAttributes(baseAttrs, ef).con).toBe(15)
  })

  it('attrBonus não estoura max', () => {
    const ef = emptyEffectsObj()
    ef.attrBonus.wis = { value: 2, max: 20 }
    expect(getEffectiveAttributes({ ...baseAttrs, wis: 21 }, ef).wis).toBe(21)
  })
})
