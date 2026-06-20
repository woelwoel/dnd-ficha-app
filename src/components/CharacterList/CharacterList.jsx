import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CharacterMap } from './CharacterMap'
import { CharacterSidebar } from './CharacterSidebar'
import { CharacterListView } from './CharacterListView'
import { EmptyState } from './EmptyState'
import { BackupMenu } from './BackupMenu'
import { Button } from '../ui/Button'
import { AccountMenu } from '../ui/AccountMenu'
import { useCampaignContext } from '../../hooks/useCampaignContext'
import { useAuth } from '../../auth/AuthProvider'
import { CampaignSelector } from './CampaignSelector'
import {
  loadCharacters,
  touchCharacterLastOpened,
  updateCharacterPosition,
  deleteCharacter,
} from '../../utils/storage'
import { loadCampaignRoster, listMyCampaigns } from '../../lib/campaigns'
import {
  CAMPAIGN_NAME_DEFAULT,
  CAMPAIGN_NAME_STORAGE_KEY,
  VIEW_MODE_STORAGE_KEY,
} from '../../utils/config'

const VIEW_MAP = 'map'
const VIEW_LIST = 'list'

function readView() {
  try {
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return v === VIEW_LIST ? VIEW_LIST : VIEW_MAP
  } catch { return VIEW_MAP }
}
function writeView(v) {
  try { localStorage.setItem(VIEW_MODE_STORAGE_KEY, v) } catch { /* localStorage indisponível */ }
}

function readCampaignName() {
  try {
    return localStorage.getItem(CAMPAIGN_NAME_STORAGE_KEY) || CAMPAIGN_NAME_DEFAULT
  } catch { return CAMPAIGN_NAME_DEFAULT }
}

export function CharacterList({ onSelect, onCreate }) {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(readView)
  const [campaignName] = useState(readCampaignName)
  const [isDmOfScope, setIsDmOfScope] = useState(false)
  const navigate = useNavigate()
  const [scope, setScope] = useCampaignContext()
  const { isAdmin, user } = useAuth()
  const currentUserId = user?.id ?? null

  // Carga inicial + recarga.
  const reload = useCallback(async () => {
    setLoading(true)
    const inCampaign = scope && typeof scope === 'object' && scope.campaignId
    if (inCampaign) {
      // Visão de mesa: todos os membros enxergam a companhia via RESUMO
      // (RPC campaign_roster) — sem o `data` completo das fichas alheias.
      // Descobre o papel na mesa pra liberar a abertura só pra dono/DM.
      const mine = await listMyCampaigns()
      setIsDmOfScope(mine.some(c => c.id === scope.campaignId && c.role === 'dm'))
      const res = await loadCampaignRoster(scope.campaignId)
      // Fallback pro caminho antigo enquanto a migration 0011 não foi aplicada.
      setCharacters(res.ok ? res.rows : await loadCharacters(scope))
    } else {
      setIsDmOfScope(false)
      setCharacters(await loadCharacters(scope))
    }
    setLoading(false)
  }, [scope])

  useEffect(() => { reload() }, [reload])

  // Quem pode abrir/mover/excluir cada ficha. O admin NÃO entra aqui de
  // propósito: no jogo normal é tratado como jogador comum (god-mode só na
  // tela Admin). Dono: tudo. DM: abre (leitura), mas não move/exclui ficha
  // alheia (RLS owner-only). Jogador comum: só a própria.
  const enriched = useMemo(() => {
    const inCampaign = scope && typeof scope === 'object' && scope.campaignId
    return characters.map(c => {
      // Escopo pessoal/mine: loadCharacters já devolve só as fichas do dono,
      // então tudo é editável/movível. A checagem de dono só vale na mesa,
      // onde o RESUMO traz fichas de outros membros.
      if (!inCampaign) {
        return { ...c, canOpen: true, canMove: true, canDelete: true }
      }
      const isOwn = !!(c.ownerId && currentUserId && c.ownerId === currentUserId)
      return {
        ...c,
        canOpen: isOwn || isDmOfScope || (!c.ownerId),
        canMove: isOwn,
        canDelete: isOwn,
      }
    })
  }, [characters, currentUserId, isDmOfScope, scope])

  const handleSelect = useCallback(async (id) => {
    const ch = enriched.find(c => c.id === id)
    // Não abre ficha alheia (token de outro jogador no mapa/Companhia).
    if (ch && ch.canOpen === false) return
    await touchCharacterLastOpened(id)
    if (onSelect) {
      // Navega usando short_id quando disponível (URLs mais curtas);
      // fallback pro UUID em fichas ainda sem short_id (pre-migration 0003).
      onSelect(ch?.shortId ?? id)
    }
  }, [onSelect, enriched])

  const switchView = useCallback((v) => {
    setView(v)
    writeView(v)
  }, [])

  const handlePositionChange = useCallback(async (id, position) => {
    // Otimista: atualiza local imediatamente, depois envia.
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, position } : c))
    await updateCharacterPosition(id, position)
  }, [])

  const handleDelete = useCallback(async (id) => {
    await deleteCharacter(id)
    await reload()
  }, [reload])

  // Único ponto de entrada para "Recrutar" — extrai campaignId do scope.
  // Recebe args só pra ignorar (botões que passam SyntheticEvent por engano
  // não corrompem o destino).
  const handleCreate = useCallback(() => {
    const campaignId = scope === 'personal' ? null : scope.campaignId
    if (onCreate) onCreate(campaignId ?? null)
  }, [scope, onCreate])

  const isEmpty = !loading && characters.length === 0

  return (
    <div className="min-h-screen flex flex-col bg-parchment-100 text-ink-500">
      <header className="flex items-center justify-between px-4 py-3 border-b-2 border-parchment-600 bg-parchment-200 text-ink-500 shadow-parchment-sm">
        <h1 className="text-base font-bold font-display tracking-[0.12em] uppercase text-ink-500">
          {campaignName.replace(/⚜\s*/g, '')}
        </h1>

        <CampaignSelector scope={scope} onChange={setScope} />

        <div className="flex items-center gap-2" role="group" aria-label="Modo de visualização">
          <Button
            variant={view === VIEW_MAP ? 'gold' : 'ghost'}
            size="sm"
            onClick={() => switchView(VIEW_MAP)}
            aria-pressed={view === VIEW_MAP}
          >
            ▦ Mapa
          </Button>
          <Button
            variant={view === VIEW_LIST ? 'gold' : 'ghost'}
            size="sm"
            onClick={() => switchView(VIEW_LIST)}
            aria-pressed={view === VIEW_LIST}
          >
            ≡ Lista
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
            ⚜ Mesas
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              Admin
            </Button>
          )}
          <BackupMenu
            characterCount={characters.length}
            onImported={reload}
          />
          <Button
            variant="gold"
            size="md"
            onClick={() => handleCreate()}
          >
            ⚔ Recrutar
          </Button>
          <AccountMenu />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden w-full max-w-[1800px] mx-auto">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-ink-300 ink-italic text-sm">
            Carregando heróis…
          </div>
        ) : view === VIEW_MAP ? (
          <>
            <div className="flex-1 relative p-3 min-w-0">
              <CharacterMap
                characters={enriched}
                campaignName={campaignName}
                onSelect={handleSelect}
                onPositionChange={handlePositionChange}
              />
              {isEmpty && <EmptyState onCreate={handleCreate} />}
            </div>
            <div className="hidden md:block w-[260px] flex-shrink-0 p-3 pl-0">
              <CharacterSidebar
                characters={enriched}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 max-w-3xl mx-auto w-full">
            <CharacterListView
              characters={enriched}
              onSelect={handleSelect}
            />
          </div>
        )}
      </main>
    </div>
  )
}
