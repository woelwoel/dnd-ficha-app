import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const GOBLIN = { index: 'goblin', name: 'Goblin', hit_points: 7, xp: 50, armor_class: [{ value: 15 }], dexterity: 14 }
const HOBGOBLIN = { index: 'hobgoblin', name: 'Hobgoblin', hit_points: 11, xp: 100, armor_class: [{ value: 18 }], dexterity: 12 }

const api = vi.hoisted(() => ({ templates: [], created: [], updated: [], run: [] }))

vi.mock('../lib/encounterTemplates', () => ({
  listTemplates: vi.fn(async () => api.templates),
  createTemplate: vi.fn(async (campaignId, name, monsters, notes) => {
    api.created.push({ campaignId, name, monsters, notes })
    return { ok: true, row: { id: `t${api.created.length}`, name, monsters, notes } }
  }),
  updateTemplate: vi.fn(async (id, patch) => { api.updated.push({ id, ...patch }); return { ok: true } }),
  deleteTemplate: vi.fn(async () => ({ ok: true })),
}))
vi.mock('../lib/campaigns', () => ({ loadCampaignCharacters: vi.fn(async () => []) }))
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useLazySrdDataset: () => ([GOBLIN, HOBGOBLIN]),
}))
vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({ BestiaryModal: () => null }))

const { EncounterLibraryScreen } = await import('../systems/dnd5e/components/Encounter/EncounterLibraryScreen')

function tpl(id, name, monsters, notes = null) {
  return { id, campaign_id: 'camp-1', name, monsters, notes }
}

function montar(extra = {}) {
  render(
    <EncounterLibraryScreen
      campaignId="camp-1"
      onBack={() => {}}
      onRun={(id) => api.run.push(id)}
      {...extra}
    />,
  )
}

beforeEach(() => { api.templates = []; api.created = []; api.updated = []; api.run = [] })

describe('composição no card', () => {
  it('conta o que tem dentro do encontro salvo', async () => {
    api.templates = [tpl('t1', 'Emboscada', [
      { monsterIndex: 'goblin', count: 4 }, { monsterIndex: 'hobgoblin', count: 1 },
    ])]
    montar()

    expect(await screen.findByText('4× Goblin · 1× Hobgoblin')).toBeInTheDocument()
  })

  it('mostra a nota truncada quando existe', async () => {
    api.templates = [tpl('t1', 'Emboscada', [{ monsterIndex: 'goblin', count: 2 }], 'Eles atacam da ponte.')]
    montar()

    expect(await screen.findByText('Eles atacam da ponte.')).toBeInTheDocument()
  })
})

describe('rodar direto', () => {
  it('avisa o pai com o id do encontro', async () => {
    api.templates = [tpl('t1', 'Emboscada', [{ monsterIndex: 'goblin', count: 2 }])]
    montar()
    await userEvent.click(await screen.findByRole('button', { name: /rodar emboscada/i }))

    expect(api.run).toEqual(['t1'])
  })

  it('sem onRun o botão nem aparece', async () => {
    api.templates = [tpl('t1', 'Emboscada', [{ monsterIndex: 'goblin', count: 2 }])]
    montar({ onRun: undefined })
    await screen.findByText(/emboscada/i)

    expect(screen.queryByRole('button', { name: /rodar emboscada/i })).not.toBeInTheDocument()
  })
})

describe('duplicar', () => {
  it('cria uma cópia com a mesma receita e a nota', async () => {
    api.templates = [tpl('t1', 'Emboscada', [{ monsterIndex: 'goblin', count: 4 }], 'da ponte')]
    montar()
    await userEvent.click(await screen.findByRole('button', { name: /duplicar emboscada/i }))

    await waitFor(() => expect(api.created).toHaveLength(1))
    expect(api.created[0]).toMatchObject({
      name: 'Emboscada (cópia)',
      monsters: [{ monsterIndex: 'goblin', count: 4 }],
      notes: 'da ponte',
    })
  })

  it('numera a partir da segunda cópia', async () => {
    api.templates = [
      tpl('t1', 'Emboscada', [{ monsterIndex: 'goblin', count: 1 }]),
      tpl('t2', 'Emboscada (cópia)', [{ monsterIndex: 'goblin', count: 1 }]),
    ]
    montar()
    await userEvent.click(await screen.findByRole('button', { name: /^duplicar emboscada$/i }))

    await waitFor(() => expect(api.created).toHaveLength(1))
    expect(api.created[0].name).toBe('Emboscada (cópia 2)')
  })
})

describe('busca', () => {
  const seis = () => Array.from({ length: 6 }, (_, i) =>
    tpl(`t${i}`, `Encontro ${i}`, [{ monsterIndex: 'goblin', count: 1 }]))

  it('não aparece com poucos encontros', async () => {
    api.templates = seis().slice(0, 5)
    montar()
    await screen.findByText('Encontro 0')

    expect(screen.queryByLabelText(/buscar encontro/i)).not.toBeInTheDocument()
  })

  it('filtra pelo nome acima do limite', async () => {
    api.templates = seis()
    montar()
    await userEvent.type(await screen.findByLabelText(/buscar encontro/i), 'Encontro 3')

    expect(screen.getByText('Encontro 3')).toBeInTheDocument()
    expect(screen.queryByText('Encontro 4')).not.toBeInTheDocument()
  })

  it('busca sem resultado explica em vez de parecer mesa vazia', async () => {
    api.templates = seis()
    montar()
    await userEvent.type(await screen.findByLabelText(/buscar encontro/i), 'dragão')

    expect(screen.getByText(/nenhum encontro com "dragão" no nome/i)).toBeInTheDocument()
    expect(screen.queryByText(/nenhum encontro salvo nesta mesa ainda/i)).not.toBeInTheDocument()
  })
})

describe('notas', () => {
  it('salva a nota junto da receita', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: /novo encontro/i }))
    await userEvent.type(screen.getByLabelText(/nome do encontro/i), 'Ponte')
    await userEvent.type(screen.getByLabelText(/notas do encontro/i), 'Tesouro no barco')
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }))

    await waitFor(() => expect(api.created).toHaveLength(1))
    expect(api.created[0]).toMatchObject({ name: 'Ponte', notes: 'Tesouro no barco' })
  })

  it('editar carrega a nota existente', async () => {
    api.templates = [tpl('t1', 'Emboscada', [{ monsterIndex: 'goblin', count: 1 }], 'da ponte')]
    montar()
    await userEvent.click(await screen.findByRole('button', { name: /editar/i }))

    expect(screen.getByLabelText(/notas do encontro/i)).toHaveValue('da ponte')
  })
})
