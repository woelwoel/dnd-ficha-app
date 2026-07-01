import { useMemo, useState } from 'react'
import { CampaignSetupModal } from './CampaignSetupModal'
import { BlockCard } from './BlockCard'
import { BlockEditorModal } from './BlockEditorModal'
import { ResumeDraftPrompt } from './ResumeDraftPrompt'
import { ConfirmExitPrompt } from './ConfirmExitPrompt'
import { BLOCKS, GROUPS } from './blocks-config'
import { useDraft } from './hooks/useDraft'
import { useBlockStatus } from './hooks/useBlockStatus'
import { useSrd, useLazySrdDataset } from '../../data/SrdProvider'
import { filterCatalogBySources } from '../../domain/sources'
import { ConceptBlock } from './blocks/ConceptBlock'
import { RaceBlock } from './blocks/RaceBlock'
import { ClassBlock } from './blocks/ClassBlock'
import { BackgroundBlock } from './blocks/BackgroundBlock'
import { AttributesBlock } from './blocks/AttributesBlock'
import { SkillsBlock } from './blocks/SkillsBlock'
import { SpellsBlock } from './blocks/SpellsBlock'
import { ReviewBlock } from './blocks/ReviewBlock'
import { buildCharacterWithSubclassSpells } from './blocks/build-character'
import { upsertCharacter } from '../../../../utils/storage'

const STORAGE_KEY = 'wizard-v2-draft'
// Mantém o destino (mesa vs pessoal) junto do draft no sessionStorage.
// Sem isso, se o user começa a ficha pra Mesa X, salva draft, e retoma sem
// `?campaignId=X` na URL, o wizard pula o DestinationModal e salva como
// pessoal silenciosamente (super review #2).
const CAMPAIGN_KEY = 'wizard-v2-campaign'

function readSavedCampaignId() {
  const raw = sessionStorage.getItem(CAMPAIGN_KEY)
  if (raw === null) return undefined
  try { return JSON.parse(raw) } catch { return undefined }
}

function writeSavedCampaignId(id) {
  sessionStorage.setItem(CAMPAIGN_KEY, JSON.stringify(id))
}

function clearWizardStorage() {
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(CAMPAIGN_KEY)
}

// Razões de falha ao salvar (upsertCharacter) → mensagem amigável exibida no
// wizard. Espelha SAVE_ERROR_MESSAGES do SheetHeader. Sem isso, "Inscrever
// Herói" falhava em silêncio (só console.error) e o usuário achava que o botão
// estava travado.
const FINALIZE_ERROR_MESSAGES = {
  limit: 'Você atingiu o limite de 100 fichas por conta.',
  'too-large': 'Ficha grande demais para salvar (limite ~200 KB).',
  invalid: 'A ficha tem dados inválidos e não pôde ser salva.',
  conflict: 'A ficha foi alterada em outro dispositivo. Recarregue e tente de novo.',
  unknown: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
}

export function finalizeErrorMessage(reason) {
  return FINALIZE_ERROR_MESSAGES[reason] ?? FINALIZE_ERROR_MESSAGES.unknown
}

function summaryFor(blockId, draft) {
  switch (blockId) {
    case 'race':       return draft.race || 'preencher...'
    case 'class':      return draft.class ? `${draft.class} ${draft.level}` : 'preencher...'
    case 'background': return draft.background || 'preencher...'
    case 'attributes': {
      const vals = Object.values(draft.baseAttributes ?? {})
      const filled = vals.filter(v => v > 0).length
      return filled === 0 ? 'preencher...' : `${filled}/6 atributos`
    }
    case 'skills':     return (draft.chosenSkills?.length ?? 0) === 0
      ? 'preencher...'
      : `${draft.chosenSkills.length} perícias`
    case 'spells': {
      const total = (draft.spells?.length ?? 0) + (draft.bonusSpells?.length ?? 0)
      return total === 0 ? 'preencher...' : `${total} magias`
    }
    case 'concept':    return draft.name?.trim() || 'preencher...'
    case 'review':     return 'em revisão'
    default:           return 'preencher...'
  }
}

const LABEL_BY_ID = Object.fromEntries(BLOCKS.map(b => [b.id, b.label]))

// Sub-componente que monta apenas quando phase='grid'.
// Isso garante que useDraft receba as options corretas na montagem inicial.
function WizardGrid({ initialSettings, resume, campaignId, onBack, onComplete }) {
  const { draft, updateDraft, hasChanges, resetDraft, saveStatus } = useDraft({ initialSettings, resume })
  const { races, classes, classChoices, progression: classProgression, backgrounds, spells: srdSpells } = useSrd()
  // Datasets só usados no wizard — carregados sob demanda.
  const rawFeats       = useLazySrdDataset('feats')
  const classEquipment = useLazySrdDataset('classEquipment')
  const weaponsArmor   = useLazySrdDataset('weaponsArmor')
  const multiclassData = useLazySrdDataset('multiclass')
  // Talentos OFERECIDOS no picker são filtrados pelas fontes ativas da ficha
  // (PHB sempre incluso). Não confundir com talentos já escolhidos — esses
  // vêm do próprio draft e não passam por aqui.
  // Nota: no draft (em criação) as settings vivem em draft.settings, não em
  // draft.meta.settings — o wrapper meta só existe na ficha já persistida
  // (ver build-character.js). Hoje não há picker de sources no wizard, então
  // isso sempre cai no fallback ['phb']; o caminho já fica correto para
  // quando esse picker existir.
  const activeSources = draft?.settings?.sources ?? ['phb']
  const feats = useMemo(
    () => filterCatalogBySources(rawFeats ?? [], activeSources),
    [rawFeats, activeSources],
  )
  // Classes OFERECIDAS nos pickers (primária + multiclasse) são filtradas
  // pelas fontes ativas da ficha — mesma lógica dos talentos acima (PHB
  // sempre incluso). Isso é só pra OFERTA: o lookup da classe já escolhida
  // (selectedClassData abaixo, e os lookups dentro de ClassBlock/
  // AttributesBlock) continua usando `classes` (lista completa) sem filtro,
  // senão uma ficha de Artífice com Tasha desativada depois não resolveria
  // a própria classe.
  const offeredClasses = useMemo(
    () => filterCatalogBySources(classes ?? [], activeSources),
    [classes, activeSources],
  )
  const blockStatus = useBlockStatus(draft, { classChoices, classProgression, classEquipment, classes })
  const [openBlockId, setOpenBlockId] = useState(null)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [finalizeError, setFinalizeError] = useState(null)

  const selectedClassData = (classes ?? []).find(c => c.index === draft.class) ?? null

  function handleBackClick() {
    if (hasChanges) setExitConfirmOpen(true)
    else onBack()
  }

  async function handleFinalize() {
    setFinalizeError(null)
    try {
      const character = buildCharacterWithSubclassSpells(
        draft, selectedClassData, classEquipment ?? {}, srdSpells ?? []
      )
      const result = await upsertCharacter(character, { campaignId: campaignId ?? null })
      if (!result.ok) {
        // Loga os campos inválidos de forma LEGÍVEL (path: mensagem) em vez de
        // um `Array(1)` colapsado no console — facilita diagnosticar qual campo
        // da ficha o schema rejeitou.
        const detail = Array.isArray(result.errors)
          ? result.errors.map(e => `${(e.path ?? []).join('.') || '(raiz)'}: ${e.message}`).join(' | ')
          : (result.reason ?? 'desconhecido')
        console.error('[wizard] falha ao salvar:', detail)
        setFinalizeError(finalizeErrorMessage(result.reason))
        return
      }
      clearWizardStorage()
      // Prefere short_id (URL curta); fallback pro UUID em caso de fichas
      // pre-migration 0003 ou se o servidor não devolver short_id.
      onComplete(result.shortId ?? character.id)
    } catch (err) {
      // build ou a chamada ao Supabase podem LANÇAR (rede, exceção inesperada).
      // Sem este catch a promise rejeitava sem tratamento e o clique "não fazia
      // nada".
      console.error('[wizard] erro ao inscrever herói:', err)
      setFinalizeError('Algo deu errado ao inscrever o herói. Tente novamente.')
    }
  }

  // Conta blocos completos para o indicador de progresso (Revisão é meta, não conta)
  const trackedBlocks = BLOCKS.filter(b => b.id !== 'review')
  const completedCount = trackedBlocks.filter(b => blockStatus[b.id]?.status === 'completo').length
  const totalCount = trackedBlocks.length
  const progressPct = Math.round((completedCount / totalCount) * 100)
  const allReady = blockStatus.review.status === 'completo'

  // Próximo bloco recomendado após o aberto (resolve "qual o próximo passo?"
  // após salvar — só clicar "Continuar →" e seguir).
  const nextBlock = (() => {
    if (!openBlockId) return null
    const idx = BLOCKS.findIndex(b => b.id === openBlockId)
    for (let i = idx + 1; i < BLOCKS.length; i++) {
      const candidate = BLOCKS[i]
      if (blockStatus[candidate.id]?.status !== 'bloqueado') return candidate
    }
    return null
  })()

  return (
    <div className="min-h-screen flex flex-col bg-parchment-100">
      <header className="sticky top-0 z-30 border-b-2 border-parchment-600 bg-parchment-100 shadow-parchment">
        <div className="flex items-center gap-4 px-6 py-3.5">
          <button
            onClick={handleBackClick}
            className="text-ink-200 hover:text-ink-500 text-sm font-display tracking-wide"
          >← Personagens</button>
          <div className="w-px h-4 bg-parchment-600" />
          <h1 className="text-sm font-display text-ink-500 tracking-widest uppercase">
            Forjar Herói
          </h1>
          <span
            aria-label={`${completedCount} de ${totalCount} blocos prontos`}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-display tracking-[0.2em] uppercase text-ink-300"
          >
            <span className="text-emerald-700 font-bold">{completedCount}</span>
            <span>/</span>
            <span>{totalCount}</span>
            <span className="ink-italic normal-case tracking-normal ml-1">
              {allReady ? 'pronto pra forjar' : 'prontos'}
            </span>
          </span>
          {/* Indicador de auto-save do draft em sessionStorage */}
          {(saveStatus === 'saving' || saveStatus === 'saved') && (
            <span
              aria-live="polite"
              className={`hidden md:inline-flex items-center text-xs ink-italic normal-case tracking-normal transition-opacity ${
                saveStatus === 'saving' ? 'text-ink-300' : 'text-emerald-700 opacity-70'
              }`}
              title={saveStatus === 'saving' ? 'Salvando rascunho…' : 'Rascunho salvo localmente'}
            >
              {saveStatus === 'saving' ? 'salvando…' : '✓ salvo'}
            </span>
          )}
          <button
            type="button"
            disabled={!allReady}
            onClick={handleFinalize}
            className={[
              'ml-auto px-5 py-1.5 rounded-sm border-2 text-sm font-display tracking-wide transition-all',
              allReady
                ? 'bg-ink-500 hover:bg-ink-600 border-ink-600 text-parchment-50 shadow-[var(--shadow-parchment-sm)]'
                : 'bg-parchment-200 border-parchment-600 text-ink-300 opacity-60 cursor-not-allowed',
            ].join(' ')}
          >✦ Inscrever Herói ✦</button>
        </div>
        {/* Erro ao inscrever herói — antes o clique falhava em silêncio */}
        {finalizeError && (
          <div
            role="alert"
            className="px-6 pb-2.5 -mt-1 flex items-start gap-2 text-sm text-red-700"
          >
            <span aria-hidden>⚠</span>
            <span>{finalizeError}</span>
          </div>
        )}
        {/* Barra de progresso */}
        <div className="h-1 bg-parchment-200">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-700 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>
      </header>

      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          {GROUPS.map((g, gi) => {
            const groupBlocks = BLOCKS
              .map((b, i) => ({ b, originalIndex: i }))
              .filter(({ b }) => b.group === g.id)
            const completeInGroup = groupBlocks.filter(
              ({ b }) => blockStatus[b.id]?.status === 'completo'
            ).length

            return (
              <section key={g.id} aria-labelledby={`chapter-${g.id}`}>
                {/* Cabeçalho do capítulo */}
                <header className="flex items-center gap-4 mb-3 px-1">
                  <span
                    aria-hidden
                    className="text-2xl font-display text-parchment-600/80 leading-none w-8 text-center"
                  >{g.roman}</span>
                  <div className="flex-1 min-w-0">
                    <h2
                      id={`chapter-${g.id}`}
                      className="text-base font-display tracking-[0.25em] uppercase text-ink-500 leading-tight"
                    >{g.title}</h2>
                    <p className="text-xs ink-italic text-ink-300 mt-0.5">{g.subtitle}</p>
                  </div>
                  <span
                    aria-hidden
                    className="hidden sm:flex items-center gap-2 text-xs font-display tracking-[0.2em] uppercase text-ink-300 shrink-0"
                  >
                    <span className={completeInGroup === groupBlocks.length ? 'text-emerald-700 font-bold' : ''}>
                      {completeInGroup}
                    </span>
                    /<span>{groupBlocks.length}</span>
                  </span>
                </header>

                {/* Linha decorativa abaixo do título */}
                <div className="flex items-center gap-2 mb-4 px-1" aria-hidden>
                  <span className="h-px flex-1 bg-gradient-to-r from-parchment-600/50 to-transparent" />
                  <span className="text-parchment-600/60 text-xs">❦</span>
                  <span className="h-px flex-1 bg-gradient-to-l from-parchment-600/50 to-transparent" />
                </div>

                {/* Grid de cards do capítulo */}
                <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                  {groupBlocks.map(({ b, originalIndex }) => {
                    const s = blockStatus[b.id]
                    return (
                      <BlockCard
                        key={b.id}
                        dataTestId={`block-card-${b.id}`}
                        label={b.label}
                        icon={b.icon}
                        hint={b.hint}
                        step={originalIndex}
                        status={s.status}
                        summary={summaryFor(b.id, draft)}
                        blockedBy={s.blockedBy.map(id => LABEL_BY_ID[id] ?? id)}
                        onClick={() => setOpenBlockId(b.id)}
                      />
                    )
                  })}
                </div>

                {/* Separador entre capítulos (exceto o último) */}
                {gi < GROUPS.length - 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3 select-none" aria-hidden>
                    <span className="h-px w-20 bg-parchment-600/40" />
                    <span className="text-parchment-600/60 text-base">⁂</span>
                    <span className="h-px w-20 bg-parchment-600/40" />
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>

      <BlockEditorModal
        open={openBlockId !== null}
        title={openBlockId ? LABEL_BY_ID[openBlockId] : ''}
        onClose={() => setOpenBlockId(null)}
        onNext={nextBlock ? (() => setOpenBlockId(nextBlock.id)) : undefined}
        nextLabel={nextBlock?.label}
      >
        {openBlockId === 'concept' && (
          <ConceptBlock draft={draft} updateDraft={updateDraft} />
        )}
        {openBlockId === 'race' && (
          <RaceBlock draft={draft} updateDraft={updateDraft} races={races} feats={feats ?? []} />
        )}
        {openBlockId === 'class' && (
          <ClassBlock
            draft={draft} updateDraft={updateDraft}
            classes={classes ?? []} offeredClasses={offeredClasses}
            classChoices={classChoices ?? {}}
            classProgression={classProgression ?? {}} feats={feats ?? []}
            classEquipment={classEquipment ?? {}} weaponsArmor={weaponsArmor ?? {}}
            multiclassData={multiclassData ?? {}}
            activeSources={activeSources}
          />
        )}
        {openBlockId === 'background' && (
          <BackgroundBlock draft={draft} updateDraft={updateDraft} backgrounds={backgrounds ?? []} />
        )}
        {openBlockId === 'attributes' && (
          <AttributesBlock draft={draft} updateDraft={updateDraft}
            multiclassData={multiclassData ?? {}} classes={classes ?? []} />
        )}
        {openBlockId === 'skills' && (
          <SkillsBlock draft={draft} updateDraft={updateDraft}
            classData={selectedClassData} />
        )}
        {openBlockId === 'spells' && (
          <SpellsBlock draft={draft} updateDraft={updateDraft}
            classData={selectedClassData} />
        )}
        {openBlockId === 'review' && (
          <ReviewBlock draft={draft}
            races={races ?? []} backgrounds={backgrounds ?? []}
            classData={selectedClassData} />
        )}
        {openBlockId && !['concept', 'race', 'class', 'background', 'attributes', 'skills', 'spells', 'review'].includes(openBlockId) && (
          <p className="text-sm text-ink-300 italic text-center py-12">
            Em construção (PR seguinte).
          </p>
        )}
      </BlockEditorModal>

      <ConfirmExitPrompt
        open={exitConfirmOpen}
        onSaveAndExit={() => { setExitConfirmOpen(false); onBack() }}
        onDiscard={() => {
          resetDraft()
          sessionStorage.removeItem(CAMPAIGN_KEY)
          setExitConfirmOpen(false)
          onBack()
        }}
        onCancel={() => setExitConfirmOpen(false)}
      />
    </div>
  )
}

export function CharacterWizardV2({ onBack, onComplete, initialCampaignId }) {
  const hasSavedDraft = !!sessionStorage.getItem(STORAGE_KEY)
  // Só recupera destino salvo se existe um DRAFT real em vôo. Sem isso,
  // um "pessoal explícito" anterior virava cache permanente que pulava o
  // modal silenciosamente nas próximas criações.
  const savedCampaignId = hasSavedDraft ? readSavedCampaignId() : undefined
  const resolvedInitialCampaignId =
    initialCampaignId !== undefined ? initialCampaignId : savedCampaignId
  // campaignId: undefined = ainda não decidido (mostra modal fundido);
  // null = pessoal; string = mesa específica.
  const [campaignId, setCampaignIdState] = useState(resolvedInitialCampaignId)

  const setCampaignId = (id) => {
    writeSavedCampaignId(id)
    setCampaignIdState(id)
  }

  // Fase inicial:
  //  - resume   → quando tem draft real no sessionStorage
  //  - setup    → modal fundido (destino + settings se campaignId ainda
  //               não decidido; só settings se já veio decidido por URL/prop)
  const [phase, setPhase] = useState(hasSavedDraft ? 'resume' : 'setup')
  const [pendingSettings, setPendingSettings] = useState(null)
  const [resumeRequested, setResumeRequested] = useState(false)

  if (phase === 'resume') {
    return (
      <ResumeDraftPrompt
        open={true}
        onResume={() => { setResumeRequested(true); setPhase('grid') }}
        onDiscard={() => { clearWizardStorage(); setPhase('setup') }}
      />
    )
  }

  if (phase === 'setup') {
    const showDestination = campaignId === undefined
    return (
      <CampaignSetupModal
        open={true}
        showDestination={showDestination}
        onCancel={onBack}
        onConfirm={payload => {
          if (showDestination) {
            // payload = { settings, campaignId }
            setCampaignId(payload.campaignId)
            setPendingSettings(payload.settings)
          } else {
            // payload = settings (legado)
            setPendingSettings(payload)
          }
          setPhase('grid')
        }}
      />
    )
  }

  // phase === 'grid'
  return (
    <WizardGrid
      initialSettings={pendingSettings}
      resume={resumeRequested}
      campaignId={campaignId}
      onBack={onBack}
      onComplete={onComplete}
    />
  )
}
