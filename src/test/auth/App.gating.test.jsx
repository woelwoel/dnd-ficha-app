import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const state = vi.hoisted(() => ({
  current: { user: null, loading: true, recoveryMode: false, signOut: () => {} },
}))

vi.mock('../../auth/AuthProvider', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => state.current,
}))

// Stubs leves dos componentes pesados que não interessam aqui.
vi.mock('../../systems/dnd5e/data/SrdProvider', () => ({ SrdProvider: ({ children }) => children }))
vi.mock('../../context/DiceRollerContext', () => ({ DiceRollerProvider: ({ children }) => children }))
vi.mock('../../components/DiceRoller/DiceHistoryPanel', () => ({ DiceHistoryPanel: () => null }))
vi.mock('../../systems/dnd5e/components/Bestiary/BestiaryButton', () => ({ BestiaryButton: () => null }))
vi.mock('../../components/PWAUpdatePrompt', () => ({ PWAUpdatePrompt: () => null }))
vi.mock('../../components/CharacterList', () => ({ CharacterList: () => <div>CHAR_LIST</div> }))
vi.mock('../../auth/LoginScreen', () => ({ LoginScreen: () => <div>LOGIN_SCREEN</div> }))
vi.mock('../../auth/ResetPasswordScreen', () => ({ ResetPasswordScreen: () => <div>RESET_SCREEN</div> }))

import App from '../../App'

describe('App gating', () => {
  it('mostra Loader quando loading', () => {
    state.current = { user: null, loading: true, recoveryMode: false, signOut: vi.fn() }
    render(<App />)
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('mostra LoginScreen quando sem user', () => {
    state.current = { user: null, loading: false, recoveryMode: false, signOut: vi.fn() }
    render(<App />)
    expect(screen.getByText('LOGIN_SCREEN')).toBeInTheDocument()
  })

  it('mostra ResetPasswordScreen em recoveryMode', () => {
    state.current = { user: { id: 'u' }, loading: false, recoveryMode: true, signOut: vi.fn() }
    render(<App />)
    expect(screen.getByText('RESET_SCREEN')).toBeInTheDocument()
  })

  it('mostra CharacterList quando autenticado', () => {
    state.current = { user: { id: 'u' }, loading: false, recoveryMode: false, signOut: vi.fn() }
    render(<App />)
    expect(screen.getByText('CHAR_LIST')).toBeInTheDocument()
  })
})
