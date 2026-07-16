import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { Spells } from '../../systems/dnd5e/components/CharacterSheet/Spells'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { mockSrdFetch } from '../integration/helpers'

/* ─────────────────────────────────────────────────────────────────────
   Fix do bug que originou o sub-projeto de magias-talento: um Guerreiro
   (não-conjurador) com o talento "Tocado pelas Fadas" ganha Passo Nebuloso.
   A magia carrega `ability: 'cha'` (curada pelas Tasks 1-5); a linha da
   ficha precisa mostrar a CD calculada a partir de CAR, não do global
   (que é null pra não-conjurador).
   ────────────────────────────────────────────────────────────────────*/

// Evita depender do DiceRollerProvider — esta suíte só verifica o badge,
// não conjura nada.
vi.mock('../../hooks/useDiceRoller', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useDiceRoller: () => ({
      roll: () => ({}),
      dice3d: false, setDice3d: () => {}, setDiceAccent: () => {},
      openPanel: () => {}, history: [], open: false, mode: 'normal',
    }),
  }
})

const GUERREIRO_CLASS = { index: 'guerreiro', name: 'Guerreiro', hit_die: 10, spellcasting_ability: null }

function makeFighterWithFeatSpell() {
  return {
    info: { name: 'Test Fighter', class: 'guerreiro', level: 4, race: 'humano', multiclasses: [] },
    attributes: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 16 },
    combat: {
      maxHp: 36, currentHp: 36, tempHp: 0, armorClass: 16, speed: 30,
      attacks: [], deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
    },
    spellcasting: {
      ability: null,
      usedSlots: {},
      spells: [
        {
          id: 'feat-1', index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2,
          school: 'Conjuração', prepared: true, ability: 'cha',
          featGrants: [{ featIndex: 'tocado-pelas-fadas', featGrant: true }],
        },
      ],
    },
  }
}

function ControlledSpells({ initialCharacter }) {
  const [character, setCharacter] = useState(initialCharacter)
  return (
    <SrdProvider>
      <Spells
        character={character}
        attributes={character.attributes}
        level={character.info.level}
        profBonus={2}
        classData={GUERREIRO_CLASS}
        onUpdateSpellcasting={(field, value) =>
          setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, [field]: value } }))
        }
        onAddSpell={() => {}}
        onRemoveSpell={() => {}}
        onTogglePrepared={() => {}}
        onToggleSlot={(lvl, used) =>
          setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, usedSlots: { ...c.spellcasting.usedSlots, [lvl]: used } } }))
        }
        onSetConcentration={() => {}}
      />
    </SrdProvider>
  )
}

describe('badge de magia de talento na linha (Guerreiro + Tocado pelas Fadas)', () => {
  beforeEach(() => {
    mockSrdFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mostra CD 13 · CAR na linha da magia, mesmo sem conjuração de classe', async () => {
    render(<ControlledSpells initialCharacter={makeFighterWithFeatSpell()} />)
    await waitFor(() => expect(screen.getByText('Passo Nebuloso')).toBeInTheDocument())
    // Guerreiro não é conjurador: o card "Conjuração" mostra "—".
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    // A linha da magia mostra a CD/atributo PRÓPRIO dela (CAR 16, prof +2 → CD 13).
    expect(screen.getByText('CD 13 · CAR')).toBeInTheDocument()
  })
})
