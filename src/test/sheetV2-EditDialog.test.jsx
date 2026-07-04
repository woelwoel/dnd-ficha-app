import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditDialog } from '../systems/dnd5e/components/CharacterSheet/v2/EditDialog'

describe('EditDialog', () => {
  it('renderiza título e conteúdo quando aberto', () => {
    render(
      <EditDialog open onClose={() => {}} title="Editar atributo">
        <div>conteúdo do editor</div>
      </EditDialog>
    )
    expect(screen.getByText('Editar atributo')).toBeInTheDocument()
    expect(screen.getByText('conteúdo do editor')).toBeInTheDocument()
  })

  it('não renderiza nada quando fechado', () => {
    render(
      <EditDialog open={false} onClose={() => {}} title="Oculto">
        <div>invisível</div>
      </EditDialog>
    )
    expect(screen.queryByText('invisível')).not.toBeInTheDocument()
  })

  it('chama onClose no botão fechar e no Esc', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <EditDialog open onClose={onClose} title="X"><div /></EditDialog>
    )
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('painel carrega a classe sheet-v2 (tokens no portal)', () => {
    render(
      <EditDialog open onClose={() => {}} title="Tokens"><div /></EditDialog>
    )
    expect(document.querySelector('.sheet-v2 .v2-panel')).not.toBeNull()
  })
})
