import { Suspense, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { PrivacyPage } from './components/PrivacyPage'
import { ErrorBoundary } from './ErrorBoundary'
import { SrdProvider } from './systems/dnd5e/data/SrdProvider'
import { DiceRollerProvider } from './context/DiceRollerContext'
import { DiceHistoryPanel } from './components/DiceRoller/DiceHistoryPanel'
import { BestiaryButton } from './systems/dnd5e/components/Bestiary/BestiaryButton'
import { CharacterList } from './components/CharacterList'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { AppFooter } from './components/ui/AppFooter'
import { OfflineBanner } from './components/ui/OfflineBanner'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LoginScreen } from './auth/LoginScreen'
import { ResetPasswordScreen } from './auth/ResetPasswordScreen'
import { lazyWithReload } from './utils/lazyWithReload'
import { getLazyWizard, getLazySheet } from './systems/ui-registry'
import { listSystems, getSystemCore } from './systems'
import { DEFAULT_SYSTEM } from './systems/envelope'
import { getCharacterSystem } from './utils/storage'
import { getCampaignSystem } from './lib/campaigns'
import { SystemPicker } from './components/SystemPicker'
import './index.css'

// Telas da casca (não específicas de sistema) seguem como lazy resilientes a
// ChunkLoadError pós-deploy. As superfícies de sistema (Wizard/Sheet) vêm do
// ui-registry, que usa o mesmo lazyWithReload por baixo.
const CampaignsScreen = lazyWithReload(() =>
  import('./components/Campaigns').then(m => ({ default: m.CampaignsScreen }))
)
const CampaignDetail = lazyWithReload(() =>
  import('./components/Campaigns').then(m => ({ default: m.CampaignDetail }))
)
const AdminScreen = lazyWithReload(() =>
  import('./components/Admin/AdminScreen').then(m => ({ default: m.AdminScreen }))
)

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-amber-400 text-sm">
      Carregando…
    </div>
  )
}

// ErrorBoundary POR ROTA: um erro numa tela (ex: chunk órfão, crash de
// componente) não derruba mais o app inteiro — só aquela rota mostra o
// fallback, com botão de recarregar. (#18 da super review)
function RouteShell({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loader />}>{children}</Suspense>
    </ErrorBoundary>
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
  // Mesma validação no consumo: se a URL trouxe lixo, ignora.
  const campaignId = raw && UUID_RE.test(raw) ? raw : null
  const initialCampaignId = params.has('campaignId') && campaignId ? campaignId : undefined

  const systems = listSystems()
  const paramSystem = params.get('system')
  // null = ainda decidindo; '' = precisa mostrar o seletor; id = resolvido.
  const [resolved, setResolved] = useState(null)

  useEffect(() => {
    let alive = true
    async function decide() {
      // 1) dentro de mesa → sistema forçado pela mesa.
      if (campaignId) {
        const s = await getCampaignSystem(campaignId)
        if (alive) setResolved(getSystemCore(s) ? s : DEFAULT_SYSTEM)
        return
      }
      // 2) system explícito na URL e válido.
      if (paramSystem && getSystemCore(paramSystem)) { if (alive) setResolved(paramSystem); return }
      // 3) único sistema → pula o seletor.
      if (systems.length === 1) { if (alive) setResolved(systems[0].id); return }
      // 4) precisa escolher.
      if (alive) setResolved('')
    }
    decide()
    return () => { alive = false }
    // systems é estável entre renders (registry estático).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, paramSystem])

  if (resolved === null) return <Loader />
  if (resolved === '') {
    return (
      <SystemPicker
        onPick={(id) => navigate(`/new?system=${id}${campaignId ? `&campaignId=${campaignId}` : ''}`)}
        onBack={() => navigate('/')}
      />
    )
  }
  const Wizard = getLazyWizard(resolved)
  if (!Wizard) return <Navigate to="/" replace />
  return (
    <RouteShell>
      <Wizard
        initialCampaignId={initialCampaignId}
        onBack={() => navigate('/')}
        onComplete={(id) => navigate(`/c/${id}`, { replace: true })}
      />
    </RouteShell>
  )
}

function SheetRoute() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [params] = useSearchParams()
  // `?adm=1` só é setado quando a ficha é aberta a partir da tela Admin.
  // É o que destrava o god-mode (ler/editar qualquer ficha); fora dele o
  // admin é tratado como jogador comum. Ver sheet-access.js.
  const adminContext = params.get('adm') === '1'

  // Resolve o sistema da ficha (coluna gerada, com fallback no blob) pra montar
  // a Sheet do sistema certo. Loader enquanto resolve.
  const [system, setSystem] = useState(null)
  useEffect(() => {
    let alive = true
    getCharacterSystem(id).then(s => { if (alive) setSystem(s) })
    return () => { alive = false }
  }, [id])

  if (system === null) return <Loader />
  const Sheet = getLazySheet(system)
  if (!Sheet) return <Navigate to="/" replace />
  return (
    <RouteShell>
      <Sheet
        characterId={id}
        adminContext={adminContext}
        onBack={() => navigate('/')}
      />
    </RouteShell>
  )
}

function CampaignDetailRoute() {
  const navigate = useNavigate()
  const { id } = useParams()
  return (
    <RouteShell>
      <CampaignDetail campaignId={id} onBack={() => navigate('/campaigns')} />
    </RouteShell>
  )
}

function AdminRoute() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return (
    <RouteShell>
      <AdminScreen onBack={() => navigate('/')} />
    </RouteShell>
  )
}

function AuthedRoutes() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      <OfflineBanner />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<ErrorBoundary><ListRoute /></ErrorBoundary>} />
          <Route path="/new" element={<NewRoute />} />
          <Route path="/c/:id" element={<SheetRoute />} />
          <Route path="/campaigns" element={<RouteShell><CampaignsScreen /></RouteShell>} />
          <Route path="/campaigns/:id" element={<CampaignDetailRoute />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <AppFooter />
      <DiceHistoryPanel />
      {/* Bestiário é conteúdo de D&D → traz seu próprio SrdProvider (o cache do
          provider é de módulo, então não há refetch duplicado). */}
      <SrdProvider><BestiaryButton /></SrdProvider>
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
  // SrdProvider NÃO embrulha mais o app inteiro: dados de D&D só carregam dentro
  // das superfícies do sistema dnd5e (Wizard/Sheet via ui-registry) e do
  // BestiaryButton. A casca fica livre de dados de sistema.
  return (
    <ErrorBoundary>
      <DiceRollerProvider>
        <BrowserRouter>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </BrowserRouter>
      </DiceRollerProvider>
    </ErrorBoundary>
  )
}

export default App
