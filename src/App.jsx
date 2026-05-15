import { useCallback, useState, lazy, Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { SrdProvider } from './providers/SrdProvider'
import { DiceRollerProvider } from './context/DiceRollerContext'
import { DiceHistoryPanel } from './components/DiceRoller/DiceHistoryPanel'
import { BestiaryButton } from './components/Bestiary/BestiaryButton'
import { CharacterList } from './components/CharacterList'
import './index.css'

// Code-splitting: wizard e ficha só carregam quando necessárias.
const CharacterSheet = lazy(() =>
  import('./components/CharacterSheet/CharacterSheet').then(m => ({ default: m.CharacterSheet }))
)
const CharacterWizard = lazy(() =>
  import('./components/CharacterWizard/CharacterWizard').then(m => ({ default: m.CharacterWizard }))
)
const CharacterWizardV2 = lazy(() =>
  import('./components/CharacterWizardV2').then(m => ({ default: m.CharacterWizardV2 }))
)

const VIEW = { LIST: 'list', NEW: 'new', SHEET: 'sheet' }

function shouldUseWizardV2() {
  if (typeof window === 'undefined') return false
  try {
    const url = new URLSearchParams(window.location.search)
    if (url.get('v2') === '1') return true
  } catch { /* ignore */ }
  try {
    return localStorage.getItem('wizardV2') === 'true'
  } catch { return false }
}

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-amber-400 text-sm">
      Carregando…
    </div>
  )
}

function App() {
  const [view, setView] = useState({ kind: VIEW.LIST, id: null })

  const goToList  = useCallback(() => setView({ kind: VIEW.LIST,  id: null }), [])
  const goToNew   = useCallback(() => setView({ kind: VIEW.NEW,   id: null }), [])
  const goToSheet = useCallback(id =>  setView({ kind: VIEW.SHEET, id }),        [])

  return (
    <ErrorBoundary>
      <SrdProvider>
        <DiceRollerProvider>
          <div className="min-h-screen bg-gray-950 text-gray-100">
            <Suspense fallback={<Loader />}>
              {view.kind === VIEW.LIST && (
                <CharacterList onSelect={goToSheet} onCreate={goToNew} />
              )}
              {view.kind === VIEW.NEW && (
                shouldUseWizardV2()
                  ? <CharacterWizardV2 onBack={goToList} onComplete={goToSheet} />
                  : <CharacterWizard onBack={goToList} onComplete={goToSheet} />
              )}
              {view.kind === VIEW.SHEET && (
                <CharacterSheet characterId={view.id} onBack={goToList} />
              )}
            </Suspense>
            <DiceHistoryPanel />
            <BestiaryButton />
          </div>
        </DiceRollerProvider>
      </SrdProvider>
    </ErrorBoundary>
  )
}

export default App
