import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spells } from '../../systems/dnd5e/components/CharacterSheet/Spells'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { DiceRollerProvider } from '../../context/DiceRollerContext'
import { mockSrdFetch } from './helpers'

/* ─────────────────────────────────────────────────────────────────────
   Magia CONCEDIDA (subclasse/raça/talento) não gasta vaga do limite.

   O contrato já valia no cabeçalho — "5/6 (+1 subclasse)" — mas o catálogo
   contava a lista crua e travava em 6/6: o jogador via a vaga livre e não
   conseguia usar. `alwaysPrepared: true` é a marca de "concedida" em todas
   as fontes (subclassSpells, racialSpells, featSpells, grantedSpells).
   ────────────────────────────────────────────────────────────────────*/

const BARDO_CLASS = { index: 'bardo', name: 'Bardo', hit_die: 8, spellcasting_ability: 'Carisma' }

function makeBardo(spells = []) {
  return {
    info: { name: 'Ozzy', class: 'bardo', level: 3, race: 'humano', multiclasses: [] },
    attributes: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 17 },
    combat: {
      maxHp: 27, currentHp: 27, tempHp: 0, armorClass: 13, speed: 9,
      attacks: [], deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
    },
    spellcasting: { ability: 'cha', usedSlots: {}, spells },
  }
}

function ControlledSpells({ initialCharacter }) {
  const [character, setCharacter] = useState(initialCharacter)
  return (
    <SrdProvider>
      <DiceRollerProvider>
        <Spells
          character={character}
          attributes={character.attributes}
          level={character.info.level}
          profBonus={2}
          classData={BARDO_CLASS}
          onUpdateSpellcasting={(field, value) =>
            setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, [field]: value } }))
          }
          onAddSpell={sp =>
            setCharacter(c => ({
              ...c,
              spellcasting: { ...c.spellcasting, spells: [...c.spellcasting.spells, { ...sp, id: `id-${Math.random()}` }] },
            }))
          }
          onRemoveSpell={id =>
            setCharacter(c => ({
              ...c,
              spellcasting: { ...c.spellcasting, spells: c.spellcasting.spells.filter(s => s.id !== id) },
            }))
          }
          onToggleSlot={() => {}}
          onSetConcentration={() => {}}
        />
      </DiceRollerProvider>
    </SrdProvider>
  )
}

const CONHECIDAS = [
  { id: 'a', index: 'curar-ferimentos',  name: 'Curar Ferimentos',  level: 1, school: 'Evocação' },
  { id: 'b', index: 'enfeiticar-pessoa', name: 'Enfeitiçar Pessoa', level: 1, school: 'Encantamento' },
  { id: 'c', index: 'palavra-curativa',  name: 'Palavra Curativa',  level: 1, school: 'Evocação' },
  { id: 'd', index: 'sono',              name: 'Sono',              level: 1, school: 'Encantamento' },
  { id: 'e', index: 'invisibilidade',    name: 'Invisibilidade',    level: 2, school: 'Ilusão' },
]
const CONCEDIDA = {
  id: 'f', index: 'heroismo', name: 'Heroísmo', level: 1, school: 'Encantamento',
  alwaysPrepared: true, prepared: true, source: 'feat', sourceLabel: 'Tocado pelas Fadas',
}

/** Texto do contador do cabeçalho ("Truques: 1/2", "Magias conhecidas: 5/6"). */
function contador(rotulo) {
  return screen.getByText(new RegExp(`^${rotulo}:`)).closest('span').textContent
}

async function abrirCatalogoNoNivel1(user) {
  await user.click(await screen.findByRole('button', { name: /Adicionar magia/ }))
  const catalogo = screen.getByRole('button', { name: 'Nv 1' })
  await user.click(catalogo)
}

describe('limite de magias conhecidas × magia concedida', () => {
  beforeEach(() => { mockSrdFetch() })
  afterEach(() => { vi.restoreAllMocks() })

  it('catálogo não trava quando a vaga livre só existe fora das concedidas', async () => {
    const user = userEvent.setup()
    render(<ControlledSpells initialCharacter={makeBardo([...CONHECIDAS, CONCEDIDA])} />)

    await waitFor(() => expect(screen.getByText(/Magias conhecidas:/)).toBeInTheDocument())
    expect(contador('Magias conhecidas')).toMatch(/5\/6/)

    await abrirCatalogoNoNivel1(user)
    expect(screen.queryByText(/Limite atingido/)).not.toBeInTheDocument()
  })

  it('a vaga livre pode ser usada de verdade', async () => {
    const user = userEvent.setup()
    render(<ControlledSpells initialCharacter={makeBardo([...CONHECIDAS, CONCEDIDA])} />)

    await abrirCatalogoNoNivel1(user)
    const adicionar = screen.getAllByRole('button', { name: '+' })
    await user.click(adicionar[0])

    await waitFor(() => expect(contador('Magias conhecidas')).toMatch(/6\/6/))
  })

  it('catálogo trava quando as 6 vagas são de magias escolhidas', async () => {
    const user = userEvent.setup()
    const sexta = { id: 'g', index: 'heroismo', name: 'Heroísmo', level: 1, school: 'Encantamento' }
    render(<ControlledSpells initialCharacter={makeBardo([...CONHECIDAS, sexta])} />)

    await abrirCatalogoNoNivel1(user)
    expect(screen.getByText(/Limite atingido/)).toBeInTheDocument()
  })

  it('conjurador que PREPARA: magia de domínio não ocupa vaga de preparada', async () => {
    // Clérigo nv3 SAB 16 → 3 + 3 = 6 preparadas. As de domínio são extra.
    const clerigo = {
      ...makeBardo([]),
      info: { name: 'Padre', class: 'clerigo', level: 3, race: 'humano', multiclasses: [], chosenFeatures: { divine_domain: 'guerra' } },
      attributes: { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 10 },
      spellcasting: {
        ability: 'wis', usedSlots: {},
        spells: [
          ...CONHECIDAS.map(s => ({ ...s, prepared: true })),
          { id: 'd1', index: 'comando', name: 'Comando', level: 1, school: 'Encantamento', prepared: true, alwaysPrepared: true, source: 'domain', sourceLabel: 'Domínio: guerra' },
          { id: 'd2', index: 'protecao-contra-o-bem-e-mal', name: 'Proteção Contra o Bem e o Mal', level: 1, school: 'Abjuração', prepared: true, alwaysPrepared: true, source: 'domain', sourceLabel: 'Domínio: guerra' },
        ],
      },
    }
    const user = userEvent.setup()
    render(<ControlledSpells initialCharacter={clerigo} />)

    await waitFor(() => expect(screen.getByText(/Preparadas:/)).toBeInTheDocument())
    expect(contador('Preparadas')).toMatch(/5\/6/)

    await user.click(await screen.findByRole('button', { name: /Preparar magia/ }))
    await user.click(screen.getByRole('button', { name: 'Nv 1' }))
    expect(screen.queryByText(/Limite atingido/)).not.toBeInTheDocument()
  })

  it('truque concedido pela raça não ocupa vaga de truque de classe', async () => {
    const user = userEvent.setup()
    render(<ControlledSpells initialCharacter={makeBardo([
      { id: 'c1', index: 'zombaria-cruel', name: 'Zombaria Cruel', level: 0, school: 'Encantamento' },
      {
        id: 'c2', index: 'globos-de-luz', name: 'Globos De Luz', level: 0, school: 'Evocação',
        alwaysPrepared: true, prepared: true, source: 'race', sourceLabel: 'Magia Drow',
      },
    ])} />)

    await waitFor(() => expect(screen.getByText(/Truques:/)).toBeInTheDocument())
    expect(contador('Truques')).toMatch(/1\/2/)

    await user.click(screen.getByRole('button', { name: /Adicionar magia/ }))
    const painel = screen.getByRole('button', { name: 'Truques' }).closest('div').parentElement
    expect(within(painel).queryByText(/Limite atingido/)).not.toBeInTheDocument()
  })
})
