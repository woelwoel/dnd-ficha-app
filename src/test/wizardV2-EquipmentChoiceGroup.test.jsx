// src/test/wizardV2-EquipmentChoiceGroup.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EquipmentChoiceGroup } from '../components/CharacterWizardV2/blocks/class/EquipmentChoiceGroup'

const weaponsArmor = { weapons: [
  { index: 'longsword', name: 'Espada longa', category: 'martial-melee', damage: '1d8' },
  { index: 'axe', name: 'Machado', category: 'martial-melee', damage: '1d8' },
], instruments: [] }

const choice = {
  id: 'weapon',
  prompt: 'Escolha sua arma marcial',
  options: [
    { value: 'longsword-shield', label: 'Espada longa + Escudo', items: [
      { name: 'Espada longa', qty: 1 }, { name: 'Escudo', qty: 1 },
    ]},
    { value: 'martial-choice', label: 'Qualquer arma marcial', items: [
      { pick: 'martial', pickLabel: 'Arma marcial' },
    ]},
  ],
}

describe('EquipmentChoiceGroup', () => {
  it('renderiza prompt e ambas as opções', () => {
    render(<EquipmentChoiceGroup choice={choice} selected="" picks={{}}
      weaponsArmor={weaponsArmor} onSelectOption={() => {}} onPick={() => {}} />)
    expect(screen.getByText(/escolha sua arma marcial/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /espada longa \+ escudo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /qualquer arma marcial/i })).toBeInTheDocument()
  })

  it('clicar opção dispara onSelectOption(choiceId, value)', async () => {
    const onSelectOption = vi.fn()
    render(<EquipmentChoiceGroup choice={choice} selected="" picks={{}}
      weaponsArmor={weaponsArmor} onSelectOption={onSelectOption} onPick={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /espada longa \+ escudo/i }))
    expect(onSelectOption).toHaveBeenCalledWith('weapon', 'longsword-shield')
  })

  it('mostra WeaponPicker quando opção selecionada tem item com pick', () => {
    render(<EquipmentChoiceGroup choice={choice} selected="martial-choice" picks={{}}
      weaponsArmor={weaponsArmor} onSelectOption={() => {}} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /^espada longa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^machado/i })).toBeInTheDocument()
  })

  it('NÃO mostra WeaponPicker pra opções não selecionadas', () => {
    render(<EquipmentChoiceGroup choice={choice} selected="longsword-shield" picks={{}}
      weaponsArmor={weaponsArmor} onSelectOption={() => {}} onPick={() => {}} />)
    expect(screen.queryByText(/arma marcial \*/i)).not.toBeInTheDocument()
  })
})
