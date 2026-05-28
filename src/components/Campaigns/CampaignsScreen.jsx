import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMyCampaigns } from '../../lib/campaigns'
import { CampaignCard } from './CampaignCard'
import { CreateCampaignForm } from './CreateCampaignForm'
import { JoinCampaignForm } from './JoinCampaignForm'
import { Button } from '../ui/Button'
import { AccountMenu } from '../ui/AccountMenu'

/**
 * Tela /campaigns: lista de mesas onde sou membro + forms inline pra criar
 * mesa nova ou entrar com código. Cards levam pra /campaigns/:id (CampaignDetail).
 */
export function CampaignsScreen() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const reload = useCallback(async () => {
    setLoading(true)
    setCampaigns(await listMyCampaigns())
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? campaigns.filter(c => (c.name ?? '').toLowerCase().includes(q))
    : campaigns
  // #24 super review: busca só aparece quando vale a pena (5+ mesas).
  const showSearch = campaigns.length >= 5

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--color-bg-canvas)' }}>
      <header className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <h1 className="text-2xl text-amber-400" style={{ fontFamily: 'IM Fell English SC, serif' }}>
          Mesas
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost-dark" size="sm" onClick={() => navigate('/')}>← Personagens</Button>
          <AccountMenu />
        </div>
      </header>

      <div className="max-w-4xl mx-auto grid gap-4 md:grid-cols-2 mb-8">
        <CreateCampaignForm onCreated={(id) => navigate(`/campaigns/${id}`)} />
        <JoinCampaignForm  onJoined={(id) => navigate(`/campaigns/${id}`)} />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm uppercase tracking-wider text-gray-400">Suas mesas</h2>
          {showSearch && (
            <input
              type="search"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-1 bg-gray-900 border rounded text-gray-100 text-sm w-48"
              style={{ borderColor: 'var(--color-shell-border)' }}
              aria-label="Buscar mesa pelo nome"
            />
          )}
        </div>
        {loading ? (
          <p className="text-amber-400 text-sm">Carregando…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-gray-500 text-sm">Você ainda não tem mesas. Crie uma ou entre com código.</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma mesa corresponde a "{query}".</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map(c => (
              <CampaignCard key={c.id} campaign={c} onOpen={(id) => navigate(`/campaigns/${id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
