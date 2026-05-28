import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CharacterMap } from './CharacterMap'
import { CharacterSidebar } from './CharacterSidebar'
import { CharacterListView } from './CharacterListView'
import { EmptyState } from './EmptyState'
import { BackupMenu } from './BackupMenu'
import { Button } from '../ui/Button'
import { useAuth } from '../../auth/AuthProvider'
import {
  loadCharacters,
  touchCharacterLastOpened,
  updateCharacterPosition,
  deleteCharacter,
} from '../../utils/storage'
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
  const { signOut } = useAuth()
  const navigate = useNavigate()

  // Carga inicial + recarga.
  const reload = useCallback(async () => {
    setLoading(true)
    const list = await loadCharacters()
    setCharacters(list)
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleSelect = useCallback(async (id) => {
    await touchCharacterLastOpened(id)
    if (onSelect) {
      // Navega usando short_id quando disponível (URLs mais curtas);
      // fallback pro UUID em fichas ainda sem short_id (pre-migration 0003).
      const ch = characters.find(c => c.id === id)
      onSelect(ch?.shortId ?? id)
    }
  }, [onSelect, characters])

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

  const isEmpty = !loading && characters.length === 0

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg-canvas)', color: 'var(--color-ink-primary)' }}
    >
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: 'linear-gradient(180deg, var(--color-shell-800), var(--color-shell-900))',
          borderColor: 'var(--color-shell-border)',
          color: 'var(--color-ink-inverse)',
        }}
      >
        <h1
          className="text-base font-bold"
          style={{
            fontFamily: 'IM Fell English SC, serif',
            color: 'var(--color-gold-400)',
            letterSpacing: '0.12em',
          }}
        >
          {campaignName.replace(/⚜\s*/g, '')}
        </h1>

        <div className="flex items-center gap-2" role="group" aria-label="Modo de visualização">
          <Button
            variant={view === VIEW_MAP ? 'gold' : 'ghost-dark'}
            size="sm"
            onClick={() => switchView(VIEW_MAP)}
            aria-pressed={view === VIEW_MAP}
          >
            ▦ Mapa
          </Button>
          <Button
            variant={view === VIEW_LIST ? 'gold' : 'ghost-dark'}
            size="sm"
            onClick={() => switchView(VIEW_LIST)}
            aria-pressed={view === VIEW_LIST}
          >
            ≡ Lista
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost-dark" size="sm" onClick={() => navigate('/campaigns')}>
            ⚔ Mesas
          </Button>
          <Button variant="ghost-dark" size="sm" onClick={() => signOut()}>
            Sair
          </Button>
          <BackupMenu
            characterCount={characters.length}
            onImported={reload}
          />
          <Button variant="gold" size="md" onClick={onCreate}>
            ⚔ Recrutar
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden w-full max-w-[1800px] mx-auto">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-amber-400 text-sm">
            Carregando heróis…
          </div>
        ) : view === VIEW_MAP ? (
          <>
            <div className="flex-1 relative p-3 min-w-0">
              <CharacterMap
                characters={characters}
                campaignName={campaignName}
                onSelect={handleSelect}
                onPositionChange={handlePositionChange}
              />
              {isEmpty && <EmptyState onCreate={onCreate} />}
            </div>
            <div className="hidden md:block w-[260px] flex-shrink-0 p-3 pl-0">
              <CharacterSidebar
                characters={characters}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 max-w-3xl mx-auto w-full">
            <CharacterListView
              characters={characters}
              onSelect={handleSelect}
            />
          </div>
        )}
      </main>
    </div>
  )
}
