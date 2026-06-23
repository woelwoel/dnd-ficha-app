import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddMulticlassPicker } from '../systems/dnd5e/components/CharacterSheet/levelProgression/AddMulticlassPicker'

const classes = [
  {
    index: 'ladino', name: 'Ladino', hit_die: 8,
    skill_choices: { count: 4, from: ['Acrobacia', 'Atletismo', 'Furtividade', 'Intuição'] },
  },
  { index: 'mago', name: 'Mago', hit_die: 6, skill_choices: { count: 2, from: ['Arcana', 'História'] } },
]

const mcRules = {
  ladino: {
    prerequisites: { dex: 13 },
    proficiencies: { armor: ['leve'], weapons: [], tools: ['ferramentas de ladrão'], skills: 1 },
  },
  mago: {
    prerequisites: { int: 13 },
    proficiencies: { armor: [], weapons: [], tools: [], skills: 0 },
  },
}

const characterAttributes = { str: 10, dex: 15, con: 12, int: 14, wis: 10, cha: 10 }

function renderPicker(props = {}) {
  const onConfirm = vi.fn()
  render(
    <AddMulticlassPicker
      availableClasses={classes}
      classes={classes}
      mcRules={mcRules}
      characterAttributes={characterAttributes}
      ownedSkills={props.ownedSkills ?? []}
      onCancel={() => {}}
      onConfirm={onConfirm}
    />
  )
  return { onConfirm }
}

describe('AddMulticlassPicker — seletor de perícia', () => {
  it('mostra o seletor quando a classe concede perícia (skills > 0)', async () => {
    renderPicker()
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ladino')
    expect(screen.getAllByText(/escolha 1 perícia/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /furtividade/i })).toBeInTheDocument()
  })

  it('confirmar fica bloqueado até escolher a perícia', async () => {
    renderPicker()
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ladino')
    // botão de confirmar mostra a instrução e está desabilitado
    expect(screen.getByRole('button', { name: /escolha 1 perícia/i })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /furtividade/i }))
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeEnabled()
  })

  it('desabilita perícias já proficientes', async () => {
    renderPicker({ ownedSkills: ['athletics'] })
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ladino')
    expect(screen.getByRole('button', { name: /atletismo/i })).toBeDisabled()
  })

  it('onConfirm recebe a perícia escolhida (key) + proficiências', async () => {
    const { onConfirm } = renderPicker()
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ladino')
    await userEvent.click(screen.getByRole('button', { name: /furtividade/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      classIndex: 'ladino',
      chosenSkills: ['stealth'],
      proficiencies: expect.objectContaining({ skills: 1 }),
    }))
  })

  it('classe sem perícia (Mago) não mostra seletor e confirma direto', async () => {
    const { onConfirm } = renderPicker()
    await userEvent.selectOptions(screen.getByRole('combobox'), 'mago')
    expect(screen.queryByText(/escolha .* perícia/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      classIndex: 'mago', chosenSkills: [],
    }))
  })
})
