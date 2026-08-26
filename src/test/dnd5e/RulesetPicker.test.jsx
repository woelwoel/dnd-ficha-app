import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RulesetPicker } from '../../systems/dnd5e/components/RulesetPicker'
import { CampaignSetupModal } from '../../systems/dnd5e/components/CharacterWizardV2/CampaignSetupModal'

describe('RulesetPicker', () => {
  it('mostra as duas opções com o rótulo em PT-BR', () => {
    render(<RulesetPicker value="2014" onChange={() => {}} />)
    expect(screen.getByLabelText(/D&D 5e \(2014\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/D&D 5e \(2024\)/)).toBeInTheDocument()
  })

  it('marca a opção do valor atual', () => {
    render(<RulesetPicker value="2024" onChange={() => {}} />)
    expect(screen.getByLabelText(/D&D 5e \(2024\)/)).toBeChecked()
    expect(screen.getByLabelText(/D&D 5e \(2014\)/)).not.toBeChecked()
  })

  it('avisa o chamador ao trocar', async () => {
    const onChange = vi.fn()
    render(<RulesetPicker value="2014" onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(/D&D 5e \(2024\)/))
    expect(onChange).toHaveBeenCalledWith('2024')
  })

  it('deixa claro que a escolha é definitiva', () => {
    render(<RulesetPicker value="2014" onChange={() => {}} />)
    expect(screen.getByText(/não dá para trocar depois|imutável|definitiv/i)).toBeInTheDocument()
  })
})

describe('RulesetPicker no setup, atrás do escape hatch', () => {
  // O flag é lido de window.location.search, então cada caso mexe na URL e
  // devolve ela ao normal — senão um teste contamina o seguinte.
  afterEach(() => window.history.replaceState({}, '', '/'))

  it('NÃO aparece sem ?ruleset=2024 na URL', () => {
    window.history.replaceState({}, '', '/')
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={() => {}} />)
    expect(screen.queryByText(/Conjunto de regras/i)).toBeNull()
  })

  it('aparece com ?ruleset=2024 na URL', () => {
    window.history.replaceState({}, '', '/?ruleset=2024')
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(/Conjunto de regras/i)).toBeInTheDocument()
  })

  it('entrega o ruleset escolhido no payload do onConfirm', async () => {
    window.history.replaceState({}, '', '/?ruleset=2024')
    const onConfirm = vi.fn()
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByLabelText(/D&D 5e \(2024\)/))
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ ruleset: '2024' }))
  })

  it('sem o escape hatch, o payload sai em 2014', async () => {
    window.history.replaceState({}, '', '/')
    const onConfirm = vi.fn()
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ ruleset: '2014' }))
  })
})
