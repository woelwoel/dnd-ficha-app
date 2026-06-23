import { describe, it, expect } from 'vitest'
import { buildItemLookup, enrichItemDisplay } from '../systems/dnd5e/domain/itemLookup'

const SRD = [
  { index: 'greatsword', name: 'Greatsword', weight: 6, cost: { quantity: 50, unit: 'gp' }, damage: { damage_dice: '2d6' } },
  { index: 'chain-mail', name: 'Chain Mail', weight: 55, cost: { quantity: 75, unit: 'gp' }, armor_class: { base: 16, dex_bonus: false } },
  { index: 'shield',     name: 'Shield',     weight: 6,  cost: { quantity: 10, unit: 'gp' }, armor_class: { base: 2, dex_bonus: false } },
  { index: 'handaxe',    name: 'Handaxe',    weight: 2,  cost: { quantity: 5,  unit: 'gp' }, damage: { damage_dice: '1d6' } },
  { index: 'leather-armor',         name: 'Leather Armor',         weight: 10, cost: { quantity: 10, unit: 'gp' }, armor_class: { base: 11, dex_bonus: true } },
  { index: 'studded-leather-armor', name: 'Studded Leather Armor', weight: 13, cost: { quantity: 45, unit: 'gp' }, armor_class: { base: 12, dex_bonus: true } },
  { index: 'plate-armor',           name: 'Plate Armor',           weight: 65, cost: { quantity: 1500, unit: 'gp' }, armor_class: { base: 18 } },
]
const PT_WEAPONS = [
  { index: 'greatsword', name: 'Espadão' },
  { index: 'handaxe',    name: 'Machadinha' },
]

describe('itemLookup', () => {
  const lookup = buildItemLookup(SRD, PT_WEAPONS)

  it('resolve nome PT de arma → SRD', () => {
    expect(lookup.resolve('Espadão')?.index).toBe('greatsword')
    expect(lookup.resolve('machadinha')?.index).toBe('handaxe')
  })

  it('resolve nome PT de armadura via alias', () => {
    expect(lookup.resolve('Cota de Malha')?.index).toBe('chain-mail')
    expect(lookup.resolve('Escudo')?.index).toBe('shield')
  })

  it('resolve armaduras com sufixo "-armor" no SRD (leather, plate, etc.)', () => {
    expect(lookup.resolve('Armadura de Couro')?.index).toBe('leather-armor')
    expect(lookup.resolve('Couro')?.index).toBe('leather-armor')
    expect(lookup.resolve('Armadura de Couro Batido')?.index).toBe('studded-leather-armor')
    expect(lookup.resolve('Armadura de Placas')?.index).toBe('plate-armor')
  })

  it('resolve nome EN exato', () => {
    expect(lookup.resolve('Greatsword')?.index).toBe('greatsword')
  })

  it('retorna null pra desconhecido', () => {
    expect(lookup.resolve('uma pá')).toBeNull()
    expect(lookup.resolve('')).toBeNull()
  })

  it('enrichItemDisplay preenche peso e notas pra item do wizard', () => {
    const out = enrichItemDisplay({ name: 'Espadão', qty: 1, weight: '', notes: '' }, lookup)
    expect(out.weight).toBe('6lb')
    expect(out.notes).toContain('Dano: 2d6')
    expect(out.notes).toContain('Custo: 50gp')
  })

  it('respeita valores existentes do usuário', () => {
    const out = enrichItemDisplay({ name: 'Espadão', qty: 1, weight: '99lb', notes: 'meu item' }, lookup)
    expect(out.weight).toBe('99lb')
    expect(out.notes).toBe('meu item')
  })

  it('retorna campos vazios pra item desconhecido', () => {
    const out = enrichItemDisplay({ name: 'uma pá', qty: 1, weight: '', notes: '' }, lookup)
    expect(out).toEqual({ weight: '', notes: '' })
  })
})
