import { describe, it, expect } from 'vitest'
import { syncClassFeatureUses } from '../../systems/dnd5e/domain/rules'

describe('syncClassFeatureUses', () => {
  it('preserva tracker persistido que os defaults de classe não conhecem', () => {
    const c = {
      info: { class: 'guerreiro', level: 5, multiclasses: [], chosenFeatures: {} },
      attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 8 },
      combat: {
        classFeatureUses: [
          { id: 'guerreiro-action-surge', name: 'Surto de Ação', max: 1, used: 1, recharge: 'short', source: 'guerreiro' },
          { id: 'raca-elfo-negro-drow-fogo-das-fadas', name: 'Fogo Das Fadas (Magia Drow)', max: 1, used: 1, recharge: 'long', source: 'raca' },
        ],
      },
    }
    const next = syncClassFeatureUses(c).combat.classFeatureUses
    const racial = next.find(u => u.id === 'raca-elfo-negro-drow-fogo-das-fadas')
    expect(racial).toBeTruthy()
    expect(racial.used).toBe(1)
    expect(next.find(u => u.id === 'guerreiro-action-surge').used).toBe(1)
  })

  it('não duplica quando o tracker também está nos defaults', () => {
    const c = {
      info: { class: 'guerreiro', level: 5, multiclasses: [], chosenFeatures: {} },
      attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 8 },
      combat: {
        classFeatureUses: [
          { id: 'guerreiro-action-surge', name: 'Surto de Ação', max: 1, used: 1, recharge: 'short', source: 'guerreiro' },
        ],
      },
    }
    const next = syncClassFeatureUses(c).combat.classFeatureUses
    expect(next.filter(u => u.id === 'guerreiro-action-surge')).toHaveLength(1)
  })
})
