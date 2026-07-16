import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spells } from '../../systems/dnd5e/components/CharacterSheet/Spells'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { mockSrdFetch } from '../integration/helpers'

/* ─────────────────────────────────────────────────────────────────────
   Fecha o gap descoberto na verificação por mutação do Task 6: reverter
   o ctx de `spellRollPlan` pro global (spellAttack/spellMod/spellSaveDC)
   não quebrava nenhum teste existente — ou seja, o CAMINHO DE CONJURAÇÃO
   em si não tinha cobertura de que usa o `ability` PRÓPRIO da magia.
   Este teste fecha isso: conjura uma magia com `ability` diferente do
   global e confirma que a CD rolada reflete o atributo da MAGIA.
   ────────────────────────────────────────────────────────────────────*/

const { rollCalls } = vi.hoisted(() => ({ rollCalls: [] }))
vi.mock('../../hooks/useDiceRoller', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useDiceRoller: () => ({
      roll: (notation, label, opts = {}) => {
        rollCalls.push({ notation, label, opts })
        return { notation, sides: 6, rolls: [3], modifier: 0, total: 3, count: 1, mode: 'normal' }
      },
      dice3d: false, setDice3d: () => {}, setDiceAccent: () => {},
      openPanel: () => {}, history: [], open: false, mode: 'normal',
    }),
  }
})

const MAGO = { index: 'mago', name: 'Mago', hit_die: 6, spellcasting_ability: 'Inteligência' }

function makeMago() {
  return {
    info: { name: 'Test Wizard', class: 'mago', level: 5, race: 'humano', multiclasses: [] },
    // int=16 (global) vs cha=16 usado pela magia de talento — profBonus 3:
    // global (int) → CD 8+3+3=14; talento (cha) → CD 8+3+3=14 também se
    // cha=16. Usamos cha=12 (mod +1) pra diferenciar claramente: CD 12.
    attributes: { str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 12 },
    combat: {
      maxHp: 28, currentHp: 28, tempHp: 0, armorClass: 12, speed: 30,
      attacks: [], deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
    },
    spellcasting: {
      ability: 'int',
      usedSlots: {},
      // Bola de Fogo "concedida por talento" — só pra teste, tagged com
      // ability: 'cha' simulando uma magia de talento cuja mecânica de
      // dano/CD existe no spell-mechanics-pt.json.
      spells: [{ id: 's1', index: 'bola-de-fogo', name: 'Bola de Fogo', level: 3, school: 'Evocação', prepared: true, ability: 'cha' }],
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
        profBonus={3}
        classData={MAGO}
        onUpdateSpellcasting={() => {}}
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

describe('conjurar magia de talento usa a CD da MAGIA, não a global', () => {
  beforeEach(() => {
    mockSrdFetch()
    rollCalls.length = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('CD rolada vem de CAR (mod +1 → CD 12), não de INT (mod +3 → CD 14)', async () => {
    const user = userEvent.setup()
    render(<ControlledSpells initialCharacter={makeMago()} />)
    const cast = await screen.findByRole('button', { name: 'Conjurar' })
    await user.click(cast)
    await user.click(await screen.findByRole('button', { name: /^Nv 3/ }))
    await waitFor(() => expect(rollCalls).toHaveLength(1))
    expect(rollCalls[0].label).toContain('CD 12')
    expect(rollCalls[0].label).not.toContain('CD 14')
  })
})
