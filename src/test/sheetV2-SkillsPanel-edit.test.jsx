import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/v2/SkillsEditor', () => ({
  SkillsEditor: () => <div data-testid="skills-editor" />,
}))

import { SkillsPanel } from '../systems/dnd5e/components/CharacterSheet/v2/SkillsPanel'

describe('SkillsPanel — edição', () => {
  it('engrenagem abre o seletor de proficiências', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<SkillsPanel />)
    await user.click(screen.getByRole('button', { name: 'Editar perícias' }))
    expect(screen.getByTestId('skills-editor')).toBeInTheDocument()
  })

  it('readOnly esconde a engrenagem', () => {
    renderWithSheetContext(<SkillsPanel />, { readOnly: true })
    expect(screen.queryByRole('button', { name: 'Editar perícias' })).not.toBeInTheDocument()
  })
})
