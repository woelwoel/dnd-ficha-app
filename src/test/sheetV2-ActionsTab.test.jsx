import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeCharacter, makeCalc, makeUpdaters } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/Attacks', () => ({ Attacks: () => <div data-testid="attacks-manager" /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/CombatClassActions', () => ({ CombatClassActions: () => <div data-testid="ccas" /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/ManeuversPanel', () => ({ ManeuversPanel: () => <div data-testid="maneuvers" /> }))

import { ActionsTab } from '../systems/dnd5e/components/CharacterSheet/v2/ActionsTab'

function charWithAttack() {
  const ch = makeCharacter()
  ch.combat = {
    ...ch.combat,
    // shape real de combat.attacks (ver Attacks.jsx / utils/attacks)
    attacks: [{ id: 'atk1', name: 'Machado grande', damageDice: '1d12', damageType: 'cortante', proficient: true }],
  }
  return ch
}

describe('ActionsTab', () => {
  it('renderiza filtros e a linha de ataque nativa', () => {
    renderWithSheetContext(<ActionsTab />, { character: charWithAttack() })
    for (const f of ['Todas', 'Ação', 'Bônus', 'Reação', 'Limitadas']) {
      expect(screen.getByRole('button', { name: f })).toBeInTheDocument()
    }
    expect(screen.getByText('Machado grande')).toBeInTheDocument()
  })

  it('botão gerenciar ataques abre o Attacks v1', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<ActionsTab />, { character: charWithAttack() })
    await user.click(screen.getByRole('button', { name: /Gerenciar ataques/ }))
    expect(screen.getByTestId('attacks-manager')).toBeInTheDocument()
  })

  it('filtro Limitadas esconde os ataques e mostra recursos de classe', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<ActionsTab />, { character: charWithAttack() })
    expect(screen.getByText('Machado grande')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limitadas' }))
    expect(screen.queryByText('Machado grande')).not.toBeInTheDocument()
    expect(screen.getByTestId('ccas')).toBeInTheDocument()
  })

  it('filtro Bônus lista recurso de ação bônus e Usar decrementa', async () => {
    const user = userEvent.setup()
    const spendFeatureUse = vi.fn()
    const featureUses = [{ id: 'barbaro-rage', name: 'Fúria', max: 3, used: 1, recharge: 'long' }]
    renderWithSheetContext(<ActionsTab />, {
      character: charWithAttack(),
      featureUses,
      updaters: makeUpdaters({ spendFeatureUse }),
    })
    // fora do filtro Bônus, a linha nativa não aparece
    expect(screen.queryByText('Fúria')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bônus' }))
    expect(screen.getByText('Fúria')).toBeInTheDocument()
    expect(screen.getByText('2/3')).toBeInTheDocument() // remaining/max
    await user.click(screen.getByRole('button', { name: 'Usar' }))
    expect(spendFeatureUse).toHaveBeenCalledWith('barbaro-rage', featureUses)
  })

  it('bolinha de espaço de magia chama toggleSlot', async () => {
    const user = userEvent.setup()
    const toggleSlot = vi.fn()
    renderWithSheetContext(<ActionsTab />, {
      character: charWithAttack(),
      calc: makeCalc({ maxSlots: { 1: 3 }, safeUsedSlots: { 1: 1 } }),
      updaters: makeUpdaters({ toggleSlot }),
    })
    const bubbles = screen.getAllByRole('button', { name: /espaço de magia/i })
    expect(bubbles).toHaveLength(3)
    await user.click(bubbles[2]) // não usado -> gasta
    expect(toggleSlot).toHaveBeenCalledWith(1, 2)
  })
})
