import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlockEditorModal } from '../components/CharacterWizardV2/BlockEditorModal'

describe('BlockEditorModal', () => {
  it('não renderiza quando open=false', () => {
    render(
      <BlockEditorModal open={false} title="Raça" onClose={() => {}}>
        conteúdo
      </BlockEditorModal>
    )
    expect(screen.queryByText('Raça')).not.toBeInTheDocument()
  })

  it('renderiza título e children quando open=true', () => {
    render(
      <BlockEditorModal open={true} title="Raça" onClose={() => {}}>
        conteúdo do bloco
      </BlockEditorModal>
    )
    expect(screen.getByText('Raça')).toBeInTheDocument()
    expect(screen.getByText('conteúdo do bloco')).toBeInTheDocument()
  })

  it('fecha ao clicar botão Fechar', async () => {
    const onClose = vi.fn()
    render(
      <BlockEditorModal open={true} title="Raça" onClose={onClose}>x</BlockEditorModal>
    )
    await userEvent.click(screen.getByRole('button', { name: /^fechar$/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('fecha ao pressionar Esc', () => {
    const onClose = vi.fn()
    render(
      <BlockEditorModal open={true} title="Raça" onClose={onClose}>x</BlockEditorModal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('mostra botão Limpar só quando onClear fornecido', () => {
    const { rerender } = render(
      <BlockEditorModal open={true} title="Raça" onClose={() => {}}>x</BlockEditorModal>
    )
    expect(screen.queryByRole('button', { name: /limpar/i })).not.toBeInTheDocument()
    rerender(
      <BlockEditorModal open={true} title="Raça" onClose={() => {}} onClear={() => {}}>x</BlockEditorModal>
    )
    expect(screen.getByRole('button', { name: /limpar/i })).toBeInTheDocument()
  })

  it('chama onClear ao clicar Limpar', async () => {
    const onClear = vi.fn()
    render(
      <BlockEditorModal open={true} title="Raça" onClose={() => {}} onClear={onClear}>x</BlockEditorModal>
    )
    await userEvent.click(screen.getByRole('button', { name: /limpar/i }))
    expect(onClear).toHaveBeenCalled()
  })
})
