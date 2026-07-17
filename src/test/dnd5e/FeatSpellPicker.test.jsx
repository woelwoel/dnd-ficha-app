import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { FeatSpellPicker, computeSpellPickToggle, resolveFixedSpells } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker'
import { mockSrdFetch } from '../integration/helpers'

// SrdProvider real faz fetch() dos JSONs em /srd-data — em jsdom não há fetch
// real, então mockamos pra servir o conteúdo físico de public/srd-data
// (mesmo padrão de feat-spell-math-badge.test.jsx).

function renderPicker(props) {
  return render(
    <SrdProvider>
      <FeatSpellPicker {...props} />
    </SrdProvider>
  )
}

describe('FeatSpellPicker — talento sem pickList (Tocado pelas Fadas)', () => {
  beforeEach(() => {
    mockSrdFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('talento sem concessão de magia não renderiza nada', () => {
    const { container } = renderPicker({ featIndex: 'robusto', value: null, onChange: () => {} })
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra a magia fixa como chip read-only', async () => {
    renderPicker({ featIndex: 'tocado-pelas-fadas', value: null, onChange: () => {} })
    expect(await screen.findByText(/Passo Nebuloso/)).toBeInTheDocument()
  })

  it('lista as 21 candidatas de 1º círculo de adivinhação/encantamento', async () => {
    renderPicker({ featIndex: 'tocado-pelas-fadas', value: null, onChange: () => {} })
    // Enfeitiçar Pessoa é encantamento de 1º — está na lista
    expect(await screen.findByRole('button', { name: /Enfeitiçar Pessoa/ })).toBeInTheDocument()
    // Bola de Fogo (evocação de 3º) NÃO está
    expect(screen.queryByRole('button', { name: /Bola de Fogo/ })).not.toBeInTheDocument()
  })

  it('clicar numa magia emite picks no ordinal certo (0, não o grantIdx 1)', async () => {
    const onChange = vi.fn()
    renderPicker({ featIndex: 'tocado-pelas-fadas', value: null, onChange })
    await userEvent.click(await screen.findByRole('button', { name: /Enfeitiçar Pessoa/ }))
    expect(onChange).toHaveBeenCalledWith({ list: null, picks: [['enfeiticar-pessoa']] })
  })

  it('clicar de novo desmarca', async () => {
    const onChange = vi.fn()
    renderPicker({
      featIndex: 'tocado-pelas-fadas',
      value: { list: null, picks: [['enfeiticar-pessoa']] },
      onChange,
    })
    await userEvent.click(await screen.findByRole('button', { name: /Enfeitiçar Pessoa/ }))
    expect(onChange).toHaveBeenCalledWith({ list: null, picks: [[]] })
  })

  it('contador mostra o progresso e trava no limite', async () => {
    const onChange = vi.fn()
    renderPicker({
      featIndex: 'tocado-pelas-fadas',
      value: { list: null, picks: [['enfeiticar-pessoa']] },
      onChange,
    })
    expect(await screen.findByText('1 / 1')).toBeInTheDocument()
    // count=1 já satisfeito: clicar em OUTRA magia não substitui nem adiciona
    await userEvent.click(screen.getByRole('button', { name: /Comando/ }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('magia escolhida fica marcada (aria-pressed)', async () => {
    renderPicker({
      featIndex: 'tocado-pelas-fadas',
      value: { list: null, picks: [['enfeiticar-pessoa']] },
      onChange: () => {},
    })
    const btn = await screen.findByRole('button', { name: /Enfeitiçar Pessoa/ })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('busca filtra a lista', async () => {
    renderPicker({ featIndex: 'tocado-pelas-fadas', value: null, onChange: () => {} })
    await screen.findByRole('button', { name: /Enfeitiçar Pessoa/ })
    await userEvent.type(screen.getByPlaceholderText(/Buscar/), 'enfeit')
    expect(screen.getByRole('button', { name: /Enfeitiçar Pessoa/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Comando/ })).not.toBeInTheDocument()
  })

  it('Tocado pelas Sombras: fixa Invisibilidade + ilusão/necromancia', async () => {
    renderPicker({ featIndex: 'tocado-pelas-sombras', value: null, onChange: () => {} })
    expect(await screen.findByText(/Invisibilidade/)).toBeInTheDocument()
    // Causar Medo é necromancia de 1º
    expect(screen.getByRole('button', { name: /Causar Medo/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enfeitiçar Pessoa/ })).not.toBeInTheDocument()
  })

  it('Alta Magia Drow: 3 fixas, nenhum bloco de escolha', async () => {
    renderPicker({ featIndex: 'alta-magia-drow', value: null, onChange: () => {} })
    expect(await screen.findByText(/Detectar Magia/)).toBeInTheDocument()
    expect(screen.getByText(/Levitação/)).toBeInTheDocument()
    expect(screen.getByText(/Dissipar Magia/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Buscar/)).not.toBeInTheDocument()
  })
})

describe('computeSpellPickToggle', () => {
  // O botão de uma magia sem vaga fica `disabled` — clicar nele não dispara
  // onClick em nenhum framework de teste (nem fireEvent.click num node com
  // `.disabled` forçado pra false: o React lê `disabled` das props do fiber,
  // não do DOM ao vivo). Por isso a trava de limite só é observável testando
  // a função pura isolada, não via clique renderizado.
  it('nao adiciona alem do limite (retorna null)', () => {
    expect(computeSpellPickToggle(['enfeiticar-pessoa'], 'comando', 1)).toBeNull()
  })

  it('desmarca a magia ja selecionada mesmo no limite', () => {
    expect(computeSpellPickToggle(['enfeiticar-pessoa'], 'enfeiticar-pessoa', 1)).toEqual([])
  })

  it('adiciona quando ha vaga', () => {
    expect(computeSpellPickToggle([], 'enfeiticar-pessoa', 1)).toEqual(['enfeiticar-pessoa'])
  })
})

describe('resolveFixedSpells', () => {
  // Sem o filtro por `g.fixed`, um grant `choose` (sem `.fixed`, portanto
  // `undefined`) cairia num find(index === undefined) — hoje inofensivo só
  // porque nenhuma magia REAL tem index undefined. Craft deliberado de uma
  // entrada "fantasma" com index undefined prova o contrato sem depender
  // dessa coincidência dos dados de produção.
  it('ignora grants choose mesmo com uma entrada fantasma de index undefined', () => {
    const def = { grants: [{ fixed: 'a' }, { choose: { count: 1, level: 1 } }] }
    const srdSpells = [{ index: 'a', name: 'A' }, { index: undefined, name: 'FANTASMA' }]
    expect(resolveFixedSpells(def, srdSpells).map(s => s.name)).toEqual(['A'])
  })
})
