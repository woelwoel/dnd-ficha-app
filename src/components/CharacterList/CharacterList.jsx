import { useCallback, useEffect, useState } from 'react'
import { CharacterMap } from './CharacterMap'
import { CharacterSidebar } from './CharacterSidebar'
import { CharacterListView } from './CharacterListView'
import { EmptyState } from './EmptyState'
import { Button } from '../ui/Button'
import {
  loadCharacters,
  touchCharacterLastOpened,
  updateCharacterPosition,
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
  const [characters, setCharacters] = useState(loadCharacters)
  const [view, setView] = useState(readView)
  const [campaignName] = useState(readCampaignName)

  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'dnd-app-characters') setCharacters(loadCharacters())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleSelect = useCallback((id) => {
    touchCharacterLastOpened(id)
    setCharacters(loadCharacters())
    if (onSelect) onSelect(id)
  }, [onSelect])

  const switchView = useCallback((v) => {
    setView(v)
    writeView(v)
  }, [])

  const handlePositionChange = useCallback((id, position) => {
    updateCharacterPosition(id, position)
    setCharacters(loadCharacters())
  }, [])

  const isEmpty = characters.length === 0

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

        <Button variant="gold" size="md" onClick={onCreate}>
          ⚔ Recrutar
        </Button>
      </header>

      <main className="flex-1 flex overflow-hidden w-full max-w-[1800px] mx-auto">
        {view === VIEW_MAP ? (
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
