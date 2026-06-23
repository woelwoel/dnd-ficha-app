import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlockCard } from '../systems/dnd5e/components/CharacterWizardV2/BlockCard'

describe('BlockCard', () => {
  it('renderiza label e resumo', () => {
    render(<BlockCard label="Raça" status="vazio" summary="preencher..." onClick={() => {}} />)
    expect(screen.getByText('Raça')).toBeInTheDocument()
    expect(screen.getByText('preencher...')).toBeInTheDocument()
  })

  it('mostra ícone ✓ quando status=completo', () => {
    const { container } = render(
      <BlockCard label="Raça" status="completo" summary="Meio-elfo" onClick={() => {}} />
    )
    expect(container.textContent).toContain('✓')
  })

  it('mostra ícone 🔒 quando status=bloqueado', () => {
    const { container } = render(
      <BlockCard label="Atributos" status="bloqueado" summary="—"
        blockedBy={['Raça']} onClick={() => {}} />
    )
    expect(container.textContent).toContain('🔒')
  })

  it('chama onClick ao clicar quando não bloqueado', async () => {
    const onClick = vi.fn()
    render(<BlockCard label="Raça" status="vazio" summary="—" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('NÃO chama onClick quando bloqueado', async () => {
    const onClick = vi.fn()
    render(<BlockCard label="Atributos" status="bloqueado" summary="—"
      blockedBy={['Raça']} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('tooltip lista o que precisa preencher quando bloqueado', () => {
    render(<BlockCard label="Perícias" status="bloqueado" summary="—"
      blockedBy={['Classe', 'Antecedente']} onClick={() => {}} />)
    expect(screen.getByRole('button').getAttribute('title'))
      .toContain('Classe')
    expect(screen.getByRole('button').getAttribute('title'))
      .toContain('Antecedente')
  })
})
