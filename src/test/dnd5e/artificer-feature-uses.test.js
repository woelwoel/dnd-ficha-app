import { describe, it, expect } from 'vitest'
import { defaultClassFeatureUses } from '../../systems/dnd5e/domain/rules'

function artificer(level, int = 16) {
  return {
    info: { class: 'artifice', level, chosenFeatures: {}, multiclasses: [] },
    attributes: { str: 10, dex: 10, con: 10, int, wis: 10, cha: 10 },
  }
}
const byId = (arr, id) => arr.find(u => u.id === id)

describe('Artífice — recursos (classFeatureUses)', () => {
  it('nv7: Lampejo de Genialidade = INT mod usos, descanso longo', () => {
    const uses = defaultClassFeatureUses(artificer(7, 16)) // INT 16 → +3
    expect(byId(uses, 'artifice-flash-of-genius')).toMatchObject({
      name: 'Lampejo de Genialidade', max: 3, recharge: 'long',
    })
  })
  it('Lampejo respeita mínimo 1 com INT baixo', () => {
    expect(byId(defaultClassFeatureUses(artificer(7, 10)), 'artifice-flash-of-genius').max).toBe(1)
  })
  it('nv11: Item de Armazenar Magia = 2×INT mod, descanso longo', () => {
    const uses = defaultClassFeatureUses(artificer(11, 16)) // 2×3 = 6
    expect(byId(uses, 'artifice-spell-storing-item')).toMatchObject({ max: 6, recharge: 'long' })
  })
  it('nv6: nenhum dos dois recursos do Artífice', () => {
    const uses = defaultClassFeatureUses(artificer(6))
    expect(byId(uses, 'artifice-flash-of-genius')).toBeUndefined()
    expect(byId(uses, 'artifice-spell-storing-item')).toBeUndefined()
  })
})
