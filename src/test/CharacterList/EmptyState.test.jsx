import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '../../components/CharacterList/EmptyState'

describe('<EmptyState>', () => {
  it('renderiza mensagem convidativa', () => {
    render(<EmptyState onCreate={() => {}} />)
    expect(screen.getByText(/Sua história começa aqui/i)).toBeInTheDocument()
  })

  it('renderiza CTA grande "Recrutar"', () => {
    render(<EmptyState onCreate={() => {}} />)
    expect(screen.getByRole('button', { name: /Recrutar/i })).toBeInTheDocument()
  })

  it('CTA dispara onCreate', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<EmptyState onCreate={onCreate} />)
    await user.click(screen.getByRole('button', { name: /Recrutar/i }))
    expect(onCreate).toHaveBeenCalled()
  })
})
