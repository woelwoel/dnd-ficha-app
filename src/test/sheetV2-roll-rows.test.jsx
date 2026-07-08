import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/SkillsList', () => ({ SkillsList: () => <div /> }))

import { SkillsPanel } from '../systems/dnd5e/components/CharacterSheet/v2/SkillsPanel'
import { SavesPanel } from '../systems/dnd5e/components/CharacterSheet/v2/SidePanels'
import { AbilityStrip } from '../systems/dnd5e/components/CharacterSheet/v2/AbilityStrip'

describe('rolagem nas linhas do v2', () => {
  it('clicar numa perícia rola 1d20+bônus com o nome como label', async () => {
    const user = userEvent.setup()
    const roll = vi.fn()
    const openPanel = vi.fn()
    renderWithSheetContext(<SkillsPanel />, { dice: { roll, openPanel } })
    await user.click(screen.getByRole('button', { name: /Rolar Atletismo/ }))
    expect(roll).toHaveBeenCalledWith('1d20+15', 'Atletismo', { crit: false, category: 'check', ability: 'str' })
  })

  it('clicar numa salvaguarda rola com o label do v1', async () => {
    const user = userEvent.setup()
    const roll = vi.fn()
    renderWithSheetContext(<SavesPanel />, { dice: { roll, openPanel: vi.fn() } })
    await user.click(screen.getByRole('button', { name: /Rolar salvaguarda de CON/ }))
    expect(roll).toHaveBeenCalledWith('1d20+9', 'Salvaguarda — CON', { crit: false, category: 'save', ability: 'con' })
  })
})

describe('AbilityStrip — rolagem', () => {
  it('clicar no card rola o teste de atributo; ✎ ainda abre o editor', async () => {
    const user = userEvent.setup()
    const roll = vi.fn()
    renderWithSheetContext(<AbilityStrip />, { dice: { roll, openPanel: vi.fn() } })
    await user.click(screen.getByRole('button', { name: /Rolar teste de Força/ }))
    expect(roll).toHaveBeenCalledWith('1d20+5', 'Teste de Força', { crit: false, category: 'check', ability: 'str' })
    await user.click(screen.getByRole('button', { name: 'Editar FOR' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('card INIT rola iniciativa', async () => {
    const user = userEvent.setup()
    const roll = vi.fn()
    renderWithSheetContext(<AbilityStrip />, { dice: { roll, openPanel: vi.fn() } })
    await user.click(screen.getByRole('button', { name: /Rolar iniciativa/ }))
    expect(roll).toHaveBeenCalledWith('1d20+1', 'Iniciativa', { crit: false, category: 'check', ability: 'dex' })
  })

  it('readOnly: rola, mas não mostra ✎', () => {
    renderWithSheetContext(<AbilityStrip />, { readOnly: true, dice: { roll: vi.fn(), openPanel: vi.fn() } })
    expect(screen.getByRole('button', { name: /Rolar teste de Força/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar FOR' })).not.toBeInTheDocument()
  })
})
