import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InfoPopover } from '../components/ui/InfoPopover'

describe('InfoPopover', () => {
  it('abre no clique e mostra o conteúdo', async () => {
    render(<InfoPopover content="conteúdo longo da feature" title="Título" />)
    await userEvent.click(screen.getByRole('button'))
    const tip = await screen.findByRole('tooltip')
    expect(tip).toBeInTheDocument()
    expect(screen.getByText('conteúdo longo da feature')).toBeInTheDocument()
  })

  it('NÃO fecha ao rolar dentro do popover, mas fecha ao rolar fora', async () => {
    render(<InfoPopover content="conteúdo longo da feature" title="Título" />)
    await userEvent.click(screen.getByRole('button'))
    const tip = await screen.findByRole('tooltip')

    // Rolar DENTRO do popover (ele tem overflow-y-auto) não pode fechá-lo.
    fireEvent.scroll(tip)
    expect(screen.queryByRole('tooltip')).toBeInTheDocument()

    // Rolar a PÁGINA (fora) fecha — position:fixed descolaria do botão.
    fireEvent.scroll(document.body)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
