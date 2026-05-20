import { useCallback, useState, lazy, Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { SrdProvider } from './providers/SrdProvider'
import { DiceRollerProvider } from './context/DiceRollerContext'
import { DiceHistoryPanel } from './components/DiceRoller/DiceHistoryPanel'
import { BestiaryButton } from './components/Bestiary/BestiaryButton'
import { CharacterList } from './components/CharacterList'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LoginScreen } from './auth/LoginScreen'
import { ResetPasswordScreen } from './auth/ResetPasswordScreen'
import './index.css'

const CharacterSheet = lazy(() =>
  import('./components/CharacterSheet/CharacterSheet').then(m => ({ default: m.CharacterSheet }))
)
const CharacterWizard = lazy(() =>
  import('./components/CharacterWizardV2').then(m => ({ default: m.CharacterWizardV2 }))
)

const VIEW = { LIST: 'list', NEW: 'new', SHEET: 'sheet' }

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-amber-400 text-sm">
      Carregando…
    </div>
  )
}

function AuthedApp() {
  const [view, setView] = useState({ kind: VIEW.LIST, id: null })
  const goToList  = useCallback(() => setView({ kind: VIEW.LIST,  id: null }), [])
  const goToNew   = useCallback(() => setView({ kind: VIEW.NEW,   id: null }), [])
  const goToSheet = useCallback(id =>  setView({ kind: VIEW.SHEET, id }),        [])

  return (
    <SrdProvider>
      <DiceRollerProvider>
        <div className="min-h-screen bg-gray-950 text-gray-100">
          <Suspense fallback={<Loader />}>
            {view.kind === VIEW.LIST && (
              <CharacterList onSelect={goToSheet} onCreate={goToNew} />
            )}
            {view.kind === VIEW.NEW && (
              <CharacterWizard onBack={goToList} onComplete={goToSheet} />
            )}
            {view.kind === VIEW.SHEET && (
              <CharacterSheet characterId={view.id} onBack={goToList} />
            )}
          </Suspense>
          <DiceHistoryPanel />
          <BestiaryButton />
          <PWAUpdatePrompt />
        </div>
      </DiceRollerProvider>
    </SrdProvider>
  )
}

function Gate() {
  const { user, loading, recoveryMode } = useAuth()
  if (loading) return <Loader />
  if (recoveryMode) return <ResetPasswordScreen />
  if (!user) return <LoginScreen />
  return <AuthedApp />
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
