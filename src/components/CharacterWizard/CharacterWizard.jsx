import { useState, useEffect, useMemo } from 'react'
import { generateId } from '../../hooks/useCharacter'
import { calculateMaxHp, ABBR_TO_KEY, ATTR_NAME_TO_KEY, SPELL_ABILITY_PT_TO_KEY, SKILLS, getModifier, parseBackgroundEquipment } from '../../utils/calculations'
import { Step0Settings } from './steps/Step0Settings'
import { Step1Concept } from './steps/Step1Concept'
import { Step2Race } from './steps/Step2Race'
import { Step3Class } from './steps/Step3Class'
import { Step4Background } from './steps/Step4Background'
import { Step5Attributes } from './steps/Step5Attributes'
import { Step6Skills } from './steps/Step6Skills'
import { Step7Spells } from './steps/Step7Spells'
import { Step8Review } from './steps/Step8Review'

// Estado inicial do wizard — zero preenchido
const INITIAL_DRAFT = {
  settings: {
    abilityScoreMethod: 'standard-array', // 'standard-array' | 'point-buy' | '4d6drop'
    allowFeats: false,
    allowMulticlass: false,
  },
  // Conceito
  name: '',
  alignment: '',
  appearance: '',
  // Raça
  race: '',
  subrace: '',
  racialBonuses: {},   // { str: 2, con: 1, ... }
  // Classe
  class: '',
  level: 1,
  savingThrows: [],
  spellcastingAbility: null,
  hitDice: '1d8',
  // Antecedente
  background: '',
  backgroundSkills: [],
  backgroundItems: [],
  backgroundGold: 0,
  // Atributos (base, sem bônus raciais)
  // standard-array / 4d6drop: inicia 0 (não atribuído); point-buy: inicia 8
  baseAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  rolledScores: [],    // apenas para 4d6drop
  // Perícias escolhidas pela classe
  chosenSkills: [],
  // Magias iniciais
  spells: [],
}

export function CharacterWizard({ onBack, onComplete }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(INITIAL_DRAFT)
  const [races, setRaces] = useState([])
  const [classes, setClasses] = useState([])
  const [backgrounds, setBackgrounds] = useState([])

  useEffect(() => {
    fetch('/srd-data/phb-races-pt.json').then(r => r.json()).then(setRaces).catch(() => {})
    fetch('/srd-data/phb-classes-pt.json').then(r => r.json()).then(setClasses).catch(() => {})
    fetch('/srd-data/phb-backgrounds-pt.json').then(r => r.json()).then(setBackgrounds).catch(() => {})
  }, [])

  const classData = useMemo(
    () => classes.find(c => c.index === draft.class) ?? null,
    [classes, draft.class]
  )
  const isSpellcaster = useMemo(
    () => !!SPELL_ABILITY_PT_TO_KEY[classData?.spellcasting_ability],
    [classData]
  )

  // Passos — Magias só aparece para conjuradores
  const steps = useMemo(() => {
    const base = [
      { id: 'settings',    label: 'Campanha'   },
      { id: 'concept',     label: 'Conceito'   },
      { id: 'race',        label: 'Raça'       },
      { id: 'class',       label: 'Classe'     },
      { id: 'background',  label: 'Antecedente'},
      { id: 'attributes',  label: 'Atributos'  },
      { id: 'skills',      label: 'Perícias'   },
    ]
    if (isSpellcaster) base.push({ id: 'spells', label: 'Magias' })
    base.push({ id: 'review', label: 'Revisão' })
    return base
  }, [isSpellcaster])

  function updateDraft(patch) {
    setDraft(prev => ({ ...prev, ...patch }))
  }

  const currentStepId = steps[step]?.id
  const canGoNext = canAdvance(currentStepId, draft)

  function handleNext() {
    if (canGoNext) setStep(s => Math.min(s + 1, steps.length - 1))
  }

  function handlePrev() {
    setStep(s => Math.max(s - 1, 0))
  }

  function handleFinish() {
    const character = buildCharacter(draft, classData)
    const stored = JSON.parse(localStorage.getItem('dnd-app-characters') || '[]')
    stored.push(character)
    localStorage.setItem('dnd-app-characters', JSON.stringify(stored))
    onComplete(character.id)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-20">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-amber-400 text-sm transition-colors"
          >
            ← Personagens
          </button>
          <h1 className="text-xl font-bold text-amber-400 font-display tracking-wide">Criar Personagem</h1>
        </div>

        {/* Indicador de progresso */}
        <StepIndicator steps={steps} current={step} />

        {/* Conteúdo do passo */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mt-6">
          {currentStepId === 'settings'   && <Step0Settings   draft={draft} updateDraft={updateDraft} />}
          {currentStepId === 'concept'    && <Step1Concept    draft={draft} updateDraft={updateDraft} />}
          {currentStepId === 'race'       && <Step2Race       draft={draft} updateDraft={updateDraft} races={races} />}
          {currentStepId === 'class'      && <Step3Class      draft={draft} updateDraft={updateDraft} classes={classes} />}
          {currentStepId === 'background' && <Step4Background draft={draft} updateDraft={updateDraft} backgrounds={backgrounds} />}
          {currentStepId === 'attributes' && <Step5Attributes draft={draft} updateDraft={updateDraft} />}
          {currentStepId === 'skills'     && <Step6Skills     draft={draft} updateDraft={updateDraft} classData={classData} />}
          {currentStepId === 'spells'     && <Step7Spells     draft={draft} updateDraft={updateDraft} classData={classData} />}
          {currentStepId === 'review'     && <Step8Review     draft={draft} races={races} classes={classes} backgrounds={backgrounds} classData={classData} />}
        </div>

        {/* Navegação */}
        <div className="flex justify-between mt-5">
          <button
            onClick={handlePrev}
            disabled={step === 0}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próximo →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!draft.name?.trim()}
              className="px-5 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Criar Personagem ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Indicador de passos ─────────────────────────────────────── */
function StepIndicator({ steps, current }) {
  return (
    <div>
      {/* Rótulos dos passos — scrollável no mobile */}
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-none">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center shrink-0">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
              i === current
                ? 'text-amber-300'
                : i < current
                ? 'text-amber-600'
                : 'text-gray-600'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 ${
                i === current
                  ? 'border-amber-400 bg-amber-900 text-amber-300'
                  : i < current
                  ? 'border-amber-700 bg-amber-950 text-amber-600'
                  : 'border-gray-700 bg-gray-900 text-gray-600'
              }`}>
                {i < current ? '✓' : i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-3 h-px mx-0.5 shrink-0 ${i < current ? 'bg-amber-700' : 'bg-gray-800'}`} />
            )}
          </div>
        ))}
      </div>
      {/* Barra de progresso */}
      <div className="h-1 bg-gray-800 rounded-full mt-2">
        <div
          className="h-1 bg-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}

/* ── Validação de avanço por passo ───────────────────────────── */
function canAdvance(stepId, draft) {
  switch (stepId) {
    case 'settings':    return true
    case 'concept':     return !!draft.name?.trim()
    case 'race':        return !!draft.race
    case 'class':       return !!draft.class
    case 'background':  return !!draft.background
    case 'attributes':  return isAttributesComplete(draft)
    case 'skills':      return true
    case 'spells':      return true
    case 'review':      return true
    default:            return true
  }
}

function isAttributesComplete(draft) {
  const { abilityScoreMethod } = draft.settings
  if (abilityScoreMethod === 'point-buy') return true // sempre válido (começa em 8)
  // standard-array e 4d6drop: todos os 6 atributos devem ter valor > 0
  return Object.values(draft.baseAttributes).every(v => v > 0)
}

/* ── Converte draft → character completo ──────────────────────── */
function buildCharacter(draft, classData) {
  // Aplica bônus raciais em cima dos atributos base
  const attrs = { ...draft.baseAttributes }
  for (const [k, v] of Object.entries(draft.racialBonuses)) {
    attrs[k] = Math.min(30, (attrs[k] ?? 10) + v)
  }

  const conMod = getModifier(attrs.con ?? 10)
  const dexMod = getModifier(attrs.dex ?? 10)
  const maxHp  = calculateMaxHp(classData, draft.level, attrs.con ?? 10)

  return {
    id: generateId(),
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0',
      creationMethod: 'wizard',
      settings: draft.settings,
    },
    info: {
      name:       draft.name,
      race:       draft.race,
      subrace:    draft.subrace,
      class:      draft.class,
      subclass:   '',
      level:      draft.level,
      background: draft.background,
      alignment:  draft.alignment,
      appearance: draft.appearance ?? '',
      xp:         0,
    },
    attributes: attrs,
    appliedRacialBonuses: draft.racialBonuses,
    combat: {
      maxHp,
      currentHp:   maxHp,
      tempHp:      0,
      armorClass:  10 + dexMod,
      speed:       30,
      hitDice:     draft.hitDice,
      deathSaves:  { successes: 0, failures: 0 },
    },
    proficiencies: {
      savingThrows:   draft.savingThrows,
      skills:         draft.chosenSkills,
      expertiseSkills:[],
      backgroundSkills: draft.backgroundSkills,
      armor:          [],
      weapons:        [],
      tools:          [],
      languages:      [],
    },
    spellcasting: {
      ability:    draft.spellcastingAbility,
      usedSlots:  {},
      spells:     draft.spells ?? [],
    },
    inventory: {
      currency: { cp: 0, sp: 0, ep: 0, gp: draft.backgroundGold ?? 0, pp: 0 },
      items: (draft.backgroundItems ?? []).map(i => ({ ...i, id: generateId() })),
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
