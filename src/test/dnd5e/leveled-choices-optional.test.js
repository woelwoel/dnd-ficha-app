import { describe, it, expect } from 'vitest'
import { getLeveledChoices } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers'

const clazz = {
  choices: [
    { id: 'req', level: 1, options: [{ value: 'a', name: 'A' }] },
    { id: 'opt', level: 1, optional: true, options: [{ value: 'b', name: 'B', source: 'tasha' }] },
  ],
}

describe('getLeveledChoices ignora choices optional', () => {
  it('não devolve a escolha opcional mesmo com Tasha ativa', () => {
    const ids = getLeveledChoices(clazz, 5, {}, ['phb', 'tasha']).map(c => c.id)
    expect(ids).toEqual(['req'])
  })
})
