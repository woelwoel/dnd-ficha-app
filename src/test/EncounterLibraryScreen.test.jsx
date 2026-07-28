// src/test/EncounterLibraryScreen.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const api = vi.hoisted(() => ({ templates: [], party: [], created: [], deleted: [], createResult: null }))

vi.mock('../lib/encounterTemplates', () => ({
  listTemplates: vi.fn(async () => api.templates),
  createTemplate: vi.fn(async (campaignId, name, monsters) => {
    if (api.createResult) return api.createResult
    const row = { id: `tpl-${api.created.length + 1}`, campaign_id: campaignId, name, monsters }
    api.created.push(row)
    api.templates = [...api.templates, row]
    return { ok: true, row }
  }),
  updateTemplate: vi.fn(async () => ({ ok: true })),
  deleteTemplate: vi.fn(async (id) => { api.deleted.push(id); api.templates = api.templates.filter(t => t.id !== id); return { ok: true } }),
}))
vi.mock('../lib/campaigns', () => ({ loadCampaignCharacters: vi.fn(async () => api.party) }))
vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({
  BestiaryModal: ({ isOpen, onPick }) => isOpen
    ? <button onClick={() => onPick({ index: 'goblin', name: 'Goblin', hit_points: 7, dexterity: 14, xp: 50, armor_class: [{ value: 15 }] })}>stub-add-goblin</button>
    : null,
}))
// EncounterLibraryScreen usa useLazySrdDataset('monsters') pra resolver a
// receita salva de volta em statblock (fromRecipe). Sem Provider real na
// árvore de teste, stub o catálogo com o mesmo goblin usado no stub do
// bestiário acima, senão useSrd() explode fora de um <SrdProvider>.
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useLazySrdDataset: () => [
    { index: 'goblin', name: 'Goblin', hit_points: 7, dexterity: 14, xp: 50, armor_class: [{ value: 15 }] },
  ],
}))

const { EncounterLibraryScreen } = await import('../systems/dnd5e/components/Encounter/EncounterLibraryScreen')

function anaRow() {
  return {
    id: 'a', owner_id: 'u2', campaign_id: 'camp-1', version: 1,
    data: { id: 'a', info: { name: 'Ana', level: 3 }, attributes: { dex: 14 }, combat: {} },
  }
}

beforeEach(() => {
  api.templates = []
  api.party = [anaRow(), { ...anaRow(), id: 'b', data: { ...anaRow().data, id: 'b', info: { name: 'Bruno', level: 3 } } }]
  api.created = []
  api.deleted = []
  api.createResult = null
})

describe('EncounterLibraryScreen', () => {
  it('mesa sem encontros salvos convida a criar o primeiro', async () => {
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    expect(await screen.findByText(/nenhum encontro salvo/i)).toBeInTheDocument()
  })

  it('lista os salvos com a faixa contra a companhia ATUAL', async () => {
    // 3 goblins = 150 XP bruto, ×2 = 300; 2 personagens nv3 → limiares
    // 150/300/450/800 → 300 cai em "médio".
    api.templates = [{ id: 't1', name: 'Emboscada', monsters: [{ monsterIndex: 'goblin', count: 3 }] }]
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    expect(await screen.findByText('Emboscada')).toBeInTheDocument()
    expect(await screen.findByText(/médio/i)).toBeInTheDocument()
  })

  it('cria um encontro com nome e monstros', async () => {
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /novo encontro/i }))
    await userEvent.type(screen.getByLabelText(/nome do encontro/i), 'Emboscada na ponte')
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    await waitFor(() => expect(api.created).toHaveLength(1))
    expect(api.created[0]).toMatchObject({ name: 'Emboscada na ponte' })
    expect(api.created[0].monsters).toEqual([{ monsterIndex: 'goblin', count: 1 }])
  })

  it('agrupa monstros repetidos em count', async () => {
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /novo encontro/i }))
    await userEvent.type(screen.getByLabelText(/nome do encontro/i), 'Três goblins')
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    const add = screen.getByText('stub-add-goblin')
    await userEvent.click(add)
    await userEvent.click(add)
    await userEvent.click(add)
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    await waitFor(() => expect(api.created).toHaveLength(1))
    expect(api.created[0].monsters).toEqual([{ monsterIndex: 'goblin', count: 3 }])
  })

  it('nome duplicado avisa e não sai da edição', async () => {
    api.createResult = { ok: false, reason: 'duplicate-name' }
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /novo encontro/i }))
    await userEvent.type(screen.getByLabelText(/nome do encontro/i), 'Repetido')
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    expect(await screen.findByText(/já existe um encontro com esse nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nome do encontro/i)).toBeInTheDocument()
  })

  it('apagar pede confirmação', async () => {
    api.templates = [{ id: 't1', name: 'Emboscada', monsters: [] }]
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /apagar emboscada/i }))
    await userEvent.click(screen.getByRole('button', { name: /^apagar$/i }))
    await waitFor(() => expect(api.deleted).toEqual(['t1']))
  })
})
