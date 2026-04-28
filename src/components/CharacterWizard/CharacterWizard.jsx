import { useState, useMemo } from 'react'
import { generateId } from '../../hooks/useCharacter'
import { calculateMaxHp, SPELL_ABILITY_PT_TO_KEY, getModifier } from '../../utils/calculations'
import { upsertCharacter } from '../../utils/storage'
import { useSrd } from '../../providers/SrdProvider'
import { Step0Settings } from './steps/Step0Settings'
import { Step1Concept } from './steps/Step1Concept'
import { Step2Race } from './steps/Step2Race'
import { Step3Class } from './steps/Step3Class'
import { Step4Background } from './steps/Step4Background'
import { Step5Attributes } from './steps/Step5Attributes'
import { Step6Skills } from './steps/Step6Skills'
import { Step7Spells } from './steps/Step7Spells'
import { Step8Review } from './steps/Step8Review'

/* ── Estado inicial do wizard ─────────────────────────────────── */
const INITIAL_DRAFT = {
  settings: {
    abilityScoreMethod: 'standard-array',
    allowFeats: false,
    allowMulticlass: false,
  },
  name: '', playerName: '', alignment: '', appearance: '',
  race: '', subrace: '', racialBonuses: {},
  class: '', level: 1, chosenFeatures: {}, savingThrows: [],
  spellcastingAbility: null, hitDice: '1d8',
  background: '', backgroundSkills: [], backgroundItems: [],
  backgroundGold: 0,
  classEquipmentChoice: 'equipment', classEquipmentChoices: {}, classStartingGold: 0,
  baseAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  rolledScores: [],
  chosenSkills: [],
  spells: [], bonusSpells: [],
}

/* ── Sidebar de passos (desktop) ──────────────────────────────── */
function WizardStepSidebar({ steps, current }) {
  return (
    <div className="flex flex-col gap-0 py-2">
      {steps.map((s, i) => {
        const done    = i < current
        const active  = i === current
        const pending = i > current

        return (
          <div key={s.id} className="flex items-start gap-3 px-2">
            {/* Coluna: círculo + conector */}
            <div className="flex flex-col items-center min-w-[28px]">
              {/* Círculo */}
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 border transition-all duration-200',
                done    ? 'border-blue-600/80 bg-blue-900/50 text-blue-300'                                         : '',
                active  ? 'border-amber-400 bg-amber-900/30 text-amber-300 shadow-[0_0_14px_rgba(196,144,48,0.35)]' : '',
                pending ? 'border-gray-700 bg-gray-900 text-gray-700'                                               : '',
              ].join(' ')}>
                {done ? '✓' : i + 1}
              </div>
              {/* Conector */}
              {i < steps.length - 1 && (
                <div className={[
                  'w-px flex-1 min-h-[24px] mt-0.5 mb-0.5',
                  done ? 'bg-blue-700/50' : 'bg-gray-800',
                ].join(' ')} />
              )}
            </div>

            {/* Rótulo */}
            <div className={[
              'pt-1 text-sm leading-tight transition-colors duration-150',
              active  ? 'text-amber-300 font-display font-semibold tracking-wide' : '',
              done    ? 'text-gray-500'                                            : '',
              pending ? 'text-gray-700'                                            : '',
            ].join(' ')}>
              {s.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Indicador de passos mobile ───────────────────────────────── */
function MobileStepIndicator({ steps, current }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-none">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center shrink-0">
            <div className={[
              'flex items-center gap-1 px-2 py-0.5 rounded text-xs whitespace-nowrap transition-colors',
              i === current ? 'text-amber-300' : i < current ? 'text-gray-600' : 'text-gray-700',
            ].join(' ')}>
              <span className={[
                'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 transition-all',
                i === current ? 'border-amber-400 bg-amber-900/40 text-amber-300 shadow-[0_0_8px_rgba(196,144,48,0.3)]'
                : i < current  ? 'border-blue-700/70 bg-blue-950/40 text-gray-500'
                :                'border-gray-800 bg-gray-900 text-gray-700',
              ].join(' ')}>
                {i < current ? '✓' : i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-2 h-px mx-0.5 ${i < current ? 'bg-gray-600' : 'bg-gray-800'}`} />
            )}
          </div>
        ))}
      </div>
      {/* Barra de progresso */}
      <div className="h-0.5 bg-gray-800 rounded-full mt-2">
        <div
          className="h-0.5 bg-gradient-to-r from-blue-500 to-amber-400 rounded-full transition-all duration-300"
          style={{ width: `${steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}

/* ── Componente principal ──────────────────────────────────────── */
export function CharacterWizard({ onBack, onComplete }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(INITIAL_DRAFT)

  const {
    races, classes, backgrounds,
    classChoices, classEquipment, progression: classProgression,
  } = useSrd()

  const classData = useMemo(
    () => classes.find(c => c.index === draft.class) ?? null,
    [classes, draft.class],
  )
  const isSpellcaster = useMemo(
    () => !!SPELL_ABILITY_PT_TO_KEY[classData?.spellcasting_ability],
    [classData],
  )

  const steps = useMemo(() => {
    const base = [
      { id: 'settings',   label: 'Campanha'    },
      { id: 'concept',    label: 'Conceito'    },
      { id: 'race',       label: 'Raça'        },
      { id: 'class',      label: 'Classe'      },
      { id: 'background', label: 'Antecedente' },
      { id: 'attributes', label: 'Atributos'   },
      { id: 'skills',     label: 'Perícias'    },
    ]
    if (isSpellcaster) base.push({ id: 'spells', label: 'Magias' })
    base.push({ id: 'review', label: 'Revisão' })
    return base
  }, [isSpellcaster])

  function updateDraft(patch) {
    setDraft(prev => ({ ...prev, ...patch }))
  }

  const currentStepId = steps[step]?.id
  const canGoNext = canAdvance(currentStepId, draft, classChoices, races, classData)

  function handleNext() {
    if (canGoNext) setStep(s => Math.min(s + 1, steps.length - 1))
  }

  function handlePrev() {
    setStep(s => Math.max(s - 1, 0))
  }

  function handleFinish() {
    const character = buildCharacter(draft, classData, classEquipment)
    upsertCharacter(character)
    onComplete(character.id)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">

      {/* Névoa de fundo */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/3 w-[600px] h-[500px] rounded-full bg-blue-900/15 blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-900/10 blur-[110px]" />
      </div>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center gap-4 px-6 py-3.5 border-b border-gray-700/60 bg-gray-900/60 backdrop-blur-sm shrink-0">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-amber-400 text-sm transition-colors"
        >
          ← Personagens
        </button>
        <div className="w-px h-4 bg-gray-700/60" />
        <h1 className="text-sm font-bold text-amber-400 font-display tracking-widest uppercase">
          Criar Personagem
        </h1>
        {/* Contagem de passo mobile */}
        <span className="ml-auto md:hidden text-xs text-gray-600 font-display">
          {step + 1} / {steps.length}
        </span>
      </header>

      {/* ── Corpo: sidebar + conteúdo ───────────────────────── */}
      <div className="relative flex flex-1 min-h-0">

        {/* Sidebar de passos (somente desktop) */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-gray-700/50 bg-gray-900/30 overflow-y-auto py-6 px-4">
          <WizardStepSidebar steps={steps} current={step} />
        </aside>

        {/* Área de conteúdo */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-xl mx-auto px-4 py-6">

            {/* Indicador mobile */}
            <div className="md:hidden">
              <MobileStepIndicator steps={steps} current={step} />
            </div>

            {/* Card do passo */}
            <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl overflow-hidden arcane-card">
              {/* Título do passo */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-700/40">
                <p className="text-[10px] text-gray-600 font-display tracking-[0.3em] uppercase mb-0.5">
                  Passo {step + 1} de {steps.length}
                </p>
                <h2 className="text-base font-bold text-amber-400 font-display tracking-widest uppercase">
                  {steps[step]?.label}
                </h2>
              </div>

              {/* Conteúdo */}
              <div className="px-6 py-5">
                {currentStepId === 'settings'   && <Step0Settings   draft={draft} updateDraft={updateDraft} />}
                {currentStepId === 'concept'    && <Step1Concept    draft={draft} updateDraft={updateDraft} />}
                {currentStepId === 'race'       && <Step2Race       draft={draft} updateDraft={updateDraft} races={races} />}
                {currentStepId === 'class'      && <Step3Class      draft={draft} updateDraft={updateDraft} classes={classes} classChoices={classChoices} classEquipment={classEquipment} classProgression={classProgression} />}
                {currentStepId === 'background' && <Step4Background draft={draft} updateDraft={updateDraft} backgrounds={backgrounds} />}
                {currentStepId === 'attributes' && <Step5Attributes draft={draft} updateDraft={updateDraft} />}
                {currentStepId === 'skills'     && <Step6Skills     draft={draft} updateDraft={updateDraft} classData={classData} />}
                {currentStepId === 'spells'     && <Step7Spells     draft={draft} updateDraft={updateDraft} classData={classData} />}
                {currentStepId === 'review'     && <Step8Review     draft={draft} races={races} backgrounds={backgrounds} classData={classData} />}
              </div>
            </div>

            {/* ── Navegação ──────────────────────────────────── */}
            <div className="flex justify-between mt-5">
              <button
                onClick={handlePrev}
                disabled={step === 0}
                className="px-5 py-2 rounded-lg border border-gray-700/80 hover:border-gray-500 text-gray-400 hover:text-gray-100 text-sm disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>

              {step < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="px-6 py-2 rounded-lg bg-blue-700/50 hover:bg-blue-600/60 border border-blue-600/60 hover:border-blue-400/70 text-blue-100 text-sm font-semibold disabled:opacity-35 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_16px_rgba(40,90,152,0.3)]"
                >
                  Próximo →
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={!draft.name?.trim()}
                  className="px-6 py-2 rounded-lg bg-amber-700/50 hover:bg-amber-600/60 border border-amber-600/60 hover:border-amber-400/70 text-amber-100 text-sm font-semibold disabled:opacity-35 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_16px_rgba(196,144,48,0.3)]"
                >
                  Criar Personagem ✦
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Validação de avanço por passo ───────────────────────────── */
function canAdvance(stepId, draft, classChoices = {}, races = [], classData = null) {
  switch (stepId) {
    case 'settings':   return true
    case 'concept':    return !!draft.name?.trim()
    case 'race': {
      if (!draft.race) return false
      const selectedRace = races.find(r => r.index === draft.race)
      if (selectedRace?.subraces?.length > 0 && !selectedRace.optionalSubrace && !draft.subrace) return false
      return true
    }
    case 'class': {
      if (!draft.class) return false
      const choices = classChoices[draft.class]?.choices ?? []
      const leveledChoices = choices.filter(c => c.level <= draft.level)
      if (!leveledChoices.every(c => !!draft.chosenFeatures?.[c.id])) return false
      const bonusCantripsNeeded = leveledChoices.reduce((sum, c) => {
        const opt = c.options.find(o => o.value === draft.chosenFeatures?.[c.id])
        return sum + (opt?.grants?.bonusCantrips ?? 0)
      }, 0)
      return (draft.bonusSpells?.length ?? 0) >= bonusCantripsNeeded
    }
    case 'background': return !!draft.background
    case 'attributes': return isAttributesComplete(draft)
    case 'skills': {
      const limit = classData?.skill_choices?.count ?? null
      if (limit === null) return true
      return (draft.chosenSkills?.length ?? 0) >= limit
    }
    case 'spells': {
      const CLASSES_SEM_CANTRIPS = new Set(['paladino', 'patrulheiro'])
      if (CLASSES_SEM_CANTRIPS.has(draft.class)) return true
      const chosenCantrips = (draft.spells ?? []).filter(s => s.level === 0)
      return chosenCantrips.length > 0
    }
    case 'review': return true
    default:       return true
  }
}

function isAttributesComplete(draft) {
  const { abilityScoreMethod } = draft.settings
  if (abilityScoreMethod === 'point-buy') return true
  return Object.values(draft.baseAttributes).every(v => v > 0)
}

/* ── Resolve itens de equipamento de classe ───────────────────── */
function resolveClassEquipmentItems(draft, classEquipment) {
  if (draft.classEquipmentChoice !== 'equipment') return []
  const classData = classEquipment?.[draft.class]
  if (!classData) return []
  const items = []
  for (const choice of classData.choices ?? []) {
    const selected = draft.classEquipmentChoices?.[choice.id]
    if (!selected) continue
    const opt = choice.options.find(o => o.value === selected)
    if (opt) items.push(...(opt.items ?? []).map(i => ({ ...i, source: 'class' })))
  }
  for (const item of classData.fixed ?? []) {
    items.push({ ...item, source: 'class' })
  }
  return items
}

/* ── Converte draft → character completo ──────────────────────── */
function buildCharacter(draft, classData, classEquipment) {
  const attrs = { ...draft.baseAttributes }
  for (const [k, v] of Object.entries(draft.racialBonuses)) {
    attrs[k] = Math.min(30, (attrs[k] ?? 10) + v)
  }

  const dexMod = getModifier(attrs.dex ?? 10)
  const maxHp  = calculateMaxHp(classData, draft.level, attrs.con ?? 10)
  let unarmoredAC = 10 + dexMod
  if (draft.class === 'barbaro') unarmoredAC += getModifier(attrs.con ?? 10)
  if (draft.class === 'monge')   unarmoredAC += getModifier(attrs.wis ?? 10)

  return {
    id: generateId(),
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0',
      schemaVersion: 2,
      creationMethod: 'wizard',
      settings: draft.settings,
    },
    info: {
      name:           draft.name,
      playerName:     draft.playerName ?? '',
      race:           draft.race,
      subrace:        draft.subrace,
      class:          draft.class,
      subclass:       '',
      level:          draft.level,
      multiclasses:   [],
      chosenFeatures: draft.chosenFeatures ?? {},
      background:     draft.background,
      alignment:      draft.alignment,
      appearance:     draft.appearance ?? '',
      xp:             0,
      scoreMethod:    draft.settings.abilityScoreMethod,
    },
    attributes: attrs,
    appliedRacialBonuses: draft.racialBonuses,
    combat: {
      maxHp,
      currentHp:   maxHp,
      tempHp:      0,
      armorClass:  unarmoredAC,
      speed:       30,
      hitDice: {
        pool: {
          [`d${classData?.hit_die ?? 8}`]: { total: draft.level, used: 0 },
        },
      },
      attacks:     [],
      concentrating: { spellIndex: null, spellName: null },
      deathSaves:  { successes: 0, failures: 0 },
    },
    proficiencies: {
      savingThrows:    draft.savingThrows,
      skills:          draft.chosenSkills,
      expertiseSkills: [],
      backgroundSkills: draft.backgroundSkills,
      armor:   [],
      weapons: [],
      tools:   [],
      languages: [],
    },
    spellcasting: {
      ability:    draft.spellcastingAbility,
      usedSlots:  {},
      spells: (() => {
        const baseSpells = [...(draft.spells ?? []), ...(draft.bonusSpells ?? [])]
        if (draft.chosenFeatures?.pact_boon === 'corrente' && !baseSpells.find(s => s.index === 'find-familiar')) {
          baseSpells.push({
            index: 'find-familiar', name: 'Achar Familiar', level: 1,
            school: 'Conjuração', ritual: true, concentration: false,
            desc: 'Você evoca um espírito familiar que assume a forma de um animal.',
          })
        }
        const seen = new Set()
        return baseSpells.filter(s => !seen.has(s.index) && seen.add(s.index))
      })(),
    },
    inventory: {
      currency: {
        cp: 0, sp: 0, ep: 0,
        gp: (draft.backgroundGold ?? 0) + (draft.classEquipmentChoice === 'gold' ? (draft.classStartingGold ?? 0) : 0),
        pp: 0,
      },
      items: [
        ...(draft.backgroundItems ?? []).map(i => ({ ...i, id: generateId() })),
        ...resolveClassEquipmentItems(draft, classEquipment).map(i => ({ ...i, id: generateId() })),
      ],
    },
    traits: {
      personalityTraits: '',
      ideals:            '',
      bonds:             '',
      flaws:             '',
      featuresAndTraits: '',
      notes:             '',
    },
  }
}
