import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { RunesPanel } from '../systems/dnd5e/components/CharacterSheet/RunesPanel'
import { mergeClassChoices } from '../systems/dnd5e/domain/mergeClassChoices'
import { defaultClassFeatureUses } from '../systems/dnd5e/domain/rules'
import phbChoices from '../../public/srd-data/phb-class-choices-pt.json'
import tashaChoices from '../../public/srd-data/tasha-class-choices-pt.json'

// As runas só existem como options do class-choices — o painel lê o catálogo
// composto do SrdProvider, igual ao ManeuversPanel.
const srdMock = vi.hoisted(() => ({ value: { classChoices: {} } }))
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useSrdOptional: () => srdMock.value,
  useSrd: () => srdMock.value,
  useLazySrdDataset: () => null,
}))

const MERGED_CHOICES = mergeClassChoices(phbChoices, tashaChoices, 'tasha')

beforeEach(() => {
  srdMock.value = { classChoices: MERGED_CHOICES }
})

function makeChar({ runas = ['fogo', 'gelo'], archetype = 'cavaleiro-runico', classIndex = 'guerreiro', level = 7 } = {}) {
  return { info: {
    class: classIndex, level, multiclasses: [],
    chosenFeatures: { martial_archetype: archetype, guerreiro_rune_knight_runes: runas },
  } }
}

/** featureUses REAIS, do mesmo caminho que a ficha usa. */
function usesFor(char, gastas = []) {
  return defaultClassFeatureUses(char, MERGED_CHOICES)
    .map(u => (gastas.includes(u.id) ? { ...u, used: u.max } : u))
}

function renderPanel(char, { uses, onSpend = () => {}, onRegain = () => {} } = {}) {
  return render(
    <RunesPanel
      character={char}
      featureUses={uses ?? usesFor(char)}
      onSpend={onSpend}
      onRegain={onRegain}
    />
  )
}

describe('<RunesPanel>', () => {
  it('não renderiza pra Guerreiro de outro arquétipo', () => {
    const char = makeChar({ archetype: 'campeao' })
    const { container } = renderPanel(char)
    expect(container.firstChild).toBeNull()
  })

  it('não renderiza pra não-Guerreiro', () => {
    const { container } = renderPanel(makeChar({ classIndex: 'paladino' }))
    expect(container.firstChild).toBeNull()
  })

  it('não renderiza sem runas gravadas', () => {
    const { container } = renderPanel(makeChar({ runas: [] }))
    expect(container.firstChild).toBeNull()
  })

  it('lista as runas gravadas com passiva e selo da invocação', () => {
    renderPanel(makeChar({ runas: ['fogo', 'nuvem'] }))
    expect(screen.getByText('Runa do Fogo')).toBeInTheDocument()
    expect(screen.getByText('Runa da Nuvem')).toBeInTheDocument()
    expect(screen.getByText(/Dobra o bônus de proficiência/)).toBeInTheDocument()
    expect(screen.getByText('REAÇÃO')).toBeInTheDocument()   // invocação da Runa da Nuvem
  })

  it('os ícones existem no registro (nome inválido renderiza nada)', () => {
    renderPanel(makeChar({ runas: ['fogo'] }))
    const invocar = screen.getByRole('button', { name: /invocar/i })
    expect(invocar.querySelector('svg')).not.toBeNull()
    expect(screen.getByText(/prontas/).querySelector('svg')).not.toBeNull()
  })

  it('cabeçalho conta runas gravadas e invocações prontas', () => {
    const char = makeChar({ runas: ['fogo', 'gelo', 'pedra'] })
    renderPanel(char, { uses: usesFor(char, ['guerreiro-rune-gelo']) })
    expect(screen.getByText(/3 gravadas/)).toBeInTheDocument()
    expect(screen.getByText(/2\/3 prontas/)).toBeInTheDocument()
  })

  it('invocar gasta o tracker DAQUELA runa', () => {
    const onSpend = vi.fn()
    renderPanel(makeChar({ runas: ['fogo', 'gelo'] }), { onSpend })
    const linha = screen.getByText('Runa do Gelo').closest('div.flex')
    fireEvent.click(within(linha).getByRole('button', { name: /invocar/i }))
    expect(onSpend).toHaveBeenCalledTimes(1)
    expect(onSpend).toHaveBeenCalledWith('guerreiro-rune-gelo')
  })

  it('runa já invocada não gasta de novo e oferece recuperar', () => {
    const char = makeChar({ runas: ['fogo'] })
    const onSpend = vi.fn()
    const onRegain = vi.fn()
    renderPanel(char, { uses: usesFor(char, ['guerreiro-rune-fogo']), onSpend, onRegain })
    const linha = screen.getByText('Runa do Fogo').closest('div.flex')
    const invocar = within(linha).getByRole('button', { name: /invocada/i })
    expect(invocar).toBeDisabled()
    fireEvent.click(invocar)
    expect(onSpend).not.toHaveBeenCalled()
    fireEvent.click(within(linha).getByRole('button', { name: /recuperar/i }))
    expect(onRegain).toHaveBeenCalledWith('guerreiro-rune-fogo')
  })

  it('enquanto o catálogo não chega, avisa em vez de sumir com a runa', () => {
    srdMock.value = { classChoices: {} }
    const char = makeChar({ runas: ['fogo'] })
    renderPanel(char, { uses: [] })
    expect(screen.getByRole('heading', { name: /Runas/i })).toBeInTheDocument()
    expect(screen.getByText(/Carregando runas/i)).toBeInTheDocument()
  })

  it('acha as runas do Guerreiro multiclasse', () => {
    const char = { info: {
      class: 'mago', level: 5, chosenFeatures: {},
      multiclasses: [{ class: 'guerreiro', level: 3, chosenFeatures: {
        martial_archetype: 'cavaleiro-runico',
        guerreiro_rune_knight_runes: ['pedra'],
      } }],
    } }
    renderPanel(char)
    expect(screen.getByText('Runa da Pedra')).toBeInTheDocument()
  })
})
