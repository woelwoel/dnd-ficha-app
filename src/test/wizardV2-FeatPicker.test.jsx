import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeatPicker } from '../systems/dnd5e/components/CharacterWizardV2/blocks/FeatPicker'

const FEATS = [
  { index: 'atleta', name: 'Atleta', prereq: null, attrBonus: { choices: ['str', 'dex'], amount: 1 },
    desc: 'Você melhora seu físico: levantar, escalar e saltar fica mais fácil.' },
  { index: 'robusto', name: 'Robusto', prereq: null, attrBonus: { choices: ['con'], amount: 1 },
    desc: 'Seu máximo de pontos de vida aumenta.' },
  { index: 'adepto-elemental', name: 'Adepto Elemental', prereq: { type: 'spellcasting' },
    desc: 'Suas magias ignoram resistência a um tipo de dano.' },
]

describe('<FeatPicker>', () => {
  it('lista os talentos', () => {
    render(<FeatPicker feats={FEATS} value={null} onChange={() => {}} />)
    expect(screen.getByText('Atleta')).toBeInTheDocument()
    expect(screen.getByText('Robusto')).toBeInTheDocument()
    expect(screen.getByText('Adepto Elemental')).toBeInTheDocument()
  })

  it('permite LER a descrição de um talento sem selecioná-lo', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FeatPicker feats={FEATS} value={null} onChange={onChange} />)
    // descrição não visível inicialmente
    expect(screen.queryByText(/levantar, escalar e saltar/)).not.toBeInTheDocument()
    // expande a descrição do Atleta (botão "o que faz?")
    await user.click(screen.getByRole('button', { name: /o que faz.*atleta/i }))
    expect(screen.getByText(/levantar, escalar e saltar/)).toBeInTheDocument()
    // ler a descrição NÃO seleciona o talento
    expect(onChange).not.toHaveBeenCalled()
  })

  it('mostra o pré-requisito do talento', async () => {
    const user = userEvent.setup()
    render(<FeatPicker feats={FEATS} value={null} onChange={() => {}} />)
    await user.click(screen.getByRole('button', { name: /o que faz.*adepto elemental/i }))
    expect(screen.getByText(/Pré-requisito/i)).toBeInTheDocument()
    expect(screen.getByText(/conjura/i)).toBeInTheDocument()
  })

  it('selecionar um talento chama onChange com a forma esperada', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FeatPicker feats={FEATS} value={null} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /^Selecionar Robusto$/i }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      featIndex: 'robusto', featName: 'Robusto',
      featAttrBonus: { choices: ['con'], amount: 1 },
      featChosenAttr: 'con', // auto pois só há uma opção
    }))
  })

  it('talento com 2+ opções de atributo pede sub-escolha', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    // value já com Atleta selecionado mas sem atributo escolhido
    const value = { featIndex: 'atleta', featName: 'Atleta', featAttrBonus: { choices: ['str', 'dex'], amount: 1 }, featChosenAttr: null }
    render(<FeatPicker feats={FEATS} value={value} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /^DES$/ }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ featChosenAttr: 'dex' }))
  })

  it('filtra por busca', async () => {
    const user = userEvent.setup()
    render(<FeatPicker feats={FEATS} value={null} onChange={() => {}} />)
    await user.type(screen.getByPlaceholderText(/buscar talento/i), 'robu')
    expect(screen.getByText('Robusto')).toBeInTheDocument()
    expect(screen.queryByText('Atleta')).not.toBeInTheDocument()
  })

  describe('prereq de raça (Xanathar)', () => {
    const RACIAL = [
      ...FEATS,
      { index: 'fortitude-ana', name: 'Fortitude Anã', desc: 'Sangue de heróis anões.',
        prereq: { type: 'race', races: ['anao'] }, attrBonus: { choices: ['con'], amount: 1 } },
    ]

    it('esconde talento racial de outra raça quando raceInfo é fornecido', () => {
      render(<FeatPicker feats={RACIAL} value={null} onChange={() => {}} raceInfo={{ race: 'humano', subrace: '' }} />)
      expect(screen.getByText('Atleta')).toBeInTheDocument()
      expect(screen.queryByText('Fortitude Anã')).not.toBeInTheDocument()
    })

    it('mostra talento racial pra raça certa (match por raça ou sub-raça)', () => {
      render(<FeatPicker feats={RACIAL} value={null} onChange={() => {}} raceInfo={{ race: 'anao', subrace: 'anao-da-colina' }} />)
      expect(screen.getByText('Fortitude Anã')).toBeInTheDocument()
    })

    it('sem raceInfo mostra tudo (retrocompat)', () => {
      render(<FeatPicker feats={RACIAL} value={null} onChange={() => {}} />)
      expect(screen.getByText('Fortitude Anã')).toBeInTheDocument()
    })

    it('exibe o pré-requisito de raça legível', async () => {
      const user = userEvent.setup()
      render(<FeatPicker feats={RACIAL} value={null} onChange={() => {}} raceInfo={{ race: 'anao', subrace: '' }} />)
      await user.click(screen.getByRole('button', { name: /o que faz.*fortitude anã/i }))
      expect(screen.getByText(/Pré-requisito/i)).toBeInTheDocument()
      expect(screen.getByText(/Anão/)).toBeInTheDocument()
    })
  })
})
