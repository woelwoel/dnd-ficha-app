import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildCharacter } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'
import { getSpellSlots } from '../../utils/spellcasting'

// Classe Artífice real (gerada do PDF do Tasha).
const artifice = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/srd-data/tasha-classes-pt.json'), 'utf-8'),
).find((c) => c.index === 'artifice')

// Artífice nível 3, Ferreiro de Batalha, INT como atributo principal.
const draft = {
  ...INITIAL_DRAFT_V2,
  name: 'Tarsila',
  class: 'artifice',
  level: 3,
  baseAttributes: { str: 10, dex: 14, con: 14, int: 16, wis: 12, cha: 8 },
  savingThrows: ['con', 'int'],
  spellcastingAbility: 'int',
  chosenSkills: ['arcanismo', 'investigacao'],
  chosenFeatures: { artificer_specialization: 'ferreiro-de-batalha' },
  settings: { ...INITIAL_DRAFT_V2.settings, sources: ['phb', 'tasha'], abilityScoreMethod: 'manual' },
}

describe('Artífice — integração ponta-a-ponta (build-character)', () => {
  const c = buildCharacter(draft, artifice, {})

  it('a classe Artífice existe nos dados e é meio-conjuradora de INT', () => {
    expect(artifice).toBeTruthy()
    expect(artifice.hit_die).toBe(8)
    expect(artifice.spellcasting_ability).toBe('Inteligência')
  })

  it('monta info da classe e nível', () => {
    expect(c.info.class).toBe('artifice')
    expect(c.info.level).toBe(3)
  })

  it('PV usa dado de vida d8 (8 + CON×3 níveis, média a partir do 2º)', () => {
    // d8: nv1 = 8 + CON; nv2,3 = 5 (média) + CON cada. CON 14 → +2/nível.
    // 8 + 2 + (5+2) + (5+2) = 24
    expect(c.combat.hitDice.pool).toHaveProperty('d8')
    expect(c.combat.hitDice.pool.d8.total).toBe(3)
    expect(c.combat.maxHp).toBe(24)
  })

  it('salvaguardas de Constituição e Inteligência', () => {
    expect(c.proficiencies.savingThrows).toEqual(expect.arrayContaining(['con', 'int']))
  })

  it('conjuração configurada para Inteligência', () => {
    expect(c.spellcasting.ability).toBe('int')
  })

  it('subclasse (especialização) registrada em chosenFeatures', () => {
    expect(c.info.chosenFeatures.artificer_specialization).toBe('ferreiro-de-batalha')
  })

  it('slots de magia do nível 3 vêm do motor: 3 de 1º círculo', () => {
    expect(getSpellSlots('artifice', 3, [])).toEqual({ 1: 3 })
  })

  it('atributos finais aplicados (INT 16)', () => {
    expect(c.attributes.int).toBe(16)
  })
})
