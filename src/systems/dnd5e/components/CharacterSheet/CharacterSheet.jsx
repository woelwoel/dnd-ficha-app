import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../../../hooks/useCharacter'
import { useCharacterCalculations } from '../../../../hooks/useCharacterCalculations'
import { useTabValidation } from '../../../../hooks/useTabValidation'
import { useAutoSave } from '../../../../hooks/useAutoSave'
import { useCharacterRealtime } from '../../../../hooks/useCharacterRealtime'
import { useSrd, useClassDataMap } from '../../data/SrdProvider'
import { loadCharacterByRouteParam, loadCharacterById } from '../../../../utils/storage'
import { useAuth } from '../../../../auth'
import { listMyCampaigns } from '../../../../lib/campaigns'
import { SheetHeader } from './SheetHeader'
import { SheetTabs, TABS, NavBlockedBanner, ImportErrorBanner } from './SheetTabs'
import { SheetContent } from './SheetContent'
import { CharacterProvider } from './CharacterContext'
import { useSheetHandlers } from './useSheetHandlers'
import { isSheetReadOnly } from './sheet-access'
import { PrintView } from '../PrintView/PrintView'
import { PrintPreviewModal } from '../PrintView/PrintPreviewModal'
import { defaultClassFeatureUses, mergeFeatureUses } from '../../domain/rules'

/**
 * Wrapper: carrega a ficha de forma assíncrona e só monta o orquestrador
 * SheetBody depois que `initialCharacter` está pronto.
 *
 * Por que dois componentes? `useCharacter` inicializa state lazy (`useState(() => ...)`),
 * o que significa que o `initialCharacter` é capturado apenas na primeira render.
 * Se montássemos o body com `initialCharacter = null` e depois trocássemos via
 * `setState`, o useCharacter ignoraria a mudança — a ficha apareceria zerada.
 */
export function CharacterSheet({ characterId, adminContext = false, onBack }) {
  const { user } = useAuth()
  const currentUserId = user?.id ?? null
  const [initialCharacter, setInitialCharacter] = useState(null)
  const [loadingCharacter, setLoadingCharacter] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    let alive = true
    setLoadError(null)
    setAccessDenied(false)
    if (!characterId || characterId === 'new') {
      setInitialCharacter(null)
      setLoadingCharacter(false)
      return
    }
    setLoadingCharacter(true)
    ;(async () => {
      const ch = await loadCharacterByRouteParam(characterId)
      if (!alive) return
      if (!ch) {
        setLoadError('Ficha não encontrada (ou sem permissão de leitura).')
        setInitialCharacter(null)
        setLoadingCharacter(false)
        return
      }
      // Gate de acesso: a RLS de admin devolve QUALQUER ficha, então a
      // restrição "só dono/DM abre" tem de ser reforçada aqui no cliente
      // (admin só passa em adminContext, vindo do /admin). Ver sheet-access.js.
      const isOwner = !!(ch.ownerId && currentUserId && ch.ownerId === currentUserId)
      let canOpen = adminContext || isOwner || !ch.ownerId
      if (!canOpen && ch.campaignId) {
        const mine = await listMyCampaigns()
        if (!alive) return
        canOpen = mine.some(c => c.id === ch.campaignId && c.role === 'dm')
      }
      if (!canOpen) {
        setAccessDenied(true)
        setInitialCharacter(null)
        setLoadingCharacter(false)
        return
      }
      setInitialCharacter(ch)
      setLoadingCharacter(false)
    })().catch(err => {
      if (!alive) return
      setLoadError(`Erro ao carregar ficha: ${err?.message ?? 'desconhecido'}`)
      setLoadingCharacter(false)
    })
    return () => { alive = false }
  }, [characterId, adminContext, currentUserId])

  if (loadingCharacter) {
    return (
      <div className="min-h-screen flex items-center justify-center text-amber-400 text-sm">
        Carregando ficha…
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-amber-400 text-sm">
        <p>Você não tem acesso a esta ficha — ela pertence a outro jogador.</p>
        <button onClick={onBack} className="px-4 py-2 border border-amber-400 rounded">
          Voltar
        </button>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-amber-400 text-sm">
        <p>{loadError}</p>
        <button onClick={onBack} className="px-4 py-2 border border-amber-400 rounded">
          Voltar
        </button>
      </div>
    )
  }

  // Re-monta o body sempre que characterId mudar — garante que useCharacter
  // pegue o initialCharacter correto na sua primeira render.
  return <SheetBody key={characterId ?? 'new'} initialCharacter={initialCharacter} adminContext={adminContext} onBack={onBack} />
}

/**
 * Orquestrador real da ficha. Só monta depois que `initialCharacter` está
 * carregado (ou explicitamente null pra 'new').
 *
 * Layout: header fixo + sidebar de navegação (desktop) + área de conteúdo scrollável.
 */
function SheetBody({ initialCharacter, adminContext = false, onBack }) {
  const { races, classes, backgrounds } = useSrd()
  const classDataMap = useClassDataMap()

  const [activeTab, setActiveTab] = useState('ficha')
  const [navBlocked, setNavBlocked] = useState(false)
  const [importError, setImportError] = useState(null)
  // Magia que deve ter o modal de detalhe auto-aberto ao navegar pra aba Magias.
  // Setada por PreparedSpellsList ao clicar num chip; consumida e zerada pelo
  // próprio Spells (que dispara setDetailSpell e depois chama clearFocusSpell).
  const [focusSpellId, setFocusSpellId] = useState(null)

  const { character, setCharacter, ...updaters } = useCharacter(initialCharacter)

  // Detecta usuário corrente pra modo readonly (DM lendo ficha de jogador).
  // O poder de admin só vale em adminContext (aberto pelo /admin) — fora dele
  // o admin é jogador comum. Ver sheet-access.js.
  const { user } = useAuth()
  const currentUserId = user?.id ?? null
  const readOnly = isSheetReadOnly({ ownerId: character?.ownerId, currentUserId, adminContext })

  // #3 super review: conflito de versão = outro dispositivo da mesma conta
  // salvou esta ficha no meio da edição. Refetcha (a versão do servidor vence)
  // e avisa — a alternativa era sobrescrever silenciosamente o outro lado.
  const [conflictNotice, setConflictNotice] = useState(false)
  const { saving, saved, error: saveError } = useAutoSave(character, {
    enabled: !readOnly,
    onConflict: async () => {
      const fresh = await loadCharacterById(character.id)
      if (fresh) setCharacter(fresh)
      setConflictNotice(true)
    },
  })

  // Realtime: quando DM está em modo leitura, refetch ao vivo conforme
  // o player edita a ficha. Não ativa pro próprio dono pra não conflitar
  // com o auto-save local.
  useCharacterRealtime(character?.id, readOnly, setCharacter)

  const classData = useMemo(
    () => classes.find(c => c.index === character.info.class) ?? null,
    [classes, character.info.class],
  )

  const calc = useCharacterCalculations(character, classData, classDataMap)

  const validationDeps = useMemo(() => ({ races }), [races])
  const { getTabErrors, markTouched, hasErrors, focusFirstError } = useTabValidation(character, validationDeps)

  const handlers = useSheetHandlers({ setCharacter, races, classes, backgrounds })

  // Título do navegador
  useEffect(() => {
    const name = character.info.name?.trim()
    document.title = name ? `${name} — D&D 5e` : 'Grimório de Personagens — D&D 5e'
    return () => { document.title = 'Grimório de Personagens — D&D 5e' }
  }, [character.info.name])

  function handleTabChange(newTabId) {
    const currentIdx = TABS.findIndex(t => t.id === activeTab)
    const newIdx = TABS.findIndex(t => t.id === newTabId)
    const isForward = newIdx > currentIdx

    if (isForward && hasErrors(activeTab)) {
      markTouched(activeTab)
      setNavBlocked(true)
      return
    }
    setNavBlocked(false)
    setActiveTab(newTabId)
  }

  function handleExport() {
    const json = JSON.stringify(character, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${character.info.name || 'personagem'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(parsed) {
    setCharacter(parsed)
    setImportError(null)
  }

  const fichaErrors = getTabErrors('ficha')

  // Quick stats para o header
  const quickStats = {
    currentHp:  character.combat.currentHp,
    maxHp:      character.combat.maxHp,
    armorClass: character.combat.armorClass,
    initiative: calc.initiative,
    hpPercent:  calc.hpPercent,
    hpColor:    calc.hpColor,
  }

  // featureUses é derivado de character — memo para evitar recalcular nos filhos.
  const featureUses = useMemo(
    () => mergeFeatureUses(character.combat?.classFeatureUses ?? [], defaultClassFeatureUses(character)),
    [character],
  )

  const contextValue = useMemo(() => ({
    character,
    setCharacter,
    calc,
    classData,
    races,
    classes,
    backgrounds,
    updaters,
    handlers,
    fichaErrors,
    featureUses,
    readOnly,
    // Quando chamado sem arg, só troca de aba. Com arg (spellId), também
    // pede pra aba Magias auto-abrir o modal de detalhe daquela magia.
    onNavigateToSpells: (spellId) => {
      if (spellId != null) setFocusSpellId(spellId)
      setActiveTab('magias')
    },
    focusSpellId,
    clearFocusSpell: () => setFocusSpellId(null),
  }), [character, setCharacter, calc, classData, races, classes, backgrounds, updaters, handlers, fichaErrors, featureUses, focusSpellId, readOnly])

  // Preview/opções de impressão. Antes o clique em "Imprimir" disparava
  // window.print() na hora — gastando tinta/papel sem chance de revisar.
  // Agora abrimos um modal de confirmação com toggles do que incluir.
  const [printOpen, setPrintOpen] = useState(false)
  const [printOptions, setPrintOptions] = useState({
    includePersonality: true,
    includeSpells: true,
  })
  const isSpellcaster = (character.spellcasting?.spells?.length ?? 0) > 0
    || (character.spellcasting?.slots ?? []).some(s => s?.total > 0)
    || !!character.spellcasting?.ability

  return (
    <CharacterProvider value={contextValue}>
      <div className="min-h-screen flex flex-col">

        {/* ── Header único (navegação + barra de combate integrada) ── */}
        <div className="sticky top-0 z-30">
          <SheetHeader
            characterName={character.info.name}
            characterId={character?.id ?? null}
            saving={saving}
            saved={saved}
            saveError={saveError}
            onBack={onBack}
            onExport={handleExport}
            onImport={handleImport}
            onImportError={setImportError}
            onPrint={() => setPrintOpen(true)}
            showPrint={true}
            quickStats={quickStats}
            readOnly={readOnly}
            campaignId={character?.campaignId ?? null}
            onMoved={(newCampaignId) => {
              setCharacter(prev => ({ ...prev, campaignId: newCampaignId }))
            }}
          />
        </div>

        {/* ── Corpo: sidebar + conteúdo ────────────────────────── */}
        <div className="flex flex-1">

          {/* Sidebar de navegação (embutida em SheetTabs) */}
          <SheetTabs activeTab={activeTab} onChange={handleTabChange} />

          {/* Área de conteúdo (sem scroll próprio — flui no documento pra permitir print) */}
          <main className="flex-1 min-w-0">
            <div className="max-w-7xl mx-auto px-2 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6 space-y-4">

              {importError && (
                <ImportErrorBanner
                  message={importError}
                  onDismiss={() => setImportError(null)}
                />
              )}

              {conflictNotice && (
                <ImportErrorBanner
                  message="Esta ficha foi alterada em outro dispositivo. Recarregamos a versão mais recente — confira sua última edição."
                  onDismiss={() => setConflictNotice(false)}
                />
              )}

              {navBlocked && (
                <NavBlockedBanner
                  onReview={() => focusFirstError(activeTab)}
                  onDismiss={() => setNavBlocked(false)}
                />
              )}

              <SheetContent activeTab={activeTab} />
            </div>
          </main>
        </div>

        {/* Ficha para impressão/PDF — invisível na UI, visível apenas em @media print */}
        <PrintView
          character={character}
          calc={calc}
          classData={classData}
          backgrounds={backgrounds}
          options={printOptions}
        />

        {/* Confirmação antes de window.print() */}
        <PrintPreviewModal
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          onConfirm={() => {
            setPrintOpen(false)
            // setTimeout pra dar tempo da React reagir ao close + DOM
            // settle antes do print. Sem isso, o modal pode "aparecer"
            // no PDF/print em alguns browsers.
            setTimeout(() => window.print(), 50)
          }}
          characterName={character.info.name}
          isSpellcaster={isSpellcaster}
          options={printOptions}
          onChangeOptions={patch => setPrintOptions(prev => ({ ...prev, ...patch }))}
        />
      </div>
    </CharacterProvider>
  )
}
