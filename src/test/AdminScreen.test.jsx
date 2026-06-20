import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const data = vi.hoisted(() => ({ chars: [], camps: [] }))
vi.mock('../lib/admin', () => ({
  adminListCharacters: async () => data.chars,
  adminListCampaigns: async () => data.camps,
}))
const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', () => ({ useNavigate: () => nav }))

import { AdminScreen } from '../components/Admin/AdminScreen'

describe('AdminScreen', () => {
  beforeEach(() => {
    data.chars = [{ id: 'a', shortId: 'S1', name: 'Allyson', className: 'ladino', level: 5, ownerName: 'Gabriel', campaignId: null, updatedAt: Date.now() }]
    data.camps = [{ id: 'c1', name: 'Mesa do Allyson', dmName: 'Gabriel', memberCount: 3, createdAt: Date.now() }]
    nav.mockClear()
  })

  it('mostra fichas com nome e dono', async () => {
    render(<AdminScreen onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('Allyson')).toBeInTheDocument())
    expect(screen.getByText(/Gabriel/)).toBeInTheDocument()
  })

  it('troca pra aba Mesas e mostra a mesa', async () => {
    render(<AdminScreen onBack={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /Mesas/i }))
    expect(screen.getByText('Mesa do Allyson')).toBeInTheDocument()
  })

  it('clicar em abrir ficha navega pra /c/:id com contexto admin (?adm=1)', async () => {
    render(<AdminScreen onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('Allyson')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /abrir ficha allyson/i }))
    // ?adm=1 destrava o god-mode só quando a ficha é aberta pela tela Admin.
    expect(nav).toHaveBeenCalledWith('/c/S1?adm=1')
  })
})
