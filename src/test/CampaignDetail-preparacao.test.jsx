import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const api = vi.hoisted(() => ({
  user: { id: 'u1' },
  campaign: { id: 'camp-1', name: 'Test Mesa', dm_id: 'u1', invite_code: '2V5Znh7tmq' },
  members: [],
  characters: { ok: true, rows: [] },
  roster: { ok: true, rows: [] },
  encounter: { ok: true, row: null },
  renamed: [],
  closed: [],
  navigated: [],
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: api.user } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: api.campaign }) }) }),
    }),
    channel: () => {
      const ch = { on: () => ch, subscribe: () => ch }
      return ch
    },
    removeChannel: () => {},
  },
}))
vi.mock('../lib/campaigns', () => ({
  deleteCampaign: vi.fn(async () => ({ ok: true })),
  listMembers: vi.fn(async () => api.members),
  removeMember: vi.fn(async () => ({ ok: true })),
  leaveCampaign: vi.fn(async () => ({ ok: true })),
  fetchCampaignCharacters: vi.fn(async () => api.characters),
  loadCampaignRoster: vi.fn(async () => api.roster),
  renameCampaign: vi.fn(async (id, name) => { api.renamed.push({ id, name }); return { ok: true } }),
}))
vi.mock('../lib/encounters', () => ({
  fetchActiveEncounter: vi.fn(async () => api.encounter),
  closeEncounter: vi.fn(async (id) => { api.closed.push(id); return { ok: true } }),
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => (to) => api.navigated.push(to),
}))
// O menu de conta exige <AuthProvider> e não tem nada a ver com o que esta
// tela decide; fica de fora.
vi.mock('../components/ui/AccountMenu', () => ({ AccountMenu: () => null }))

const { CampaignDetail } = await import('../components/Campaigns/CampaignDetail')

const membroMestre = { user_id: 'u1', role: 'dm', profiles: { display_name: 'Gustavo' } }
const membroAna = { user_id: 'u2', role: 'player', profiles: { display_name: 'cristimansigor2' } }

function fichaDaAna() {
  return {
    id: 'c1', owner_id: 'u2', short_id: 'SAHIR1',
    data: {
      info: { name: 'Sahir Al Madih', race: 'elfo', class: 'ladino', level: 13 },
      combat: { currentHp: 60, maxHp: 74 },
    },
  }
}

beforeEach(() => {
  api.user = { id: 'u1' }
  api.campaign = { id: 'camp-1', name: 'Test Mesa', dm_id: 'u1', invite_code: '2V5Znh7tmq' }
  api.members = [membroMestre, membroAna]
  api.characters = { ok: true, rows: [fichaDaAna()] }
  api.roster = { ok: true, rows: [] }
  api.encounter = { ok: true, row: null }
  api.renamed = []; api.closed = []; api.navigated = []
})

const companhia = () => screen.getByRole('region', { name: /companhia/i })

describe('bloco de ação do combate', () => {
  it('sem encontro aberto convida a rodar combate', async () => {
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)
    expect(await screen.findByRole('button', { name: /rodar combate/i })).toBeInTheDocument()
    expect(screen.getByText(/nenhum combate aberto/i)).toBeInTheDocument()
  })

  it('combate em andamento mostra a rodada e oferece retomar', async () => {
    api.encounter = {
      ok: true,
      row: { id: 'enc-1', state: { started: true, round: 3, combatants: [{}, {}, {}, {}] } },
    }
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)

    expect(await screen.findByRole('button', { name: /retomar combate/i })).toBeInTheDocument()
    expect(screen.getByText(/rodada 3 · 4 na cena/i)).toBeInTheDocument()
  })

  it('encontro aberto sem iniciativa oferece continuar a montagem', async () => {
    api.encounter = { ok: true, row: { id: 'enc-1', state: { started: false, combatants: [] } } }
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)

    expect(await screen.findByRole('button', { name: /continuar montagem/i })).toBeInTheDocument()
  })

  it('encerrar fecha o encontro e volta ao estado sem combate', async () => {
    api.encounter = {
      ok: true,
      row: { id: 'enc-1', state: { started: true, round: 2, combatants: [{}] } },
    }
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /encerrar/i }))

    await waitFor(() => expect(api.closed).toEqual(['enc-1']))
    expect(await screen.findByRole('button', { name: /rodar combate/i })).toBeInTheDocument()
  })

  it('leitura que falhou avisa mas NÃO esconde o botão de rodar', async () => {
    api.encounter = { ok: false, row: null, message: 'timeout' }
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)

    expect(await screen.findByRole('button', { name: /rodar combate/i })).toBeInTheDocument()
    expect(screen.getByText(/não deu pra confirmar se há combate aberto/i)).toBeInTheDocument()
  })
})

describe('companhia', () => {
  it('junta o membro e a ficha dele na mesma linha', async () => {
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)

    const linhas = within(await screen.findByRole('region', { name: /companhia/i })).getAllByRole('listitem')
    const daAna = linhas.find(li => li.textContent.includes('cristimansigor2'))
    expect(daAna.textContent).toContain('Sahir Al Madih')
    expect(daAna.textContent).toContain('Nv 13')
  })

  it('membro sem ficha continua listado e diz que falta', async () => {
    api.characters = { ok: true, rows: [] }
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)

    const linhas = within(await screen.findByRole('region', { name: /companhia/i })).getAllByRole('listitem')
    const daAna = linhas.find(li => li.textContent.includes('cristimansigor2'))
    expect(daAna.textContent).toMatch(/ainda não criou ficha/i)
  })

  it('falha ao ler fichas avisa em vez de fingir mesa sem personagens', async () => {
    api.characters = { ok: false, rows: [], message: 'column does not exist' }
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar as fichas/i)
  })

  it('abrir a ficha navega para a rota do personagem', async () => {
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /sahir al madih/i }))

    expect(api.navigated).toContain('/c/SAHIR1')
  })
})

describe('jogador', () => {
  beforeEach(() => {
    api.user = { id: 'u2' }
    api.roster = {
      ok: true,
      rows: [{
        id: 'c1', ownerId: 'u2', shortId: 'SAHIR1',
        info: { name: 'Sahir Al Madih', race: 'elfo', class: 'ladino', level: 13 },
        combat: { currentHp: 60, maxHp: 74 },
      }],
    }
  })

  it('enxerga a companhia pelo roster', async () => {
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)
    expect(await within(await screen.findByRole('region', { name: /companhia/i }))
      .findByText(/sahir al madih/i)).toBeInTheDocument()
  })

  it('não vê apagar mesa, rodar combate nem renomear', async () => {
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)
    await screen.findByRole('region', { name: /companhia/i })

    expect(screen.queryByRole('button', { name: /apagar mesa/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /rodar combate/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /renomear mesa/i })).not.toBeInTheDocument()
  })

  it('não consegue abrir a ficha alheia', async () => {
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)
    await screen.findByRole('region', { name: /companhia/i })

    expect(screen.queryByRole('button', { name: /sahir al madih/i })).not.toBeInTheDocument()
  })
})

describe('renomear a mesa', () => {
  it('salva e reflete no título', async () => {
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /renomear mesa/i }))

    const input = screen.getByLabelText(/nome da mesa/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'A Queda de Neverwinter{Enter}')

    await waitFor(() => expect(api.renamed).toEqual([{ id: 'camp-1', name: 'A Queda de Neverwinter' }]))
    expect(await screen.findByRole('heading', { name: /a queda de neverwinter/i })).toBeInTheDocument()
  })

  it('Esc cancela sem salvar', async () => {
    render(<CampaignDetail campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /renomear mesa/i }))
    await userEvent.type(screen.getByLabelText(/nome da mesa/i), 'x{Escape}')

    expect(api.renamed).toEqual([])
    expect(screen.getByRole('heading', { name: /test mesa/i })).toBeInTheDocument()
  })
})
