import { useState } from 'react'
import { CampaignSetupModal } from './CampaignSetupModal'
import { BlockCard } from './BlockCard'
import { BlockEditorModal } from './BlockEditorModal'
import { ResumeDraftPrompt } from './ResumeDraftPrompt'
import { ConfirmExitPrompt } from './ConfirmExitPrompt'
import { BLOCKS, GROUPS } from './blocks-config'
import { useDraft } from './hooks/useDraft'
import { useBlockStatus } from './hooks/useBlockStatus'
import { useSrd, useLazySrdDataset } from '../../providers/SrdProvider'
import { ConceptBlock } from './blocks/ConceptBlock'
import { RaceBlock } from './blocks/RaceBlock'
import { ClassBlock } from './blocks/ClassBlock'
import { BackgroundBlock } from './blocks/BackgroundBlock'
import { AttributesBlock } from './blocks/AttributesBlock'
import { SkillsBlock } from './blocks/SkillsBlock'
import { SpellsBlock } from './blocks/SpellsBlock'
import { ReviewBlock } from './blocks/ReviewBlock'
import { buildCharacter } from './blocks/build-character'
import { upsertCharacter } from '../../utils/storage'

const STORAGE_KEY = 'wizard-v2-draft'

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
function WizardGrid({ initialSettings, resume, onBack, onComplete }) {
  const { draft, updateDraft, hasChanges, resetDraft } = useDraft({ initialSettings, resume })
  const { races, classes, classChoices, progression: classProgression, backgrounds } = useSrd()
  // Datasets só usados no wizard — carregados sob demanda.
  const feats          = useLazySrdDataset('feats')
  const classEquipment = useLazySrdDataset('classEquipment')
  const weaponsArmor   = useLazySrdDataset('weaponsArmor')
  const multiclassData = useLazySrdDataset('multiclass')
  const blockStatus = useBlockStatus(draft, { classChoices, classProgression, classEquipment, classes })
  const [openBlockId, setOpenBlockId] = useState(null)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

  const selectedClassData = (classes ?? []).find(c => c.index === draft.class) ?? null

  function handleBackClick() {
    if (hasChanges) setExitConfirmOpen(true)
    else onBack()
  }

  function handleFinalize() {
    const character = buildCharacter(draft, selectedClassData, classEquipment ?? {})
    upsertCharacter(character)
    sessionStorage.removeItem('wizard-v2-draft')
    onComplete(character.id)
  }

  // Conta blocos completos para o indicador de progresso (Revisão é meta, não conta)
  const trackedBlocks = BLOCKS.filter(b => b.id !== 'review')
  const completedCount = trackedBlocks.filter(b => blockStatus[b.id]?.status === 'completo').length
  const totalCount = trackedBlocks.length
  const progressPct = Math.round((completedCount / totalCount) * 100)
  const allReady = blockStatus.review.status === 'completo'

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-parchment-100">
      <header
        className="border-b-2 border-parchment-600 bg-parchment-100"
        style={{ boxShadow: 'var(--shadow-parchment)' }}
      >
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
            className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-display tracking-[0.2em] uppercase text-ink-300"
          >
            <span className="text-emerald-700 font-bold">{completedCount}</span>
            <span>/</span>
            <span>{totalCount}</span>
            <span className="ink-italic normal-case tracking-normal ml-1">
              {allReady ? 'pronto pra forjar' : 'prontos'}
            </span>
          </span>
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
        {/* Barra de progresso */}
        <div className="h-1 bg-parchment-200">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-700 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
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
                    className="hidden sm:flex items-center gap-2 text-[10px] font-display tracking-[0.2em] uppercase text-ink-300 shrink-0"
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
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
                >
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
      >
        {openBlockId === 'concept' && (
          <ConceptBlock draft={draft} updateDraft={updateDraft} />
        )}
        {openBlockId === 'race' && (
          <RaceBlock draft={draft} updateDraft={updateDraft} races={races} />
        )}
        {openBlockId === 'class' && (
          <ClassBlock
            draft={draft} updateDraft={updateDraft}
            classes={classes ?? []} classChoices={classChoices ?? {}}
            classProgression={classProgression ?? {}} feats={feats ?? []}
            classEquipment={classEquipment ?? {}} weaponsArmor={weaponsArmor ?? {}}
            multiclassData={multiclassData ?? {}}
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
          setExitConfirmOpen(false)
          onBack()
        }}
        onCancel={() => setExitConfirmOpen(false)}
      />
    </div>
  )
}

export function CharacterWizardV2({ onBack, onComplete }) {
  const hasSavedDraft = !!sessionStorage.getItem(STORAGE_KEY)
  const [phase, setPhase] = useState(hasSavedDraft ? 'resume' : 'setup')
  const [pendingSettings, setPendingSettings] = useState(null)
  const [resumeRequested, setResumeRequested] = useState(false)

  if (phase === 'resume') {
    return (
      <ResumeDraftPrompt
        open={true}
        onResume={() => { setResumeRequested(true); setPhase('grid') }}
        onDiscard={() => { sessionStorage.removeItem(STORAGE_KEY); setPhase('setup') }}
      />
    )
  }

  if (phase === 'setup') {
    return (
      <CampaignSetupModal
        open={true}
        onCancel={onBack}
        onConfirm={settings => { setPendingSettings(settings); setPhase('grid') }}
      />
    )
  }

  // phase === 'grid'
  return (
    <WizardGrid
      initialSettings={pendingSettings}
      resume={resumeRequested}
      onBack={onBack}
      onComplete={onComplete}
    />
  )
}
