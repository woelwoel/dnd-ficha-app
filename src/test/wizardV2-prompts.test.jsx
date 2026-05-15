import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResumeDraftPrompt } from '../components/CharacterWizardV2/ResumeDraftPrompt'
import { ConfirmExitPrompt } from '../components/CharacterWizardV2/ConfirmExitPrompt'

describe('ResumeDraftPrompt', () => {
  it('chama onResume ao clicar Continuar', async () => {
    const onResume = vi.fn()
    render(<ResumeDraftPrompt open={true} onResume={onResume} onDiscard={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(onResume).toHaveBeenCalled()
  })

  it('chama onDiscard ao clicar Começar novo', async () => {
    const onDiscard = vi.fn()
    render(<ResumeDraftPrompt open={true} onResume={() => {}} onDiscard={onDiscard} />)
    await userEvent.click(screen.getByRole('button', { name: /começar novo/i }))
    expect(onDiscard).toHaveBeenCalled()
  })

  it('não renderiza quando open=false', () => {
    render(<ResumeDraftPrompt open={false} onResume={() => {}} onDiscard={() => {}} />)
    expect(screen.queryByText(/continuar/i)).not.toBeInTheDocument()
  })
})

describe('ConfirmExitPrompt', () => {
  it('renderiza 3 botões e dispara handlers correspondentes', async () => {
    const onSave = vi.fn(), onDiscard = vi.fn(), onCancel = vi.fn()
    render(
      <ConfirmExitPrompt open={true}
        onSaveAndExit={onSave} onDiscard={onDiscard} onCancel={onCancel} />
    )
    await userEvent.click(screen.getByRole('button', { name: /salvar e sair/i }))
    await userEvent.click(screen.getByRole('button', { name: /descartar/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onSave).toHaveBeenCalled()
    expect(onDiscard).toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })
})
