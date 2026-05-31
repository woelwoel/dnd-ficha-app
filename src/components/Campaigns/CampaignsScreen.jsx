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
    <div className="min-h-screen p-4 bg-parchment-100 text-ink-500">
      <header className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-display tracking-widest uppercase text-ink-500">
          Mesas
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>← Personagens</Button>
          <AccountMenu />
        </div>
      </header>

      <div className="max-w-4xl mx-auto grid gap-4 md:grid-cols-2 mb-8">
        <CreateCampaignForm onCreated={(id) => navigate(`/campaigns/${id}`)} />
        <JoinCampaignForm  onJoined={(id) => navigate(`/campaigns/${id}`)} />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-display uppercase tracking-widest text-ink-500">Suas mesas</h2>
          {showSearch && (
            <input
              type="search"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-1 bg-parchment-50 border-2 border-parchment-600 rounded-sm text-ink-500 placeholder:text-ink-200 text-sm w-48 focus:outline-none focus:border-ink-300"
              aria-label="Buscar mesa pelo nome"
            />
          )}
        </div>
        {loading ? (
          <p className="text-ink-300 ink-italic text-sm">Carregando…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-ink-300 ink-italic text-sm">Você ainda não tem mesas. Crie uma ou entre com código.</p>
        ) : filtered.length === 0 ? (
          <p className="text-ink-300 ink-italic text-sm">Nenhuma mesa corresponde a "{query}".</p>
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
