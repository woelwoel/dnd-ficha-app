import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spells } from '../../systems/dnd5e/components/CharacterSheet/Spells'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { DiceRollerProvider } from '../../context/DiceRollerContext'
import { mockSrdFetch } from './helpers'

const GUERREIRO = { index: 'guerreiro', name: 'Guerreiro', hit_die: 10 }

// Guerreiro drow nv5: NENHUM espaço de magia — só os usos do traço racial.
function makeDrow(spells) {
  return {
    info: { name: 'Zaknafein', class: 'guerreiro', level: 5, race: 'elfo', subrace: 'elfo-negro-drow', multiclasses: [], feats: [] },
    attributes: { str: 16, dex: 16, con: 14, int: 10, wis: 12, cha: 14 },
    combat: {
      maxHp: 44, currentHp: 44, armorClass: 16, attacks: [], classFeatureUses: [],
      concentrating: { spellIndex: null, spellName: null },
    },
    spellcasting: { ability: null, usedSlots: {}, spells },
  }
}

const FOGO = {
  id: 'r1', index: 'fogo-das-fadas', name: 'Fogo Das Fadas', level: 1, school: 'Evocação',
  ability: 'cha', alwaysPrepared: true, prepared: true, source: 'race', sourceLabel: 'Magia Drow',
  raceCreated: true, raceGrants: [{ raceKey: 'elfo-negro-drow', grantIdx: 1 }],
}

const TRACKER = {
  id: 'raca-elfo-negro-drow-fogo-das-fadas', name: 'Fogo Das Fadas (Magia Drow)',
  max: 1, used: 0, recharge: 'long', source: 'raca',
}

function Harness({ initial }) {
  const [character, setCharacter] = useState(initial)
  const featureUses = character.combat.classFeatureUses.length
    ? character.combat.classFeatureUses
    : [TRACKER]
  return (
    <SrdProvider>
      <DiceRollerProvider>
        <Spells
          character={character}
          attributes={character.attributes}
          level={5}
          profBonus={3}
          classData={GUERREIRO}
          featureUses={featureUses}
          onSpendFeatureUse={(id) => setCharacter(c => ({
            ...c,
            combat: {
              ...c.combat,
              classFeatureUses: featureUses.map(u =>
                u.id === id ? { ...u, used: Math.min(u.max, (u.used ?? 0) + 1) } : u),
            },
          }))}
          onUpdateSpellcasting={() => {}}
          onAddSpell={() => {}}
          onRemoveSpell={() => {}}
          onTogglePrepared={() => {}}
          onToggleSlot={() => {}}
          onSetConcentration={() => {}}
        />
      </DiceRollerProvider>
    </SrdProvider>
  )
}

describe('Magias raciais na aba Magias', () => {
  beforeEach(() => { mockSrdFetch() })
  afterEach(() => { vi.restoreAllMocks() })

  it('Guerreiro drow (sem espaço nenhum) consegue conjurar pelo uso do traço', async () => {
    const user = userEvent.setup()
    render(<Harness initial={makeDrow([FOGO])} />)
    const castBtn = await screen.findByTitle(/Conjurar/i)
    expect(castBtn).toBeEnabled()
    await user.click(castBtn)

    const freeBtn = await screen.findByRole('button', { name: /1×\/desc\. longo \(1\)/i })
    expect(freeBtn).toBeEnabled()
    // Sem espaços: nenhum botão "Nv N"
    expect(screen.queryByRole('button', { name: /^Nv \d/ })).toBeNull()

    await user.click(freeBtn)

    // Uso gasto: reabrindo, o botão aparece zerado e desabilitado.
    await user.click(await screen.findByTitle(/Conjurar/i))
    const gasto = await screen.findByRole('button', { name: /1×\/desc\. longo \(0\)/i })
    expect(gasto).toBeDisabled()
  })

  it('truque racial continua rolando pelo botão-raio (sem tracker)', async () => {
    const truque = {
      id: 'r0', index: 'globos-de-luz', name: 'Globos De Luz', level: 0, ability: 'cha',
      alwaysPrepared: true, source: 'race', sourceLabel: 'Magia Drow', raceCreated: true,
      raceGrants: [{ raceKey: 'elfo-negro-drow', grantIdx: 0 }],
    }
    render(<Harness initial={makeDrow([truque])} />)
    await waitFor(() => expect(screen.getByText('Globos De Luz')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /1×\/desc/i })).toBeNull()
  })
})
