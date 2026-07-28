import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// `encounterRow` fica dentro do objeto hoisted (não numa closure isolada do
// factory) justamente pra poder ser resetado no beforeEach — sem isso, o
// encontro criado/iniciado por um teste vazava pro próximo (mesmo
// campaignId em todos os testes), e a tela já nascia na fase de combate.
const api = vi.hoisted(() => ({ party: [], writes: [], writeResult: { ok: true, version: 2 }, encounterRow: null }))

vi.mock('../lib/campaigns', () => ({
  loadCampaignCharacters: vi.fn(async () => api.party),
}))
vi.mock('../lib/dmWrites', () => ({
  dmApplyCombatState: vi.fn(async (id, patch, v) => { api.writes.push({ id, patch, v }); return api.writeResult }),
  dmSaveCharacter: vi.fn(async () => ({ ok: true, version: 2 })),
}))
vi.mock('../lib/encounters', () => ({
  getActiveEncounter: vi.fn(async () => api.encounterRow),
  createEncounter: vi.fn(async (campaignId, state) => {
    api.encounterRow = { id: 'enc-1', campaign_id: campaignId, state, version: 1 }
    return { ok: true, row: api.encounterRow }
  }),
  saveEncounterState: vi.fn(async (id, state) => {
    api.encounterRow = { ...api.encounterRow, state, version: api.encounterRow.version + 1 }
    return { ok: true, version: api.encounterRow.version }
  }),
  closeEncounter: vi.fn(async () => { api.encounterRow = null; return { ok: true } }),
  subscribeEncounter: vi.fn(() => () => {}),
}))
vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({ BestiaryModal: () => null }))
// SetupPanel (Task 13) lista encontros salvos e usa o catálogo de monstros —
// nenhum dos dois é o foco deste arquivo, então ficam vazios/mockados pra não
// bater no Supabase real nem exigir <SrdProvider> ancestral.
vi.mock('../lib/encounterTemplates', () => ({
  listTemplates: vi.fn(async () => []),
}))
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useLazySrdDataset: () => ([]),
}))

const { EncounterScreen } = await import('../systems/dnd5e/components/Encounter/EncounterScreen')

function anaRow(overrides = {}) {
  return {
    id: 'a', owner_id: 'u2', campaign_id: 'camp-1', short_id: 'ABCDEFGHJK', version: 4,
    data: {
      id: 'a', info: { name: 'Ana', level: 3 },
      attributes: { dex: 14 },
      combat: { maxHp: 20, currentHp: 18, tempHp: 0, conditions: [], deathSaves: { successes: 0, failures: 0 } },
      ...overrides,
    },
  }
}

beforeEach(() => { api.party = [anaRow()]; api.writes = []; api.writeResult = { ok: true, version: 5 }; api.encounterRow = null })

describe('EncounterScreen', () => {
  it('mostra a companhia da mesa na montagem', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    expect(await screen.findByLabelText('Ana')).toBeChecked()
  })

  it('rolar iniciativa entra na fase de combate com rodada 1', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    expect(await screen.findByText(/rodada 1/i)).toBeInTheDocument()
  })

  it('dano num PJ vai pela RPC com o patch estreito e a versão da ficha', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    await userEvent.type(await screen.findByLabelText(/valor de dano ou cura/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))
    await waitFor(() => expect(api.writes).toHaveLength(1))
    expect(api.writes[0]).toMatchObject({ id: 'a', v: 4 })
    expect(api.writes[0].patch).toMatchObject({ currentHp: 13, tempHp: 0, isDead: false })
    expect(api.writes[0].patch.maxHp).toBeUndefined()
    expect(await screen.findByText('13/20')).toBeInTheDocument()
  })

  it('avisa a CD de concentração quando o PJ estava concentrando', async () => {
    api.party = [anaRow({
      combat: { maxHp: 20, currentHp: 18, tempHp: 0, conditions: [], deathSaves: { successes: 0, failures: 0 }, concentrating: { spellIndex: 'bless', spellName: 'Bênção' } },
    })]
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    await userEvent.type(await screen.findByLabelText(/valor de dano ou cura/i), '20')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))
    expect(await screen.findByText(/CD 10 de concentração/i)).toBeInTheDocument()
  })

  it('conflito de versão avisa sem sobrescrever', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    api.writeResult = { ok: false, reason: 'conflict' }
    await userEvent.type(await screen.findByLabelText(/valor de dano ou cura/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))
    expect(await screen.findByText(/ficha mudou/i)).toBeInTheDocument()
  })

  it('próximo turno avança e vira a rodada', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    await userEvent.click(screen.getByRole('button', { name: /pr[óo]ximo/i }))
    expect(await screen.findByText(/rodada 2/i)).toBeInTheDocument()
  })

  it('aviso de concentração some ao avançar o turno', async () => {
    api.party = [anaRow({
      combat: { maxHp: 20, currentHp: 18, tempHp: 0, conditions: [], deathSaves: { successes: 0, failures: 0 }, concentrating: { spellIndex: 'bless', spellName: 'Bênção' } },
    })]
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    await userEvent.type(await screen.findByLabelText(/valor de dano ou cura/i), '20')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))
    expect(await screen.findByText(/CD 10 de concentração/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /pr[óo]ximo/i }))
    expect(screen.queryByText(/CD 10 de concentração/i)).not.toBeInTheDocument()
  })

  it('falha na escrita E no resync avisa e não apaga a companhia da tela', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))

    // loadCampaignCharacters NUNCA lança (engole erro de rede e devolve []
    // igual a uma mesa vazia — ver src/lib/campaigns.js:199); simulamos essa
    // devolução vazia pra exercitar o pior caso: nem a escrita, nem o resync.
    api.writeResult = { ok: false, reason: 'unknown' }
    api.party = []
    await userEvent.type(await screen.findByLabelText(/valor de dano ou cura/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))

    expect(await screen.findByText(/falha ao escrever e ao recarregar/i)).toBeInTheDocument()
    // a companhia continua na tela — o resync vazio não pode apagar a ficha
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })
})
