import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({ useLazySrdDataset: () => [] }))

import { LevelUpPanel } from '../systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel'

/**
 * Escolhas condicionais no painel de subida de nível.
 *
 * Várias escolhas só existem pra uma subclasse (`requires`): runas do Cavaleiro
 * Rúnico, disparos do Arqueiro Arcano, espírito totêmico do Bárbaro do Totem,
 * tipo de terreno do Druida da Terra. Elas caem no MESMO nível em que a
 * subclasse é escolhida, então o gate tem que considerar o que o jogador
 * acabou de marcar no painel, não só o que já estava na ficha.
 */
const CHOICES = [
  {
    id: 'martial_archetype', level: 3, featureName: 'Arquétipo Marcial',
    prompt: 'Escolha seu Arquétipo Marcial',
    options: [
      { value: 'campeao', name: 'Campeão', desc: '' },
      { value: 'cavaleiro-runico', name: 'Cavaleiro Rúnico', desc: '', source: 'tasha' },
    ],
  },
  {
    id: 'guerreiro_rune_knight_runes', level: 3, featureName: 'Runas Gravadas',
    prompt: 'Escolha suas runas', multiSelect: 2,
    requires: { martial_archetype: 'cavaleiro-runico' },
    options: [
      { value: 'nuvem', name: 'Runa da Nuvem', desc: '', source: 'tasha' },
      { value: 'fogo', name: 'Runa do Fogo', desc: '', source: 'tasha' },
      { value: 'pedra', name: 'Runa da Pedra', desc: '', source: 'tasha' },
    ],
  },
]

function renderPanel(currentChosenFeatures = {}, onConfirm = () => {}) {
  return render(
    <LevelUpPanel
      nextLevel={3}
      nextEntry={{ level: 3, features: [], proficiency_bonus: 2 }}
      hitDie={10}
      conMod={2}
      attributes={{ str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 }}
      levelChoices={CHOICES}
      currentChosenFeatures={currentChosenFeatures}
      activeSources={['phb', 'tasha', 'xanathar']}
      onConfirm={onConfirm}
      onCancel={() => {}}
    />
  )
}

describe('LevelUpPanel — escolhas presas a uma subclasse', () => {
  it('não pede a escolha condicional antes da subclasse ser escolhida', () => {
    renderPanel()
    expect(screen.getByRole('heading', { name: /Arquétipo Marcial/ })).toBeInTheDocument()
    expect(screen.queryByText(/Runas Gravadas/)).not.toBeInTheDocument()
  })

  it('pede a escolha condicional assim que a subclasse dona dela é marcada', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: /Cavaleiro Rúnico/ }))
    expect(screen.getByText(/Runas Gravadas/)).toBeInTheDocument()
  })

  it('não pede a escolha condicional quando a subclasse marcada é outra', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: /Campeão/ }))
    expect(screen.queryByText(/Runas Gravadas/)).not.toBeInTheDocument()
  })

  it('não grava a escolha condicional abandonada ao trocar de subclasse', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderPanel({}, onConfirm)

    await user.click(screen.getByRole('button', { name: /Cavaleiro Rúnico/ }))
    await user.click(screen.getByRole('button', { name: /Runa da Nuvem/ }))
    await user.click(screen.getByRole('button', { name: /Runa do Fogo/ }))
    // Mudou de ideia: volta pro Campeão, que não tem runas.
    await user.click(screen.getByRole('button', { name: /Campeão/ }))

    await user.click(screen.getByRole('button', { name: /Média/ }))
    await user.click(screen.getByRole('button', { name: /Confirmar Subida/ }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0][0].newChoices).toEqual({ martial_archetype: 'campeao' })
  })
})
