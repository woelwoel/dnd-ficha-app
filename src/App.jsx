import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import { SrdProvider } from './providers/SrdProvider'
import { DiceRollerProvider } from './context/DiceRollerContext'
import { DiceHistoryPanel } from './components/DiceRoller/DiceHistoryPanel'
import { BestiaryButton } from './components/Bestiary/BestiaryButton'
import { CharacterList } from './components/CharacterList'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { AppFooter } from './components/ui/AppFooter'
import { OfflineBanner } from './components/ui/OfflineBanner'
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
const CampaignsScreen = lazy(() =>
  import('./components/Campaigns').then(m => ({ default: m.CampaignsScreen }))
)
const CampaignDetail = lazy(() =>
  import('./components/Campaigns').then(m => ({ default: m.CampaignDetail }))
)

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-amber-400 text-sm">
      Carregando…
    </div>
  )
}

/* ── Wrappers de rota: traduzem URL → callbacks já existentes nos componentes ── */

function ListRoute() {
  const navigate = useNavigate()
  return (
    <CharacterList
      onSelect={(id) => navigate(`/c/${id}`)}
      onCreate={() => navigate('/new')}
    />
  )
}

function NewRoute() {
  const navigate = useNavigate()
  return (
    <Suspense fallback={<Loader />}>
      <CharacterWizard
        onBack={() => navigate('/')}
        onComplete={(id) => navigate(`/c/${id}`, { replace: true })}
      />
    </Suspense>
  )
}

function SheetRoute() {
  const navigate = useNavigate()
  const { id } = useParams()
  return (
    <Suspense fallback={<Loader />}>
      <CharacterSheet
        characterId={id}
        onBack={() => navigate('/')}
      />
    </Suspense>
  )
}

function CampaignDetailRoute() {
  const navigate = useNavigate()
  const { id } = useParams()
  return (
    <Suspense fallback={<Loader />}>
      <CampaignDetail campaignId={id} onBack={() => navigate('/campaigns')} />
    </Suspense>
  )
}

function AuthedRoutes() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      <OfflineBanner />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<ListRoute />} />
          <Route path="/new" element={<NewRoute />} />
          <Route path="/c/:id" element={<SheetRoute />} />
          <Route path="/campaigns" element={<Suspense fallback={<Loader />}><CampaignsScreen /></Suspense>} />
          <Route path="/campaigns/:id" element={<CampaignDetailRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <AppFooter />
      <DiceHistoryPanel />
      <BestiaryButton />
      <PWAUpdatePrompt />
    </div>
  )
}

function Gate() {
  const { user, loading, recoveryMode } = useAuth()
  if (loading) return <Loader />
  if (recoveryMode) return <ResetPasswordScreen />
  if (!user) return <LoginScreen />
  return <AuthedRoutes />
}

function App() {
  return (
    <ErrorBoundary>
      <SrdProvider>
        <DiceRollerProvider>
          <BrowserRouter>
            <AuthProvider>
              <Gate />
            </AuthProvider>
          </BrowserRouter>
        </DiceRollerProvider>
      </SrdProvider>
    </ErrorBoundary>
  )
}

export default App
