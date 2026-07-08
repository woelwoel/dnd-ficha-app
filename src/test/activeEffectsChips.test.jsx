import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveEffectsChips } from '../systems/dnd5e/components/CharacterSheet/v2/ActiveEffectsChips'
import { renderWithSheetContext, makeCharacter, makeUpdaters } from './helpers/sheetV2TestContext'

const ESCUDO = { id: 'escudo-da-fe', name: 'Escudo da Fé', source: 'cast', concentration: true, mods: { ac: 2 }, summary: '+2 CA' }

function setup({ effects = [], updaters = {}, readOnly = false, catalog } = {}) {
  const base = makeCharacter()
  renderWithSheetContext(
    <ActiveEffectsChips catalog={catalog ?? { 'bencao': { effect: { concentration: true, riders: [], summary: '+1d4 em ataques e salvaguardas' } } }}
      spellNames={{ 'bencao': 'Bênção' }} />,
    {
      character: { ...base, combat: { ...base.combat, activeEffects: effects } },
      updaters: makeUpdaters(updaters),
      readOnly,
    }
  )
}

describe('ActiveEffectsChips', () => {
  it('renderiza chip com nome e summary no title', () => {
    setup({ effects: [ESCUDO] })
    expect(screen.getByText('Escudo da Fé')).toBeInTheDocument()
  })
  it('dispensa pelo x', async () => {
    const user = userEvent.setup()
    const removeActiveEffect = vi.fn()
    setup({ effects: [ESCUDO], updaters: { removeActiveEffect } })
    await user.click(screen.getByRole('button', { name: /Remover Escudo da Fé/ }))
    expect(removeActiveEffect).toHaveBeenCalledWith('escudo-da-fe')
  })
  it('catalogo adiciona efeito manual', async () => {
    const user = userEvent.setup()
    const addActiveEffect = vi.fn()
    setup({ updaters: { addActiveEffect } })
    await user.click(screen.getByRole('button', { name: /\+ Efeito/ }))
    await user.click(await screen.findByRole('button', { name: /Bênção/ }))
    expect(addActiveEffect).toHaveBeenCalledWith(expect.objectContaining({ id: 'bencao', source: 'manual' }))
  })
  it('readOnly: chips sem x nem catalogo', () => {
    setup({ effects: [ESCUDO], readOnly: true })
    expect(screen.getByText('Escudo da Fé')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ Efeito/ })).not.toBeInTheDocument()
  })
})
