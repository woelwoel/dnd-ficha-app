import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const GOBLIN = {
  index: 'goblin', name: 'Goblin', hit_points: 7, xp: 50, challenge_rating: 0.25,
  armor_class: [{ value: 15 }], dexterity: 14, size: 'Small', type: 'humanoid',
  strength: 8, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8,
  speed: { walk: '30 ft.' }, proficiencies: [], special_abilities: [], actions: [],
}

const api = vi.hoisted(() => ({
  party: [], writes: [], writeResult: { ok: true, version: 5 }, encounterRow: null, picked: null,
}))

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
vi.mock('../lib/encounterTemplates', () => ({ listTemplates: vi.fn(async () => []) }))
// O catálogo devolve o goblin: é dele que sai o statblock do painel.
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useLazySrdDataset: () => ([GOBLIN]),
}))
// Bestiário reduzido a um botão que escolhe o goblin — o que se testa aqui é o
// que a tela FAZ com o monstro escolhido, não a busca do bestiário.
vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({
  BestiaryModal: ({ isOpen, onPick }) => isOpen
    ? <button type="button" onClick={() => onPick(GOBLIN)}>escolher goblin</button>
    : null,
}))

const { EncounterScreen } = await import('../systems/dnd5e/components/Encounter/EncounterScreen')

function anaRow(overrides = {}) {
  return {
    id: 'a', owner_id: 'u2', campaign_id: 'camp-1', short_id: 'ABCDEFGHJK', version: 4,
    data: {
      id: 'a', info: { name: 'Ana', level: 3 },
      attributes: { str: 10, dex: 14, con: 12, int: 10, wis: 13, cha: 8 },
      classes: [{ index: 'fighter', level: 3 }],
      proficiencies: { savingThrows: ['str', 'con'] },
      combat: {
        maxHp: 20, currentHp: 18, tempHp: 0, armorClass: 16, speed: 9,
        conditions: [], deathSaves: { successes: 0, failures: 0 },
      },
      ...overrides,
    },
  }
}

const ordem = () => screen.getByRole('list', { name: /ordem de iniciativa/i })
const painel = () => screen.getByRole('complementary')

async function iniciarCombate() {
  render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
  await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
  await screen.findByText(/rodada 1/i)
}

beforeEach(() => {
  api.party = [anaRow()]
  api.writes = []
  api.writeResult = { ok: true, version: 5 }
  api.encounterRow = null
})

describe('painel de detalhe', () => {
  it('começa vazio convidando a escolher alguém', async () => {
    await iniciarCombate()
    expect(within(painel()).getByText(/escolha alguém na ordem de iniciativa/i)).toBeInTheDocument()
  })

  it('PJ selecionado mostra o resumo tático, não a ficha inteira', async () => {
    await iniciarCombate()
    await userEvent.click(screen.getByRole('button', { name: /abrir detalhe de ana/i }))

    const p = painel()
    expect(within(p).getByText('CA')).toBeInTheDocument()
    expect(within(p).getByText(/salvaguardas/i)).toBeInTheDocument()
    // Proficiente em FOR (+0 do atributo, +2 de proficiência no nível 3)
    expect(within(p).getByText(/FOR \+2/)).toBeInTheDocument()
    expect(within(p).getByText(/efeitos ativos de magia não estão somados/i)).toBeInTheDocument()
  })

  it('monstro selecionado mostra o statblock do catálogo', async () => {
    await iniciarCombate()
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstro/i }))
    await userEvent.click(await screen.findByRole('button', { name: /escolher goblin/i }))
    await userEvent.click(await screen.findByRole('button', { name: /abrir detalhe de goblin/i }))

    // O statblock traz o que a linha não tem: dados de deslocamento e atributos.
    expect(await within(painel()).findByText(/30 ft\./)).toBeInTheDocument()
  })

  it('HP temporário e paleta de condições vivem no painel', async () => {
    await iniciarCombate()
    await userEvent.click(screen.getByRole('button', { name: /abrir detalhe de ana/i }))

    const p = painel()
    await userEvent.type(within(p).getByLabelText(/hp temporário para ana/i), '5')
    await userEvent.click(within(p).getByRole('button', { name: /^hp temporário$/i }))

    await waitFor(() => expect(api.writes).toHaveLength(1))
    expect(api.writes[0].patch).toMatchObject({ tempHp: 5 })
  })
})

describe('seleção', () => {
  it('virar o turno move a seleção para quem está agindo', async () => {
    await iniciarCombate()
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstro/i }))
    await userEvent.click(await screen.findByRole('button', { name: /escolher goblin/i }))
    await screen.findByRole('button', { name: /abrir detalhe de goblin/i })

    await userEvent.click(screen.getByRole('button', { name: /próximo turno/i }))

    // Quem está no turno vira o selecionado: o painel abre no nome dele.
    const ativo = within(ordem()).getAllByRole('listitem')
      .find(li => li.getAttribute('aria-current') === 'step')
    const nome = within(ativo).getByRole('button', { name: /abrir detalhe/i })
    expect(nome).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('adicionar monstro no meio do combate', () => {
  it('entra já com iniciativa rolada, sem trocar o turno', async () => {
    await iniciarCombate()
    const rodadaAntes = screen.getByText(/rodada 1/i).textContent

    await userEvent.click(screen.getByRole('button', { name: /adicionar monstro/i }))
    await userEvent.click(await screen.findByRole('button', { name: /escolher goblin/i }))

    const linhaGoblin = (await within(ordem()).findAllByRole('listitem'))
      .find(li => within(li).queryByRole('button', { name: /abrir detalhe de goblin/i }))
    const iniciativa = within(linhaGoblin).getByLabelText(/iniciativa de goblin/i)

    expect(iniciativa.value).not.toBe('')
    expect(Number(iniciativa.value)).toBeGreaterThan(0)
    expect(screen.getByText(/rodada 1/i).textContent).toBe(rodadaAntes)
  })

  it('soma o XP do reforço no total do encontro', async () => {
    await iniciarCombate()
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstro/i }))
    await userEvent.click(await screen.findByRole('button', { name: /escolher goblin/i }))

    expect(await screen.findByText(/50 XP em monstros/i)).toBeInTheDocument()
  })
})

describe('desfazer', () => {
  it('não aparece antes de qualquer ação', async () => {
    await iniciarCombate()
    expect(screen.queryByRole('button', { name: /^desfazer$/i })).not.toBeInTheDocument()
  })

  it('devolve o HP do monstro ao valor anterior', async () => {
    await iniciarCombate()
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstro/i }))
    await userEvent.click(await screen.findByRole('button', { name: /escolher goblin/i }))

    const linha = (await within(ordem()).findAllByRole('listitem'))
      .find(li => within(li).queryByRole('button', { name: /abrir detalhe de goblin/i }))
    await userEvent.type(within(linha).getByLabelText(/valor de dano ou cura para goblin/i), '5')
    await userEvent.click(within(linha).getByRole('button', { name: /^dano$/i }))

    expect(await within(linha).findByText('2/7')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^desfazer$/i }))
    expect(await within(linha).findByText('7/7')).toBeInTheDocument()
  })

  it('reescreve o bloco combat anterior do PJ pela RPC', async () => {
    await iniciarCombate()
    await userEvent.type(await screen.findByLabelText(/valor de dano ou cura para ana/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))
    await waitFor(() => expect(api.writes).toHaveLength(1))
    expect(api.writes[0].patch).toMatchObject({ currentHp: 13 })

    await userEvent.click(screen.getByRole('button', { name: /^desfazer$/i }))

    await waitFor(() => expect(api.writes).toHaveLength(2))
    expect(api.writes[1].patch).toMatchObject({ currentHp: 18, tempHp: 0 })
  })

  it('some quando o combatente que ele desfaria sai do combate', async () => {
    await iniciarCombate()
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstro/i }))
    await userEvent.click(await screen.findByRole('button', { name: /escolher goblin/i }))

    const linha = (await within(ordem()).findAllByRole('listitem'))
      .find(li => within(li).queryByRole('button', { name: /abrir detalhe de goblin/i }))
    await userEvent.type(within(linha).getByLabelText(/valor de dano ou cura para goblin/i), '5')
    await userEvent.click(within(linha).getByRole('button', { name: /^dano$/i }))
    expect(await screen.findByRole('button', { name: /^desfazer$/i })).toBeInTheDocument()

    await userEvent.click(within(linha).getByRole('button', { name: /remover goblin do combate/i }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^desfazer$/i })).not.toBeInTheDocument())
  })
})

describe('registro', () => {
  it('anota o dano com a rodada', async () => {
    await iniciarCombate()
    await userEvent.type(await screen.findByLabelText(/valor de dano ou cura para ana/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))

    expect(await within(painel()).findByText(/ana sofreu 5 de dano/i)).toBeInTheDocument()
  })
})
