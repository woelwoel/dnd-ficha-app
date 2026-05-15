import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock dos dois wizards pra detectar qual renderizou (sem carregar dependências do SRD)
vi.mock('../components/CharacterWizard/CharacterWizard', () => ({
  CharacterWizard: () => <div>Wizard Antigo</div>,
}))
vi.mock('../components/CharacterWizardV2', () => ({
  CharacterWizardV2: () => <div>Wizard V2</div>,
}))
// Mock do CharacterList pra ter botão Criar acessível sem SRD/personagens.
vi.mock('../components/CharacterList', () => ({
  CharacterList: ({ onCreate }) => (
    <button onClick={onCreate}>Criar Personagem</button>
  ),
}))
// Mocks dos providers pra evitar fetch SRD.
vi.mock('../providers/SrdProvider', () => ({
  SrdProvider: ({ children }) => <>{children}</>,
}))
vi.mock('../context/DiceRollerContext', () => ({
  DiceRollerProvider: ({ children }) => <>{children}</>,
}))
vi.mock('../components/DiceRoller/DiceHistoryPanel', () => ({
  DiceHistoryPanel: () => null,
}))
vi.mock('../components/Bestiary/BestiaryButton', () => ({
  BestiaryButton: () => null,
}))

import App from '../App'

describe('Feature flag — seleção de wizard', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('sem flag, usa wizard antigo', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /criar personagem/i }))
    expect(await screen.findByText('Wizard Antigo')).toBeInTheDocument()
  })

  it('com ?v2=1, usa wizard V2', async () => {
    window.history.replaceState({}, '', '/?v2=1')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /criar personagem/i }))
    expect(await screen.findByText('Wizard V2')).toBeInTheDocument()
  })

  it('com localStorage.wizardV2=true, usa V2', async () => {
    localStorage.setItem('wizardV2', 'true')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /criar personagem/i }))
    expect(await screen.findByText('Wizard V2')).toBeInTheDocument()
  })
})
