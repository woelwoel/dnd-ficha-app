import { useState } from 'react'
import { CampaignSetupModal } from './CampaignSetupModal'
import { BlockCard } from './BlockCard'
import { BlockEditorModal } from './BlockEditorModal'
import { ResumeDraftPrompt } from './ResumeDraftPrompt'
import { ConfirmExitPrompt } from './ConfirmExitPrompt'
import { BLOCKS } from './blocks-config'
import { useDraft } from './hooks/useDraft'
import { useBlockStatus } from './hooks/useBlockStatus'
import { useSrd } from '../../providers/SrdProvider'
import { ConceptBlock } from './blocks/ConceptBlock'
import { RaceBlock } from './blocks/RaceBlock'
import { ClassBlock } from './blocks/ClassBlock'

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
function WizardGrid({ initialSettings, resume, onBack }) {
  const { draft, updateDraft, hasChanges, resetDraft } = useDraft({ initialSettings, resume })
  const { races, classes, classChoices, progression: classProgression, feats,
          classEquipment, weaponsArmor } = useSrd()
  const blockStatus = useBlockStatus(draft, { classChoices, classProgression, classEquipment })
  const [openBlockId, setOpenBlockId] = useState(null)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

  function handleBackClick() {
    if (hasChanges) setExitConfirmOpen(true)
    else onBack()
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-parchment-100">
      <header
        className="flex items-center gap-4 px-6 py-3.5 border-b-2 border-parchment-600 bg-parchment-100"
        style={{ boxShadow: 'var(--shadow-parchment)' }}
      >
        <button
          onClick={handleBackClick}
          className="text-ink-200 hover:text-ink-500 text-sm font-display tracking-wide"
        >← Personagens</button>
        <div className="w-px h-4 bg-parchment-600" />
        <h1 className="text-sm font-display text-ink-500 tracking-widest uppercase">
          Forjar Herói
        </h1>
        <button
          type="button"
          disabled={blockStatus.review.status !== 'completo'}
          className="ml-auto px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide disabled:opacity-35 disabled:cursor-not-allowed"
        >✦ Inscrever Herói ✦</button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div
          className="max-w-5xl mx-auto grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
        >
          {BLOCKS.map(b => {
            const s = blockStatus[b.id]
            return (
              <BlockCard
                key={b.id}
                dataTestId={`block-card-${b.id}`}
                label={b.label}
                status={s.status}
                summary={summaryFor(b.id, draft)}
                blockedBy={s.blockedBy.map(id => LABEL_BY_ID[id] ?? id)}
                onClick={() => setOpenBlockId(b.id)}
              />
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
          />
        )}
        {openBlockId && !['concept', 'race', 'class'].includes(openBlockId) && (
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

export function CharacterWizardV2({ onBack, onComplete: _onComplete }) {
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
    />
  )
}
