import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMyCampaigns } from '../../lib/campaigns'
import { CampaignCard } from './CampaignCard'
import { CreateCampaignForm } from './CreateCampaignForm'
import { JoinCampaignForm } from './JoinCampaignForm'
import { Button } from '../ui/Button'
import { AccountMenu } from '../ui/AccountMenu'
import { Icon } from '../ui/Icon'

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
          <div className="text-center py-10 px-4 border-2 border-dashed border-parchment-600 rounded-sm bg-parchment-50/50">
            <div className="flex justify-center mb-3 text-ink-500" aria-hidden>
              <Icon name="scroll" size={36} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-display tracking-wide text-ink-500 mb-1">
              Nenhuma mesa ainda
            </p>
            <p className="text-xs ink-italic text-ink-300 max-w-sm mx-auto">
              Crie uma mesa nova pra ser o Mestre, ou peça o código de uma mesa existente pra entrar como Jogador.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm ink-italic text-ink-300">
              Nenhuma mesa corresponde a <strong className="not-italic text-ink-500">"{query}"</strong>.
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-2 text-xs ink-italic text-ink-300 hover:text-ink-500 underline"
            >
              limpar busca
            </button>
          </div>
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
