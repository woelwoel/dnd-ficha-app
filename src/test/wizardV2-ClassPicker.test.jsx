import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassPicker } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassPicker'

const classes = [
  { index: 'guerreiro', name: 'Guerreiro' },
  { index: 'mago', name: 'Mago' },
]

describe('ClassPicker', () => {
  it('lista classes e dispara onClassChange', async () => {
    const onClassChange = vi.fn()
    render(<ClassPicker classes={classes} classIndex="" level={1} onClassChange={onClassChange} onLevelChange={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^classe/i), 'mago')
    expect(onClassChange).toHaveBeenCalledWith('mago')
  })

  it('lista 20 níveis e dispara onLevelChange com number', async () => {
    const onLevelChange = vi.fn()
    render(<ClassPicker classes={classes} classIndex="guerreiro" level={1} onClassChange={() => {}} onLevelChange={onLevelChange} />)
    const levelSelect = screen.getByLabelText(/nível inicial/i)
    expect(levelSelect.querySelectorAll('option')).toHaveLength(20)
    await userEvent.selectOptions(levelSelect, '5')
    expect(onLevelChange).toHaveBeenCalledWith(5)
  })

  it('reflete classIndex e level via prop', () => {
    render(<ClassPicker classes={classes} classIndex="mago" level={3} onClassChange={() => {}} onLevelChange={() => {}} />)
    expect(screen.getByLabelText(/^classe/i)).toHaveValue('mago')
    expect(screen.getByLabelText(/nível inicial/i)).toHaveValue('3')
  })
})
