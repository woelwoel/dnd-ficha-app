import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RacePicker } from '../systems/dnd5e/components/CharacterWizardV2/blocks/race/RacePicker'
import { DraconicAncestryPicker } from '../systems/dnd5e/components/CharacterWizardV2/blocks/race/DraconicAncestryPicker'
import { HighElfCantripPicker } from '../systems/dnd5e/components/CharacterWizardV2/blocks/race/HighElfCantripPicker'
import { FreeAbilityPicker } from '../systems/dnd5e/components/CharacterWizardV2/blocks/race/FreeAbilityPicker'
import { RacialSkillPicker } from '../systems/dnd5e/components/CharacterWizardV2/blocks/race/RacialSkillPicker'
import { RaceBonusPreview } from '../systems/dnd5e/components/CharacterWizardV2/blocks/race/RaceBonusPreview'

const races = [
  { index: 'anao', name: 'Anão', subraces: [
    { index: 'anao-da-colina', name: 'Anão da Colina' },
    { index: 'anao-da-montanha', name: 'Anão da Montanha' },
  ] },
  { index: 'humano', name: 'Humano', subraces: [
    { index: 'tracos-raciais-alternativos', name: 'Variante' },
  ] },
]

describe('RacePicker', () => {
  it('lista raças no select e dispara onRaceChange', async () => {
    const onRaceChange = vi.fn()
    render(<RacePicker races={races} race="" subrace="" onRaceChange={onRaceChange} onSubraceChange={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^raça/i), 'humano')
    expect(onRaceChange).toHaveBeenCalledWith('humano')
  })

  it('mostra select de subraça quando raça com subraças está selecionada', () => {
    render(<RacePicker races={races} race="anao" subrace="" onRaceChange={() => {}} onSubraceChange={() => {}} />)
    expect(screen.getByLabelText(/sub-raça/i)).toBeInTheDocument()
  })
})

describe('DraconicAncestryPicker', () => {
  it('renderiza opções e dispara onChange', async () => {
    const onChange = vi.fn()
    render(<DraconicAncestryPicker value="" onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(5)
    await userEvent.click(buttons[0])
    expect(onChange).toHaveBeenCalled()
  })
})

describe('HighElfCantripPicker', () => {
  it('renderiza select com truques de mago', async () => {
    const onChange = vi.fn()
    render(<HighElfCantripPicker value="" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Mãos Mágicas')
    expect(onChange).toHaveBeenCalledWith('Mãos Mágicas')
  })
})

describe('FreeAbilityPicker', () => {
  it('mostra contador atual/total e respeita limite', async () => {
    const onToggle = vi.fn()
    const { rerender } = render(
      <FreeAbilityPicker label="Escolha 2" count={2} chosen={[]} onToggle={onToggle} />
    )
    expect(screen.getByText(/0\/2/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(onToggle).toHaveBeenCalled()

    rerender(<FreeAbilityPicker label="Escolha 2" count={2} chosen={['str', 'dex']} onToggle={onToggle} />)
    expect(screen.getByText(/2\/2/)).toBeInTheDocument()
  })

  it('exclui atributo quando exclude prop fornecido', () => {
    render(<FreeAbilityPicker label="X" count={2} chosen={[]} exclude="cha" onToggle={() => {}} />)
    // 6 atributos - 1 excluído = 5 botões
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })
})

describe('RacialSkillPicker', () => {
  it('mostra contador e respeita limite', async () => {
    const onToggle = vi.fn()
    render(<RacialSkillPicker label="Escolha 1" count={1} chosen={[]} onToggle={onToggle} />)
    expect(screen.getByText(/0\/1/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(onToggle).toHaveBeenCalled()
  })
})

describe('RaceBonusPreview', () => {
  it('renderiza chips de bônus', () => {
    render(<RaceBonusPreview bonuses={[
      { ability: 'FOR', bonus: 2 }, { ability: 'CON', bonus: 1 },
    ]} hasFreeChoice={false} />)
    expect(screen.getByText(/\+2 FOR/i)).toBeInTheDocument()
    expect(screen.getByText(/\+1 CON/i)).toBeInTheDocument()
  })

  it('mostra chip "+1 em 2 atributos à escolha" quando hasFreeChoice', () => {
    render(<RaceBonusPreview bonuses={[]} hasFreeChoice={true} />)
    expect(screen.getByText(/à escolha/i)).toBeInTheDocument()
  })
})
