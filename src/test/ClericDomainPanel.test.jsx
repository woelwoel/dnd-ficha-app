import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClericDomainPanel } from '../systems/dnd5e/components/CharacterSheet/ClericDomainPanel'

const mockRoll = vi.fn()
const mockOpenPanel = vi.fn()
vi.mock('../hooks/useDiceRoller', () => ({
  useDiceRoller: () => ({ roll: mockRoll, openPanel: mockOpenPanel }),
}))

function makeChar(domain, overrides = {}) {
  return {
    info: { class: 'clerigo', level: 5, chosenFeatures: { divine_domain: domain }, ...overrides.info },
    attributes: { wis: 16, ...overrides.attributes },
  }
}

const cdUse = { id: 'clerigo-channel-divinity', name: 'Canalizar Divindade', max: 1, used: 0, recharge: 'short' }

describe('<ClericDomainPanel>', () => {
  it('não renderiza sem domínio escolhido', () => {
    const char = { info: { class: 'clerigo', level: 5, chosenFeatures: {} } }
    const { container } = render(
      <ClericDomainPanel clericoLevel={5} character={char} featureUses={[cdUse]} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('Vida: mostra Discípulo da Vida + Preservar Vida com pool 5×nv', () => {
    render(
      <ClericDomainPanel clericoLevel={5} character={makeChar('vida')} featureUses={[cdUse]} />
    )
    expect(screen.getByText('Domínio da Vida')).toBeInTheDocument()
    expect(screen.getByText(/Preservar Vida/)).toBeInTheDocument()
    expect(screen.getByText('25', { selector: 'strong' })).toBeInTheDocument()
  })

  it('Vida: botão Usar CD chama onSpend', () => {
    const onSpend = vi.fn()
    render(
      <ClericDomainPanel clericoLevel={5} character={makeChar('vida')} featureUses={[cdUse]} onSpend={onSpend} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Usar CD' }))
    expect(onSpend).toHaveBeenCalledWith('clerigo-channel-divinity')
  })

  it('Guerra: Ataque Bélico Bônus aparece com featureUse próprio', () => {
    const warPriest = { id: 'clerigo-war-priest', name: 'Ataque Bélico Bônus', max: 3, used: 0, recharge: 'short' }
    render(
      <ClericDomainPanel clericoLevel={5} character={makeChar('guerra')} featureUses={[cdUse, warPriest]} onSpend={() => {}} />
    )
    expect(screen.getByText(/Ataque Bélico Bônus/)).toBeInTheDocument()
    expect(screen.getByText(/3\/3/)).toBeInTheDocument()
  })

  it('Tempestade: Investida Furiosa rola 2d8 ao usar', () => {
    const wrath = { id: 'clerigo-wrath-of-storm', name: 'Investida Furiosa', max: 3, used: 0, recharge: 'long' }
    const onSpend = vi.fn()
    render(
      <ClericDomainPanel clericoLevel={5} character={makeChar('tempestade')} featureUses={[cdUse, wrath]} onSpend={onSpend} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Rolar 2d8' }))
    expect(onSpend).toHaveBeenCalledWith('clerigo-wrath-of-storm')
    expect(mockRoll).toHaveBeenCalledWith('2d8', expect.stringContaining('Investida Furiosa'))
  })

  it('Natureza: mostra info passiva sem botão de combate', () => {
    render(
      <ClericDomainPanel clericoLevel={5} character={makeChar('natureza')} featureUses={[cdUse]} />
    )
    expect(screen.getByText(/Encantar Animais e Plantas/)).toBeInTheDocument()
  })
})
