import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spells } from '../../systems/dnd5e/components/CharacterSheet/Spells'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { DiceRollerProvider } from '../../context/DiceRollerContext'
import { mockSrdFetch } from './helpers'

/* ─────────────────────────────────────────────────────────────────────
   E2E — Aba Magias

   Cobre:
   - Mago: contadores Grimório/Preparadas, toggle preparar (★/☆)
   - Cast at higher level: picker ⚡ aparece e consome slot
   - Pact Magic do Bruxo: tracker roxo separado
   ────────────────────────────────────────────────────────────────────*/

const MAGO_CLASS = { index: 'mago', name: 'Mago', hit_die: 6, spellcasting_ability: 'Inteligência' }

function makeMagoCharacter(spells = []) {
  return {
    info: { name: 'Test Wizard', class: 'mago', level: 5, race: 'humano', multiclasses: [] },
    attributes: { str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 10 },
    combat: {
      maxHp: 28, currentHp: 28, tempHp: 0, armorClass: 12, speed: 30,
      attacks: [], deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
    },
    spellcasting: {
      ability: 'int',
      usedSlots: {},
      spells,
    },
  }
}

function ControlledSpells({ initialCharacter, classData = MAGO_CLASS }) {
  const [character, setCharacter] = useState(initialCharacter)
  return (
    <SrdProvider>
      <DiceRollerProvider>
        <Spells
          character={character}
          attributes={character.attributes}
          level={character.info.level}
          profBonus={3}
          classData={classData}
          onUpdateSpellcasting={(field, value) =>
            setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, [field]: value } }))
          }
          onAddSpell={(sp) =>
            setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, spells: [...c.spellcasting.spells, { ...sp, id: `id-${Date.now()}-${Math.random()}` }] } }))
          }
          onRemoveSpell={(id) =>
            setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, spells: c.spellcasting.spells.filter(s => s.id !== id) } }))
          }
          onTogglePrepared={(id) =>
            setCharacter(c => ({
              ...c,
              spellcasting: {
                ...c.spellcasting,
                spells: c.spellcasting.spells.map(s =>
                  s.id === id && s.level > 0
                    ? { ...s, prepared: s.prepared === false ? true : false }
                    : s
                ),
              },
            }))
          }
          onToggleSlot={(lvl, used) =>
            setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, usedSlots: { ...c.spellcasting.usedSlots, [lvl]: used } } }))
          }
          onSetConcentration={(sp) =>
            setCharacter(c => ({ ...c, combat: { ...c.combat, concentrating: sp ? { spellIndex: sp.index, spellName: sp.name } : { spellIndex: null, spellName: null } } }))
          }
        />
      </DiceRollerProvider>
    </SrdProvider>
  )
}

describe('Spells E2E (Mago)', () => {
  beforeEach(() => {
    mockSrdFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mostra contadores Grimório e Preparadas para Mago', async () => {
    const spells = [
      { id: 's1', index: 'bola-de-fogo', name: 'Bola de Fogo', level: 3, school: 'Evocação', prepared: true },
      { id: 's2', index: 'misseis-magicos', name: 'Mísseis Mágicos', level: 1, school: 'Evocação', prepared: false },
    ]
    render(<ControlledSpells initialCharacter={makeMagoCharacter(spells)} />)
    await waitFor(() => expect(screen.getByText(/Grimório:/)).toBeInTheDocument())
    expect(screen.getByText(/Preparadas:/)).toBeInTheDocument()
  })

  it('alternar ★/☆ muda o estado de preparação', async () => {
    const spells = [
      { id: 's1', index: 'bola-de-fogo', name: 'Bola de Fogo', level: 3, school: 'Evocação', prepared: true },
    ]
    const user = userEvent.setup()
    render(<ControlledSpells initialCharacter={makeMagoCharacter(spells)} />)
    // Procura o botão de toggle de preparação
    const star = await screen.findByRole('button', { name: /preparar/i })
    expect(star).toHaveTextContent('★')
    await user.click(star)
    // Após clicar, vira ☆ (despreparada)
    await waitFor(() => {
      const t = screen.getByRole('button', { name: /preparar/i })
      expect(t).toHaveTextContent('☆')
    })
  })

  it('botão ⚡ Conjurar abre picker de slot e consome ao clicar', async () => {
    const spells = [
      { id: 's1', index: 'bola-de-fogo', name: 'Bola de Fogo', level: 3, school: 'Evocação', prepared: true },
    ]
    const user = userEvent.setup()
    render(<ControlledSpells initialCharacter={makeMagoCharacter(spells)} />)
    // Mago 5 tem slots: lvl 1=4, 2=3, 3=2
    // Aguarda o botão ⚡ aparecer
    const castBtn = await screen.findByTitle(/Conjurar/i)
    await user.click(castBtn)
    // Picker mostra "Nv 3 (2)"
    const nv3Btn = await screen.findByRole('button', { name: /Nv 3 \(2\)/i })
    expect(nv3Btn).toBeInTheDocument()
    await user.click(nv3Btn)
    // Após conjurar, badge "✓ Nv 3" aparece
    await waitFor(() => {
      expect(screen.getByText(/✓ Nv 3/)).toBeInTheDocument()
    })
  })

  it('cast at higher level: oferece slots ≥ nível da magia', async () => {
    const spells = [
      { id: 's1', index: 'misseis-magicos', name: 'Mísseis Mágicos', level: 1, school: 'Evocação', prepared: true },
    ]
    const user = userEvent.setup()
    render(<ControlledSpells initialCharacter={makeMagoCharacter(spells)} />)
    const castBtn = await screen.findByTitle(/Conjurar/i)
    await user.click(castBtn)
    // Mago 5: slots 1, 2, 3 disponíveis (>= 1) — espera que pelo menos o de Nv 3 com ↑ apareça
    expect(await screen.findByRole('button', { name: /Nv 1/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Nv 2/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Nv 3/i })).toBeInTheDocument()
  })

  it('truques não exibem botão de preparar nem botão de conjurar (sempre castáveis)', async () => {
    const spells = [
      { id: 'c1', index: 'prestidigitacao', name: 'Prestidigitação', level: 0, school: 'Transmutação' },
    ]
    render(<ControlledSpells initialCharacter={makeMagoCharacter(spells)} />)
    await waitFor(() => expect(screen.getByText('Prestidigitação')).toBeInTheDocument())
    // Não deve haver botão de conjurar (truques não usam slot)
    expect(screen.queryByTitle(/Conjurar/i)).toBeNull()
  })
})

describe('Spells E2E (Bruxo - Pact Magic)', () => {
  beforeEach(() => {
    mockSrdFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exibe tracker de Pact Magic separado para Bruxo', async () => {
    const character = {
      info: { name: 'Test Warlock', class: 'bruxo', level: 5, race: 'tiefling', multiclasses: [] },
      attributes: { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
      combat: { maxHp: 35, currentHp: 35, attacks: [], concentrating: { spellIndex: null, spellName: null } },
      spellcasting: { ability: 'cha', usedSlots: {}, pactSlotsUsed: 0, spells: [] },
    }
    render(
      <ControlledSpells
        initialCharacter={character}
        classData={{ index: 'bruxo', name: 'Bruxo', hit_die: 8, spellcasting_ability: 'Carisma' }}
      />
    )
    await waitFor(() => expect(screen.getByText(/Pact Magic/i)).toBeInTheDocument())
    expect(screen.getByText(/Bruxo Nv 5/i)).toBeInTheDocument()
    expect(screen.getByText(/Sempre no nível mais alto disponível/i)).toBeInTheDocument()
  })
})
