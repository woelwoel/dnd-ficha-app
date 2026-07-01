import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InfoModalButton } from '../components/ui/InfoModalButton'

describe('InfoModalButton', () => {
  it('não renderiza nada sem conteúdo', () => {
    const { container } = render(<InfoModalButton content={null} title="X" />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('abre um modal com título e conteúdo ao clicar', async () => {
    render(<InfoModalButton content="Descrição longa da subclasse." title="Alquimista" />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Descrição longa da subclasse.')).toBeInTheDocument()
  })

  it('não dispara clique do elemento pai (stopPropagation)', async () => {
    let parentClicked = false
    render(
      <div onClick={() => { parentClicked = true }}>
        <InfoModalButton content="desc" title="Sub" />
      </div>
    )
    await userEvent.click(screen.getByRole('button'))
    expect(parentClicked).toBe(false)
  })
})
