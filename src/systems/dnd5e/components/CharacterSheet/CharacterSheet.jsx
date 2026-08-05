import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../hooks/useCharacter'
import { useCharacterCalculations } from '../../hooks/useCharacterCalculations'
import { useTabValidation } from '../../hooks/useTabValidation'
import { useAutoSave } from '../../../../hooks/useAutoSave'
import { useCharacterRealtime } from '../../../../hooks/useCharacterRealtime'
import { useSrd, useClassDataMap } from '../../data/SrdProvider'
import { loadCharacterByRouteParam, loadCharacterById } from '../../../../utils/storage'
import { useAuth } from '../../../../auth'
import { listMyCampaigns } from '../../../../lib/campaigns'
import { ImportErrorBanner } from './ImportErrorBanner'
import { CharacterProvider } from './CharacterContext'
import { useSheetHandlers } from './useSheetHandlers'
import { isSheetReadOnly } from './sheet-access'
import { PrintView } from '../PrintView/PrintView'
import { PrintPreviewModal } from '../PrintView/PrintPreviewModal'
import { defaultClassFeatureUses, mergeFeatureUses } from '../../domain/rules'
import { specialCastingUses } from '../../domain/castPolicy'
import { injectRacialSpells } from '../../domain/racialSpells'
import { SheetV2 } from './v2/SheetV2'

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
 * Monta o contexto da ficha e delega o layout inteiro ao SheetV2 (página única).
 */
function SheetBody({ initialCharacter, adminContext = false, onBack }) {
  const { races, classes, backgrounds, classChoices, spells: srdSpells } = useSrd()
  const classDataMap = useClassDataMap()

  const [importError, setImportError] = useState(null)
  // Pedido one-shot de "abra a seção Magias". O `nonce` sobe a cada pedido, então
  // a troca de aba não depende de haver magia específica; `spellId` é opcional e
  // só serve pra auto-abrir o modal de detalhe (consumido e zerado pelo próprio
  // Spells, que dispara setDetailSpell e chama clearFocusSpell).
  const [spellNav, setSpellNav] = useState({ nonce: 0, spellId: null })

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
  // `fichaErrors` marca os campos inválidos do diálogo Identidade
  // (HeaderV2 → CharacterInfo) e vale já no primeiro render: o gate de "abas
  // tocadas" que engolia esses erros dependia do layout v1 e morreu com ele.
  const { getTabErrors } = useTabValidation(character, validationDeps)

  const handlers = useSheetHandlers({ setCharacter, races, classes, backgrounds })

  // Título do navegador
  useEffect(() => {
    const name = character.info.name?.trim()
    document.title = name ? `${name} — D&D 5e` : 'Grimório de Personagens — D&D 5e'
    return () => { document.title = 'Grimório de Personagens — D&D 5e' }
  }, [character.info.name])

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

  // featureUses é derivado de character — memo para evitar recalcular nos filhos.
  // `specialCastingUses` acrescenta os usos 1×/descanso de magia racial e de
  // talento; mora fora de `defaultClassFeatureUses` pra não fechar ciclo de
  // import (rules → subclassSpells → featSpells → rules).
  const featureUses = useMemo(
    () => mergeFeatureUses(character.combat?.classFeatureUses ?? [], [
      ...defaultClassFeatureUses(character, classChoices),
      ...specialCastingUses(character),
    ]),
    [character, classChoices],
  )

  // Retrofit das magias raciais: ficha criada antes do traço existir no app (ou
  // que subiu de nível e destravou a próxima magia) ganha o que falta ao abrir.
  // `injectRacialSpells` é idempotente e devolve o MESMO objeto quando nada
  // muda — sem isso o setCharacter reentraria a cada render e o autosave
  // dispararia à toa.
  useEffect(() => {
    if (!srdSpells?.length) return
    setCharacter(prev => injectRacialSpells(prev, srdSpells))
  }, [srdSpells, setCharacter, character.info?.race, character.info?.subrace, character.info?.level])

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
    // Normaliza de propósito: quando este handler é passado direto pro onClick
    // de um botão, o React entrega o SyntheticEvent aqui — e evento nunca é id
    // de magia. Sem isso o objeto vazaria pro Spells e seria comparado contra
    // ids reais.
    onNavigateToSpells: (spellId) => {
      const id = typeof spellId === 'string' || typeof spellId === 'number' ? spellId : null
      setSpellNav(prev => ({ nonce: prev.nonce + 1, spellId: id }))
    },
    spellNav,
    clearFocusSpell: () => setSpellNav(prev => ({ ...prev, spellId: null })),
  }), [character, setCharacter, calc, classData, races, classes, backgrounds, updaters, handlers, fichaErrors, featureUses, spellNav, readOnly])

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
      <SheetV2
        onBack={onBack}
        onExport={handleExport}
        onPrint={() => setPrintOpen(true)}
        onImport={handleImport}
        onImportError={setImportError}
        saving={saving}
        saved={saved}
        saveError={saveError}
        banner={
          importError ? (
            <ImportErrorBanner message={importError} onDismiss={() => setImportError(null)} />
          ) : conflictNotice ? (
            <ImportErrorBanner
              message="Esta ficha foi alterada em outro dispositivo. Recarregamos a versão mais recente — confira sua última edição."
              onDismiss={() => setConflictNotice(false)}
            />
          ) : null
        }
      />

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
    </CharacterProvider>
  )
}
