import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportErrorBanner } from '../systems/dnd5e/components/CharacterSheet/ImportErrorBanner'

describe('ImportErrorBanner', () => {
  it('anuncia a mensagem como alerta', () => {
    render(<ImportErrorBanner message="JSON inválido" onDismiss={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('JSON inválido')
  })

  it('o botão Fechar chama onDismiss uma vez', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<ImportErrorBanner message="JSON inválido" onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
