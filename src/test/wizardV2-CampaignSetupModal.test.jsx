import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampaignSetupModal } from '../components/CharacterWizardV2/CampaignSetupModal'

describe('CampaignSetupModal', () => {
  it('renderiza com defaults', () => {
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={() => {}} />)
    expect(screen.getByLabelText(/standard array/i)).toBeChecked()
    expect(screen.getByLabelText(/permitir feats/i)).not.toBeChecked()
    expect(screen.getByLabelText(/permitir multiclasse/i)).not.toBeChecked()
    expect(screen.getByLabelText(/nível inicial/i)).toHaveValue(1)
  })

  it('confirma com settings escolhidas', async () => {
    const onConfirm = vi.fn()
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={onConfirm} />)

    await userEvent.click(screen.getByLabelText(/point buy/i))
    await userEvent.click(screen.getByLabelText(/permitir feats/i))
    await userEvent.click(screen.getByLabelText(/permitir multiclasse/i))

    const input = screen.getByLabelText(/nível inicial/i)
    fireEvent.change(input, { target: { value: '5' } })

    await userEvent.click(screen.getByRole('button', { name: /começar/i }))

    expect(onConfirm).toHaveBeenCalledWith({
      abilityScoreMethod: 'point-buy',
      allowFeats: true,
      allowMulticlass: true,
      startLevel: 5,
    })
  })

  it('cancela sem chamar onConfirm', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<CampaignSetupModal open={true} onCancel={onCancel} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('clampa nível inicial entre 1 e 20', async () => {
    const onConfirm = vi.fn()
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={onConfirm} />)

    const input = screen.getByLabelText(/nível inicial/i)
    fireEvent.change(input, { target: { value: '99' } })
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ startLevel: 20 }))
  })
})
