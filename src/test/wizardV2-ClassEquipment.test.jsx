import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassEquipment } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassEquipment'
import { INITIAL_DRAFT_V2 } from '../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

const classData = { gold_formula: '5d4 × 10' }

const classEquipmentData = {
  choices: [
    { id: 'weapon', prompt: 'Arma', options: [
      { value: 'longsword', label: 'Espada longa', items: [{ name: 'Espada longa', qty: 1 }] },
    ]},
  ],
  fixed: [
    { name: 'Mochila', qty: 1 },
  ],
}

const weaponsArmor = { weapons: [], instruments: [] }
const empty = INITIAL_DRAFT_V2

describe('ClassEquipment', () => {
  it('renderiza toggle Equipamento/Ouro', () => {
    render(<ClassEquipment draft={empty} updateDraft={() => {}}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    expect(screen.getByRole('button', { name: /equipamento da classe/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ouro inicial/i })).toBeInTheDocument()
  })

  it('modo equipamento (default): mostra choice groups + fixed items', () => {
    render(<ClassEquipment draft={empty} updateDraft={() => {}}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    expect(screen.getByText(/^Arma$/i)).toBeInTheDocument()
    expect(screen.getByText(/mochila/i)).toBeInTheDocument()
  })

  it('toggle Ouro chama updateDraft com classEquipmentChoice=gold', async () => {
    const updateDraft = vi.fn()
    render(<ClassEquipment draft={empty} updateDraft={updateDraft}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    await userEvent.click(screen.getByRole('button', { name: /ouro inicial/i }))
    expect(updateDraft).toHaveBeenCalledWith({ classEquipmentChoice: 'gold' })
  })

  it('modo ouro: clicar Rolar dispara updateDraft com classStartingGold > 0', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, classEquipmentChoice: 'gold' }
    render(<ClassEquipment draft={draft} updateDraft={updateDraft}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    await userEvent.click(screen.getByRole('button', { name: /rolar/i }))
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      classStartingGold: expect.any(Number),
    }))
    const call = updateDraft.mock.calls[0][0]
    expect(call.classStartingGold).toBeGreaterThan(0)
  })

  it('integração antecedente: mostra "+X PO de antecedente" se backgroundGold > 0', () => {
    const draft = { ...empty, classEquipmentChoice: 'gold', backgroundGold: 15 }
    render(<ClassEquipment draft={draft} updateDraft={() => {}}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    expect(screen.getByText(/\+15 po.*antecedente/i)).toBeInTheDocument()
  })

  it('integração antecedente: lista backgroundItems se presentes', () => {
    const draft = { ...empty, backgroundItems: [{ name: 'Insígnia militar', qty: 1 }, { name: 'Baralho', qty: 1 }] }
    render(<ClassEquipment draft={draft} updateDraft={() => {}}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    expect(screen.getByText(/itens do antecedente/i)).toBeInTheDocument()
    expect(screen.getByText(/insígnia militar/i)).toBeInTheDocument()
    expect(screen.getByText(/baralho/i)).toBeInTheDocument()
  })

  it('NÃO mostra seção antecedente quando vazio', () => {
    render(<ClassEquipment draft={empty} updateDraft={() => {}}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    expect(screen.queryByText(/itens do antecedente/i)).not.toBeInTheDocument()
  })
})
