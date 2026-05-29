import { describe, it, expect } from 'vitest'
import { buildItemLookup } from '../domain/itemLookup'

/**
 * Testes unitários do que sustenta o fluxo "equipar arma → cria Attack".
 * O componente Inventory faz:
 *   1. itemLookup.resolve(name) → SRD entry
 *   2. detecta como arma (equipment_category Weapon ou tem damage)
 *   3. buildAttackFromWeaponSrd → preenche damageDice/properties/etc.
 *
 * Reproduzo os helpers aqui pra testar isolado (sem montar React).
 */

function isWeaponSrd(srd) {
  if (!srd) return false
  const cat = srd.equipment_category?.name ?? ''
  return /weapon/i.test(cat) || !!srd.damage
}

function buildAttackFromWeaponSrd(item, srd) {
  const props = (srd.properties ?? []).map(p => p.index)
  if (srd.weapon_range === 'Ranged') props.push('ranged')
  return {
    id: `weapon-${item.id}`,
    name: item.name,
    damageDice: srd.damage?.damage_dice ?? '1d6',
    damageType: srd.damage?.damage_type?.name ?? '',
    properties: props,
    proficient: true,
    magicBonus: 0,
    versatileDice: srd.two_handed_damage?.damage_dice,
    abilityOverride: '',
    notes: '',
    fromItemId: item.id,
  }
}

const SRD = [
  {
    index: 'handaxe', name: 'Handaxe',
    equipment_category: { name: 'Weapon' },
    weapon_range: 'Melee',
    damage: { damage_dice: '1d6', damage_type: { name: 'Slashing' } },
    properties: [{ index: 'light' }, { index: 'thrown' }],
  },
  {
    index: 'longbow', name: 'Longbow',
    equipment_category: { name: 'Weapon' },
    weapon_range: 'Ranged',
    damage: { damage_dice: '1d8', damage_type: { name: 'Piercing' } },
    properties: [{ index: 'two-handed' }, { index: 'heavy' }],
  },
  {
    index: 'longsword', name: 'Longsword',
    equipment_category: { name: 'Weapon' },
    weapon_range: 'Melee',
    damage: { damage_dice: '1d8', damage_type: { name: 'Slashing' } },
    two_handed_damage: { damage_dice: '1d10', damage_type: { name: 'Slashing' } },
    properties: [{ index: 'versatile' }],
  },
  {
    index: 'leather-armor', name: 'Leather Armor',
    equipment_category: { name: 'Armor' },
    armor_class: { base: 11 },
  },
  {
    index: 'rations', name: 'Rations',
    equipment_category: { name: 'Adventuring Gear' },
  },
]
const PT_WEAPONS = [
  { index: 'handaxe',   name: 'Machadinha' },
  { index: 'longbow',   name: 'Arco Longo' },
  { index: 'longsword', name: 'Espada Longa' },
]

describe('isWeaponSrd', () => {
  const lookup = buildItemLookup(SRD, PT_WEAPONS)

  it('detecta arma via equipment_category Weapon', () => {
    expect(isWeaponSrd(lookup.resolve('Handaxe'))).toBe(true)
    expect(isWeaponSrd(lookup.resolve('Machadinha'))).toBe(true)
  })

  it('detecta arma via PT name', () => {
    expect(isWeaponSrd(lookup.resolve('Arco Longo'))).toBe(true)
  })

  it('não detecta armadura', () => {
    expect(isWeaponSrd(lookup.resolve('Leather Armor'))).toBe(false)
  })

  it('não detecta adventuring gear', () => {
    expect(isWeaponSrd(lookup.resolve('Rations'))).toBe(false)
  })

  it('null pra item desconhecido', () => {
    expect(isWeaponSrd(lookup.resolve('Pacote do Aventureiro'))).toBe(false)
  })
})

describe('buildAttackFromWeaponSrd', () => {
  const lookup = buildItemLookup(SRD, PT_WEAPONS)

  it('Machadinha → attack id estável + propriedades light/thrown', () => {
    const item = { id: 'item-123', name: 'Machadinha' }
    const a = buildAttackFromWeaponSrd(item, lookup.resolve(item.name))
    expect(a.id).toBe('weapon-item-123')
    expect(a.damageDice).toBe('1d6')
    expect(a.damageType).toBe('Slashing')
    expect(a.properties).toEqual(['light', 'thrown'])
  })

  it('Arco Longo → adiciona "ranged" às propriedades quando weapon_range é Ranged', () => {
    const item = { id: 'bow-1', name: 'Arco Longo' }
    const a = buildAttackFromWeaponSrd(item, lookup.resolve(item.name))
    expect(a.properties).toContain('ranged')
    expect(a.properties).toContain('two-handed')
    expect(a.damageDice).toBe('1d8')
  })

  it('Espada Longa → preenche versatileDice via two_handed_damage', () => {
    const item = { id: 'sw-1', name: 'Espada Longa' }
    const a = buildAttackFromWeaponSrd(item, lookup.resolve(item.name))
    expect(a.versatileDice).toBe('1d10')
    expect(a.properties).toContain('versatile')
  })

  it('rastreia origem do item via fromItemId', () => {
    const item = { id: 'xyz', name: 'Handaxe' }
    const a = buildAttackFromWeaponSrd(item, lookup.resolve(item.name))
    expect(a.fromItemId).toBe('xyz')
  })
})
