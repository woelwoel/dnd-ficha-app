import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { PrivacyPage } from './components/PrivacyPage'
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

// UUID padrão v4 — usado pra rejeitar querystrings com lixo (ex: SyntheticEvent
// stringificado virando "[object Object]") antes de propagar pro Supabase.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function ListRoute() {
  const navigate = useNavigate()
  return (
    <CharacterList
      onSelect={(id) => navigate(`/c/${id}`)}
      onCreate={(campaignId) => {
        // Só aceita string que parece UUID. Qualquer outra coisa (objeto,
        // Event, string lixo) cai como ficha pessoal.
        const safe = typeof campaignId === 'string' && UUID_RE.test(campaignId)
          ? campaignId
          : null
        navigate(safe ? `/new?campaignId=${encodeURIComponent(safe)}` : '/new')
      }}
    />
  )
}

function NewRoute() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const raw = params.get('campaignId')
  // Mesma validação no consumo: se a URL trouxe lixo, ignora e mostra
  // DestinationModal em vez de propagar lixo pro upsert.
  const campaignId = raw && UUID_RE.test(raw) ? raw : null
  const initialCampaignId = params.has('campaignId') && campaignId ? campaignId : undefined
  return (
    <Suspense fallback={<Loader />}>
      <CharacterWizard
        initialCampaignId={initialCampaignId}
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
  const location = useLocation()
  // /privacidade é acessível sem login (exigência LGPD art. 9°).
  if (location.pathname === '/privacidade') return <PrivacyPage />
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
