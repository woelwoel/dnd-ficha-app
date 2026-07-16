import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spells } from '../../systems/dnd5e/components/CharacterSheet/Spells'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { mockSrdFetch } from '../integration/helpers'

/* ─────────────────────────────────────────────────────────────────────
   Fix do bug que originou o sub-projeto de magias-talento: um Guerreiro
   (não-conjurador) com o talento "Tocado pelas Fadas" ganha Passo Nebuloso.
   A magia carrega `ability: 'cha'` (curada pelas Tasks 1-5); a linha da
   ficha precisa mostrar a matemática a partir de CAR, não do global (que é
   null pra não-conjurador).

   O badge só AFIRMA um número quando a magia tem o que rolar:
   - Sussurros Dissonantes (nv1, encantamento, salvaguarda de SAB) → "CD 13 · CAR"
   - Raio de Fogo (truque com jogada de ataque)                    → "+5 · CAR"
   - Passo Nebuloso (teleporte, sem CD nem ataque)                 → só "CAR"

   As três são escolhas REAIS de talento, não fixtures inventadas:
   - Tocado pelas Fadas concede Passo Nebuloso (fixa) e um nv1 de
     adivinhação/encantamento — o grant `choose` não filtra por lista de
     classe, então Sussurros Dissonantes é elegível;
   - Atirador de Magia (`ability: 'byList'`) escolhendo feiticeiro dá CAR e
     um truque com jogada de ataque (Raio de Fogo).
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

const PASSO_NEBULOSO = {
  id: 'feat-1', index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2,
  school: 'Conjuração', prepared: true, ability: 'cha',
  featGrants: [{ featIndex: 'tocado-pelas-fadas', featGrant: 0 }],
}

const SUSSURROS = {
  id: 'feat-2', index: 'sussurros-dissonantes', name: 'Sussurros Dissonantes', level: 1,
  school: 'Encantamento', prepared: true, ability: 'cha',
  featGrants: [{ featIndex: 'tocado-pelas-fadas', featGrant: 1 }],
}

const RAIO_DE_FOGO = {
  id: 'feat-3', index: 'raio-de-fogo', name: 'Raio de Fogo', level: 0,
  school: 'Evocação', ability: 'cha',
  featGrants: [{ featIndex: 'atirador-de-magia', featGrant: 0 }],
}

// CAR 16 (mod +3) + prof 2 → CD 13. Guerreiro não tem conjuração de classe.
function makeFighter(spells) {
  return {
    info: { name: 'Test Fighter', class: 'guerreiro', level: 4, race: 'humano', multiclasses: [] },
    attributes: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 16 },
    combat: {
      maxHp: 36, currentHp: 36, tempHp: 0, armorClass: 16, speed: 30,
      attacks: [], deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
    },
    spellcasting: { ability: null, usedSlots: {}, spells },
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

  it('magia de talento COM salvaguarda mostra a CD', async () => {
    render(<ControlledSpells initialCharacter={makeFighter([SUSSURROS])} />)
    await waitFor(() => expect(screen.getByText('Sussurros Dissonantes')).toBeInTheDocument())
    // Sussurros Dissonantes tem salvaguarda de SAB → a CD é real e sai de CAR.
    await waitFor(() => expect(screen.getByText('CD 13 · CAR')).toBeInTheDocument())
  })

  it('magia de talento COM jogada de ataque mostra o bônus, não uma CD', async () => {
    render(<ControlledSpells initialCharacter={makeFighter([RAIO_DE_FOGO])} />)
    const nome = await screen.findByText('Raio de Fogo')
    const row = nome.closest('div.bg-gray-900')
    // Raio de Fogo é ataque à distância: CAR 16 (+3) + prof 2 → +5.
    await waitFor(() => expect(within(row).getByText('+5 · CAR')).toBeInTheDocument())
    expect(within(row).queryByText(/CD/)).toBeNull()
  })

  it('magia de talento SEM salvaguarda mostra só o atributo (não inventa CD)', async () => {
    // Ficha com as DUAS magias de propósito: `spellMechanics` é lazy, e o badge
    // degrada pro atributo puro enquanto carrega. Asserir "só CAR" logo no
    // primeiro render passaria mesmo com a lógica quebrada, só por corrida.
    // Esperar a CD dos Sussurros (nv1, aba default) prova que o dataset chegou;
    // só então a ausência de CD no Passo Nebuloso (nv2) significa algo.
    const user = userEvent.setup()
    render(<ControlledSpells initialCharacter={makeFighter([SUSSURROS, PASSO_NEBULOSO])} />)
    await screen.findByText('CD 13 · CAR')

    await user.click(screen.getByRole('tab', { name: /Nível 2/ }))
    const nome = await screen.findByText('Passo Nebuloso')
    // A linha inteira da magia (o card que contém o nome).
    const row = nome.closest('div.bg-gray-900')
    // Proveniência continua visível...
    expect(within(row).getByText('CAR')).toBeInTheDocument()
    // ...mas Passo Nebuloso é teleporte: NÃO tem CD nem ataque pra afirmar.
    // Guard de regressão do fix — o badge não pode inventar uma regra.
    expect(within(row).queryByText(/CD/)).toBeNull()
  })

  it('o card Conjuração do Guerreiro continua sem CD (magia de talento não vira CD de classe)', async () => {
    render(<ControlledSpells initialCharacter={makeFighter([SUSSURROS])} />)
    await waitFor(() => expect(screen.getByText('Sussurros Dissonantes')).toBeInTheDocument())
    // Escopo explícito: só o card "Conjuração", não qualquer "—" da página.
    const header = screen.getByText('Conjuração').closest('div')
    const cd = within(header).getByText('CD de Magia').parentElement
    expect(within(cd).getByText('—')).toBeInTheDocument()
  })
})
