import { describe, it, expect, vi } from 'vitest'
import { enrichWithClericDomainSpells } from '../systems/dnd5e/components/CharacterSheet/levelProgression/domainSpells'

vi.mock('../systems/dnd5e/domain/rules', () => ({
  getClericDomainSpellIndices: () => ['bless', 'cure-wounds'],
}))

// Re-import after mock — vitest hoists vi.mock, so this is fine inline.
// But we need to use a relative path to the file actually under test.

const srdSpells = [
  { index: 'bless', name: 'Benção', level: 1, school: { name: 'Encantamento' }, casting_time: '1 ação', range: 'Toque', duration: '1 min', concentration: true, components: ['V', 'S'], desc: 'desc1', ritual: false },
  { index: 'cure-wounds', name: 'Curar Ferimentos', level: 1, school: 'Evocação', casting_time: '1 ação', range: 'Toque', duration: 'Inst.', concentration: false, components: 'V,S', desc: 'desc2', ritual: false },
]

describe('enrichWithClericDomainSpells', () => {
  it('retorna patch inalterado para multiclasse', () => {
    const patch = { multiclassIndex: 0, newLevel: 3, newChoices: { divine_domain: 'vida' } }
    const out = enrichWithClericDomainSpells({ patch, classIndex: 'clerigo', chosenFeatures: {}, srdSpells })
    expect(out).toBe(patch)
  })

  it('retorna patch inalterado para classe não-clérigo', () => {
    const patch = { multiclassIndex: null, newLevel: 3, newChoices: {} }
    const out = enrichWithClericDomainSpells({ patch, classIndex: 'guerreiro', chosenFeatures: {}, srdSpells })
    expect(out).toBe(patch)
  })

  it('retorna patch inalterado em nível sem concessão de domínio', () => {
    const patch = { multiclassIndex: null, newLevel: 4, newChoices: { divine_domain: 'vida' } }
    const out = enrichWithClericDomainSpells({ patch, classIndex: 'clerigo', chosenFeatures: {}, srdSpells })
    expect(out).toBe(patch)
  })

  it('retorna patch inalterado quando não há domínio escolhido', () => {
    const patch = { multiclassIndex: null, newLevel: 3, newChoices: {} }
    const out = enrichWithClericDomainSpells({ patch, classIndex: 'clerigo', chosenFeatures: {}, srdSpells })
    expect(out).toBe(patch)
  })

  it('adiciona bonusSpells quando clérigo + nível elegível + domínio definido', () => {
    const patch = { multiclassIndex: null, newLevel: 3, newChoices: { divine_domain: 'vida' }, bonusSpells: [] }
    const out = enrichWithClericDomainSpells({ patch, classIndex: 'clerigo', chosenFeatures: {}, srdSpells })
    expect(out).not.toBe(patch)
    expect(out.bonusSpells).toHaveLength(2)
    expect(out.bonusSpells[0]).toMatchObject({ index: 'bless', source: 'domain', school: 'Encantamento' })
    expect(out.bonusSpells[1]).toMatchObject({ index: 'cure-wounds', source: 'domain', school: 'Evocação' })
  })

  it('preserva bonusSpells existentes', () => {
    const existing = { index: 'magic-missile', name: 'Mísseis Mágicos' }
    const patch = { multiclassIndex: null, newLevel: 1, newChoices: { divine_domain: 'vida' }, bonusSpells: [existing] }
    const out = enrichWithClericDomainSpells({ patch, classIndex: 'clerigo', chosenFeatures: {}, srdSpells })
    expect(out.bonusSpells).toHaveLength(3)
    expect(out.bonusSpells[0]).toBe(existing)
  })

  it('usa chosenFeatures.divine_domain como fallback', () => {
    const patch = { multiclassIndex: null, newLevel: 5, newChoices: {}, bonusSpells: [] }
    const chosen = { divine_domain: 'vida' }
    const out = enrichWithClericDomainSpells({ patch, classIndex: 'clerigo', chosenFeatures: chosen, srdSpells })
    expect(out.bonusSpells).toHaveLength(2)
  })
})
