import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LandCirclePanel } from '../components/CharacterSheet/LandCirclePanel'

function makeChar(overrides = {}) {
  return {
    info: { class: 'druida', level: 4, chosenFeatures: { druid_circle: 'terra' }, ...overrides.info },
    combat: {},
  }
}

const defaultNRUse = { id: 'druida-natural-recovery', name: 'Recuperação Natural', max: 1, used: 0, recharge: 'long' }
const defaultSanctUse = { id: 'druida-natures-sanctuary', name: 'Refúgio da Natureza', max: 1, used: 0, recharge: 'long' }

describe('<LandCirclePanel>', () => {
  it('não renderiza para Círculo da Lua', () => {
    const char = makeChar({ info: { chosenFeatures: { druid_circle: 'lua' } } })
    const { container } = render(
      <LandCirclePanel druidaLevel={4} character={char} featureUses={[defaultNRUse]} slotsMax={{}} usedSlots={{}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('não renderiza para nv < 2', () => {
    const char = makeChar({ info: { level: 1 } })
    const { container } = render(
      <LandCirclePanel druidaLevel={1} character={char} featureUses={[]} slotsMax={{}} usedSlots={{}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza header + Recuperação Natural com orçamento correto', () => {
    render(
      <LandCirclePanel
        druidaLevel={4} character={makeChar()} featureUses={[defaultNRUse]}
        slotsMax={{ 1: 4, 2: 3 }} usedSlots={{}}
      />
    )
    expect(screen.getByText('Círculo da Terra')).toBeInTheDocument()
    expect(screen.getByText('Recuperação Natural')).toBeInTheDocument()
    // ⌈4/2⌉ = 2 — número está dentro de <strong>, busca pelo conteúdo do strong
    expect(screen.getByText('2', { selector: 'strong' })).toBeInTheDocument()
  })

  it('orçamento escala com nível: nv 10 → 5 níveis', () => {
    render(
      <LandCirclePanel
        druidaLevel={10} character={makeChar({ info: { level: 10 } })} featureUses={[defaultNRUse]}
        slotsMax={{ 1: 4, 2: 3 }} usedSlots={{}}
      />
    )
    expect(screen.getByText('5', { selector: 'strong' })).toBeInTheDocument()
  })

  it('botão "Recuperar" desabilita quando já usado', () => {
    const used = { ...defaultNRUse, used: 1 }
    render(
      <LandCirclePanel
        druidaLevel={4} character={makeChar()} featureUses={[used]}
        slotsMax={{ 1: 4 }} usedSlots={{ 1: 2 }}
      />
    )
    expect(screen.getByRole('button', { name: 'Usado' })).toBeDisabled()
  })

  it('picker mostra apenas slots gastos de níveis 1-5', async () => {
    const user = userEvent.setup()
    render(
      <LandCirclePanel
        druidaLevel={12} character={makeChar({ info: { level: 12 } })} featureUses={[defaultNRUse]}
        slotsMax={{ 1: 4, 2: 3, 3: 3, 6: 1 }} usedSlots={{ 1: 2, 2: 0, 3: 1, 6: 1 }}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Recuperar' }))
    // Headers de slot são "Nv N" exatos no SlotRecoveryPicker
    expect(screen.getByText('Nv 1')).toBeInTheDocument()
    expect(screen.getByText('Nv 3')).toBeInTheDocument()
    // Nv 2 não aparece (não está gasto), Nv 6 não aparece (regra PHB)
    expect(screen.queryByText('Nv 2')).not.toBeInTheDocument()
    expect(screen.queryByText('Nv 6')).not.toBeInTheDocument()
  })

  it('aplicar recuperação chama onToggleSlot pra cada slot + spend', async () => {
    const user = userEvent.setup()
    const onToggleSlot = vi.fn()
    const onSpend = vi.fn()
    render(
      <LandCirclePanel
        druidaLevel={4} character={makeChar()} featureUses={[defaultNRUse]}
        slotsMax={{ 1: 4, 2: 3 }} usedSlots={{ 1: 2, 2: 1 }}
        onToggleSlot={onToggleSlot} onSpend={onSpend}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Recuperar' }))
    // Orçamento = ⌈4/2⌉ = 2 níveis. Vamos recuperar 1 slot de Nv 2 (custa 2).
    const plusButtons = screen.getAllByRole('button', { name: '+' })
    // Layout: Nv1 -+ / Nv2 -+ → segundo + é do Nv 2
    await user.click(plusButtons[1])
    await user.click(screen.getByRole('button', { name: 'Recuperar' }))
    expect(onToggleSlot).toHaveBeenCalledWith(2, 0) // usedSlots[2] de 1 pra 0
    expect(onSpend).toHaveBeenCalledWith('druida-natural-recovery')
  })

  it('Refúgio da Natureza aparece em nv 14+', () => {
    render(
      <LandCirclePanel
        druidaLevel={14} character={makeChar({ info: { level: 14 } })}
        featureUses={[defaultNRUse, defaultSanctUse]}
        slotsMax={{}} usedSlots={{}}
      />
    )
    expect(screen.getByText('Refúgio da Natureza')).toBeInTheDocument()
  })

  it('Refúgio: botão Usar consome o recurso', () => {
    const onSpend = vi.fn()
    render(
      <LandCirclePanel
        druidaLevel={14} character={makeChar({ info: { level: 14 } })}
        featureUses={[defaultNRUse, defaultSanctUse]}
        slotsMax={{}} usedSlots={{}}
        onSpend={onSpend}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Usar' }))
    expect(onSpend).toHaveBeenCalledWith('druida-natures-sanctuary')
  })

  it('passivos aparecem em nv 6+ e nv 10+', () => {
    const { rerender } = render(
      <LandCirclePanel
        druidaLevel={6} character={makeChar({ info: { level: 6 } })} featureUses={[defaultNRUse]}
        slotsMax={{}} usedSlots={{}}
      />
    )
    expect(screen.getByText(/Passos da Terra/)).toBeInTheDocument()
    expect(screen.queryByText(/Vínculo com a Terra/)).not.toBeInTheDocument()
    rerender(
      <LandCirclePanel
        druidaLevel={10} character={makeChar({ info: { level: 10 } })} featureUses={[defaultNRUse]}
        slotsMax={{}} usedSlots={{}}
      />
    )
    expect(screen.getByText(/Vínculo com a Terra/)).toBeInTheDocument()
  })
})
