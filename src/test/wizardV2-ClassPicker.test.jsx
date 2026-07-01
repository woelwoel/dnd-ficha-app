import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassPicker } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassPicker'

const classes = [
  { index: 'guerreiro', name: 'Guerreiro', roles: ['DANO CORPO A CORPO', 'TANQUE'], summary: 'Mestres do combate.', fullDescription: 'Lore do guerreiro.' },
  { index: 'mago', name: 'Mago', roles: ['DANO MÁGICO', 'CONTROLE'], summary: 'Conjuradores arcanos.', fullDescription: 'Lore do mago.' },
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

  it('mostra o botão ℹ quando há classe selecionada', () => {
    render(<ClassPicker classes={classes} classIndex="mago" level={1} onClassChange={() => {}} onLevelChange={() => {}} />)
    expect(screen.getByRole('button', { name: /sobre a classe mago/i })).toBeInTheDocument()
  })

  it('não mostra o botão ℹ sem classe selecionada', () => {
    render(<ClassPicker classes={classes} classIndex="" level={1} onClassChange={() => {}} onLevelChange={() => {}} />)
    expect(screen.queryByRole('button', { name: /sobre a classe/i })).toBeNull()
  })

  it('usa o selectedClass passado por prop quando a classe não está na lista oferecida', () => {
    const offered = [{ index: 'mago', name: 'Mago' }]
    const grandfathered = { index: 'artifice', name: 'Artífice', roles: ['SUPORTE'], summary: 'Inventor.', fullDescription: 'Lore.' }
    render(
      <ClassPicker
        classes={offered}
        classIndex="artifice"
        selectedClass={grandfathered}
        level={1}
        onClassChange={() => {}}
        onLevelChange={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /sobre a classe artífice/i })).toBeInTheDocument()
  })
})
