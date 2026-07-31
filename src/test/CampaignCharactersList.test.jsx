import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ fetchCampaignCharacters: vi.fn() }))

vi.mock('../lib/campaigns', () => ({
  fetchCampaignCharacters: mocks.fetchCampaignCharacters,
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: () => ({ on() { return this }, subscribe() { return this } }),
    removeChannel: vi.fn(),
  },
}))

const { CampaignCharactersList } = await import('../components/Campaigns/CampaignCharactersList')

const FICHA = {
  id: 'c1', short_id: 'ABCDEFGHJK',
  data: { info: { name: 'Thalior', race: 'Elfo', class: 'Mago', level: 3 } },
}

describe('CampaignCharactersList', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('lista as fichas vinculadas à mesa', async () => {
    mocks.fetchCampaignCharacters.mockResolvedValue({ ok: true, rows: [FICHA] })
    render(<CampaignCharactersList campaignId="camp-1" onOpen={() => {}} />)
    expect(await screen.findByText('Thalior')).toBeInTheDocument()
    expect(screen.getByText(/fichas dos jogadores \(1\)/i)).toBeInTheDocument()
  })

  it('diz que a mesa está vazia só quando a leitura deu certo', async () => {
    mocks.fetchCampaignCharacters.mockResolvedValue({ ok: true, rows: [] })
    render(<CampaignCharactersList campaignId="camp-1" onOpen={() => {}} />)
    expect(await screen.findByText(/nenhum jogador criou ficha/i)).toBeInTheDocument()
  })

  it('NÃO afirma mesa vazia quando a leitura falhou — mostra erro e botão de tentar de novo', async () => {
    mocks.fetchCampaignCharacters.mockResolvedValue({
      ok: false, rows: [], code: '42703', message: 'column characters.version does not exist',
    })
    render(<CampaignCharactersList campaignId="camp-1" onOpen={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i)
    expect(screen.queryByText(/nenhum jogador criou ficha/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
    // nem o cabeçalho pode cravar "(0)" — não sabemos quantas são
    expect(screen.queryByText(/fichas dos jogadores \(0\)/i)).not.toBeInTheDocument()
  })

  it('recarrega ao clicar em tentar de novo', async () => {
    const user = userEvent.setup({ delay: null })
    mocks.fetchCampaignCharacters
      .mockResolvedValueOnce({ ok: false, rows: [], code: 'PGRST301', message: 'JWT expired' })
      .mockResolvedValueOnce({ ok: true, rows: [FICHA] })
    render(<CampaignCharactersList campaignId="camp-1" onOpen={() => {}} />)
    await user.click(await screen.findByRole('button', { name: /tentar de novo/i }))
    expect(await screen.findByText('Thalior')).toBeInTheDocument()
  })

  it('abre a ficha pelo short_id ao clicar', async () => {
    const onOpen = vi.fn()
    mocks.fetchCampaignCharacters.mockResolvedValue({ ok: true, rows: [FICHA] })
    const user = userEvent.setup({ delay: null })
    render(<CampaignCharactersList campaignId="camp-1" onOpen={onOpen} />)
    await user.click(await screen.findByText('Thalior'))
    expect(onOpen).toHaveBeenCalledWith('ABCDEFGHJK')
  })
})
