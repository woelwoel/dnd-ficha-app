// src/test/wizardV2-WeaponPicker.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeaponPicker } from '../components/CharacterWizardV2/blocks/class/WeaponPicker'

const weaponsArmor = {
  weapons: [
    { index: 'shortsword', name: 'Espada curta', category: 'simple-melee', damage: '1d6 perfurante' },
    { index: 'longsword', name: 'Espada longa', category: 'martial-melee', damage: '1d8 cortante' },
    { index: 'crossbow-light', name: 'Besta leve', category: 'simple-ranged', damage: '1d8 perfurante' },
  ],
  instruments: [
    { index: 'lyre', name: 'Lira' },
    { index: 'drum', name: 'Tambor' },
  ],
}

describe('WeaponPicker', () => {
  it('filtra simples (melee + ranged)', () => {
    render(<WeaponPicker category="simple" pickKey="x" currentValue=""
      weaponsArmor={weaponsArmor} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /espada curta/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /besta leve/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /espada longa/i })).not.toBeInTheDocument()
  })

  it('filtra marciais (melee + ranged)', () => {
    render(<WeaponPicker category="martial" pickKey="x" currentValue=""
      weaponsArmor={weaponsArmor} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /espada longa/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /espada curta/i })).not.toBeInTheDocument()
  })

  it('mostra instrumentos quando category=instrument', () => {
    render(<WeaponPicker category="instrument" pickKey="x" currentValue=""
      weaponsArmor={weaponsArmor} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /lira/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tambor/i })).toBeInTheDocument()
  })

  it('clicar dispara onPick(pickKey, name)', async () => {
    const onPick = vi.fn()
    render(<WeaponPicker category="simple" pickKey="weapon:x:0" currentValue=""
      weaponsArmor={weaponsArmor} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /espada curta/i }))
    expect(onPick).toHaveBeenCalledWith('weapon:x:0', 'Espada curta')
  })

  it('null se lista vazia', () => {
    const { container } = render(<WeaponPicker category="exotic" pickKey="x" currentValue=""
      weaponsArmor={weaponsArmor} onPick={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
