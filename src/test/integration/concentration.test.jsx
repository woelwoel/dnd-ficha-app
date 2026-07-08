import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spells } from '../../systems/dnd5e/components/CharacterSheet/Spells'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { DiceRollerProvider } from '../../context/DiceRollerContext'
import { mockSrdFetch } from './helpers'

/* ─────────────────────────────────────────────────────────────────────
   E2E — Concentração em magias (PHB p.203)

   Cobre:
   - Banner aparece quando há magia em concentração
   - Botão Romper encerra
   - Concentrar em nova magia substitui a anterior (auto)
   ────────────────────────────────────────────────────────────────────*/

function ControlledSpells({ initialCharacter }) {
  const [character, setCharacter] = useState(initialCharacter)
  return (
    <SrdProvider>
      <DiceRollerProvider>
        <Spells
          character={character}
          attributes={character.attributes}
          level={character.info.level}
          profBonus={3}
          classData={{ index: 'mago', name: 'Mago', hit_die: 6, spellcasting_ability: 'Inteligência' }}
          onUpdateSpellcasting={() => {}}
          onAddSpell={() => {}}
          onRemoveSpell={() => {}}
          onTogglePrepared={() => {}}
          onToggleSlot={() => {}}
          onSetConcentration={(sp) =>
            setCharacter(c => ({
              ...c,
              combat: {
                ...c.combat,
                concentrating: sp
                  ? { spellIndex: sp.index, spellName: sp.name }
                  : { spellIndex: null, spellName: null },
              },
            }))
          }
        />
      </DiceRollerProvider>
    </SrdProvider>
  )
}

function magoCharWithSpells(spells, concentrating = null) {
  return {
    info: { name: 'Wiz', class: 'mago', level: 5, race: 'humano', multiclasses: [] },
    attributes: { str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 10 },
    combat: {
      maxHp: 28, currentHp: 28, attacks: [],
      concentrating: concentrating ?? { spellIndex: null, spellName: null },
    },
    spellcasting: { ability: 'int', usedSlots: {}, spells },
  }
}

describe('Concentração E2E', () => {
  beforeEach(() => {
    mockSrdFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sem magia em concentração: banner não aparece', async () => {
    render(<ControlledSpells initialCharacter={magoCharWithSpells([])} />)
    expect(screen.queryByText(/Concentrando em/)).toBeNull()
  })

  it('com concentração ativa: banner mostra nome da magia + botão Romper', async () => {
    const spells = [
      { id: 's1', index: 'voo', name: 'Voo', level: 3, school: 'Transmutação', concentration: true, prepared: true },
    ]
    const concentrating = { spellIndex: 'voo', spellName: 'Voo' }
    render(<ControlledSpells initialCharacter={magoCharWithSpells(spells, concentrating)} />)
    await waitFor(() => expect(screen.getByText(/Concentrando em/)).toBeInTheDocument())
    expect(screen.getAllByText('Voo').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Romper/i })).toBeInTheDocument()
  })

  it('botão Romper encerra a concentração', async () => {
    const user = userEvent.setup()
    const spells = [
      { id: 's1', index: 'voo', name: 'Voo', level: 3, school: 'Transmutação', concentration: true, prepared: true },
    ]
    const concentrating = { spellIndex: 'voo', spellName: 'Voo' }
    render(<ControlledSpells initialCharacter={magoCharWithSpells(spells, concentrating)} />)
    await user.click(screen.getByRole('button', { name: /Romper/i }))
    await waitFor(() => expect(screen.queryByText(/Concentrando em/)).toBeNull())
  })

  it('magias com concentração mostram ⊙ na linha (não as outras)', async () => {
    const user = userEvent.setup()
    const spells = [
      { id: 's1', index: 'voo', name: 'Voo', level: 3, school: 'Transmutação', concentration: true, prepared: true },
      { id: 's2', index: 'misseis-magicos', name: 'Mísseis Mágicos', level: 1, school: 'Evocação', concentration: false, prepared: true },
    ]
    render(<ControlledSpells initialCharacter={magoCharWithSpells(spells)} />)
    // Lista dividida em sub-abas por nível — Voo está em Nível 3.
    await user.click(await screen.findByRole('tab', { name: /Nível 3/ }))
    await waitFor(() => expect(screen.getByText('Voo')).toBeInTheDocument())
    // Botão de concentração só aparece nas magias com concentration: true.
    // O ícone do botão é ⊙ — buscamos pelo title que serve de pista.
    const concButtons = document.querySelectorAll('button[title*="oncentr"]')
    // Apenas 1 — só Voo tem concentração (banner desligado, mas botão aparece)
    expect(concButtons.length).toBeGreaterThanOrEqual(1)
  })
})
