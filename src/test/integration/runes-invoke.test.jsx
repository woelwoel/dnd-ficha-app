import { describe, it, expect, vi } from 'vitest'
import { useMemo } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { RunesPanel } from '../../systems/dnd5e/components/CharacterSheet/RunesPanel'
import { useCharacter } from '../../systems/dnd5e/hooks/useCharacter'
import { defaultClassFeatureUses, mergeFeatureUses } from '../../systems/dnd5e/domain/rules'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'
import phbChoices from '../../../public/srd-data/phb-class-choices-pt.json'
import tashaChoices from '../../../public/srd-data/tasha-class-choices-pt.json'

const CHOICES = mergeClassChoices(phbChoices, tashaChoices, 'tasha')

// O painel lê o catálogo do provider; aqui ele entra pelo mock, como na ficha
// real entraria pelo SrdProvider.
vi.mock('../../systems/dnd5e/data/SrdProvider', () => ({
  useSrdOptional: () => ({ classChoices: CHOICES }),
  useSrd: () => ({ classChoices: CHOICES }),
  useLazySrdDataset: () => null,
}))

/**
 * Fiação REAL da ficha: `featureUses` é derivado do character a cada render e
 * o gasto volta como `spendFeatureUse(id, featureUses)`. É o mesmo caminho que
 * SheetContent/ActionsTab usam — e o mesmo que já mordeu o pool do Paladino.
 */
function WiredRunes({ initial }) {
  const api = useCharacter(initial)
  const { character } = api
  const featureUses = useMemo(
    () => mergeFeatureUses(
      character.combat?.classFeatureUses ?? [],
      defaultClassFeatureUses(character, CHOICES),
    ),
    [character],
  )
  return (
    <>
      <RunesPanel
        character={character}
        featureUses={featureUses}
        onSpend={id => api.spendFeatureUse(id, featureUses)}
        onRegain={id => api.regainFeatureUse(id, featureUses)}
      />
      <output data-testid="estado">
        {featureUses
          .filter(u => u.id.startsWith('guerreiro-rune-'))
          .map(u => `${u.id}:${u.used}/${u.max}`)
          .join(' ')}
      </output>
    </>
  )
}

function runeKnight() {
  const c = {
    info: {
      name: 'Bruni', class: 'guerreiro', level: 7, race: 'anao', multiclasses: [],
      chosenFeatures: {
        martial_archetype: 'cavaleiro-runico',
        guerreiro_rune_knight_runes: ['fogo', 'gelo'],
      },
    },
    attributes: { str: 18, dex: 12, con: 16, int: 10, wis: 12, cha: 10 },
    combat: {
      maxHp: 60, currentHp: 60, tempHp: 0, armorClass: 17, speed: 7.5,
      attacks: [], deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
      classFeatureUses: [], knownBeasts: [],
    },
    spellcasting: { ability: null, usedSlots: {}, spells: [] },
  }
  c.combat.classFeatureUses = defaultClassFeatureUses(c, CHOICES)
  return c
}

describe('invocar runa na ficha (fiação real)', () => {
  it('invocar gasta só a runa clicada e persiste no personagem', () => {
    render(<WiredRunes initial={runeKnight()} />)
    expect(screen.getByTestId('estado')).toHaveTextContent(
      'guerreiro-rune-fogo:0/1 guerreiro-rune-gelo:0/1'
    )

    const linhaFogo = screen.getByText('Runa do Fogo').closest('div.flex')
    fireEvent.click(within(linhaFogo).getByRole('button', { name: /invocar/i }))

    expect(screen.getByTestId('estado')).toHaveTextContent(
      'guerreiro-rune-fogo:1/1 guerreiro-rune-gelo:0/1'
    )
    expect(screen.getByText(/1\/2 prontas/)).toBeInTheDocument()
  })

  it('recuperar devolve o uso daquela runa', () => {
    render(<WiredRunes initial={runeKnight()} />)
    const linha = () => screen.getByText('Runa do Gelo').closest('div.flex')
    fireEvent.click(within(linha()).getByRole('button', { name: /invocar/i }))
    expect(screen.getByTestId('estado')).toHaveTextContent('guerreiro-rune-gelo:1/1')

    fireEvent.click(within(linha()).getByRole('button', { name: /recuperar/i }))
    expect(screen.getByTestId('estado')).toHaveTextContent('guerreiro-rune-gelo:0/1')
    expect(screen.getByText(/2\/2 prontas/)).toBeInTheDocument()
  })
})
