import { useState } from 'react'
import { ClassPicker } from './class/ClassPicker'
import { LevelProgressionList } from './class/LevelProgressionList'
import { ClassStatsCards } from './class/ClassStatsCards'
import { ClassEquipment } from './class/ClassEquipment'
import { CantripsGrantPicker } from '../../CantripsGrantPicker'
import { MulticlassModal } from '../MulticlassModal'
import {
  getLeveledChoices, computeBonusCantripsNeeded, getProgressionLevels,
} from './class-helpers'
import { SPELL_ABILITY_PT_TO_KEY, SKILLS } from '../../../../../utils/calculations'

const ATTR_NAME_TO_KEY = {
  'Força': 'str', 'Destreza': 'dex', 'Constituição': 'con',
  'Inteligência': 'int', 'Sabedoria': 'wis', 'Carisma': 'cha',
}

export function ClassBlock({
  draft, updateDraft, classes, offeredClasses, classChoices = {}, classProgression = {}, feats = [],
  classEquipment = {}, weaponsArmor = {}, multiclassData = {},
}) {
  // `classes` = catálogo COMPLETO, usado só pra LOOKUP de classe já escolhida
  // (primária ou multiclasse) — precisa resolver mesmo que a fonte dela
  // tenha sido desativada depois (ex: Artífice/Tasha). `offeredClasses` =
  // lista filtrada pelas fontes ativas da ficha, usada só nos pickers que
  // OFERECEM classe nova (ClassPicker e MulticlassModal). Sem essa
  // separação, desligar Tasha quebraria a resolução de uma ficha já com
  // Artífice. Ausência de offeredClasses (ex: testes antigos) cai no
  // catálogo completo — sem filtro, igual ao comportamento de antes.
  const classesForOffer = offeredClasses ?? classes
  const [mcModalOpen, setMcModalOpen] = useState(false)
  const selectedClass = classes.find(c => c.index === draft.class) ?? null
  const multiclasses = draft.multiclasses ?? []
  const allowMulticlass = draft.settings?.allowMulticlass ?? false
  // Multiclasse exige pré-requisito de atributo (ex: 13 FOR pra Guerreiro).
  // Antes de Atributos estarem distribuídos não há como validar — bloqueia ação,
  // mas mantém a seção visível com explicação pra usuário descobrir a feature.
  const attributesReady = ['str', 'dex', 'con', 'int', 'wis', 'cha']
    .every(k => (draft.baseAttributes?.[k] ?? 0) > 0)

  function handleAddMulticlass(mcEntry) {
    updateDraft({ multiclasses: [...multiclasses, mcEntry] })
    setMcModalOpen(false)
  }

  function handleRemoveMulticlass(idx) {
    updateDraft({ multiclasses: multiclasses.filter((_, i) => i !== idx) })
  }

  // ── Handlers de multiclasse (escolhas por sub-classe) ──────────────
  // Antes a UI de multiclasse só mostrava nome+nível e o jogador não tinha
  // como escolher origem de Feiticeiro, domínio de Clérigo, etc. Agora cada
  // MC ganha sua própria LevelProgressionList e estes handlers escrevem em
  // mc.chosenFeatures / mc.asiChoices, no índice certo do array.
  function updateMulticlassAt(mcIdx, patch) {
    updateDraft({
      multiclasses: multiclasses.map((mc, i) => i === mcIdx ? { ...mc, ...patch } : mc),
    })
  }
  function handleMcFeatureChoice(mcIdx, choiceId, value) {
    const mc = multiclasses[mcIdx]
    if (!mc) return
    updateMulticlassAt(mcIdx, {
      chosenFeatures: { ...(mc.chosenFeatures ?? {}), [choiceId]: value },
    })
  }
  function handleMcASIChoice(mcIdx, level, choice) {
    const mc = multiclasses[mcIdx]
    if (!mc) return
    updateMulticlassAt(mcIdx, {
      asiChoices: { ...(mc.asiChoices ?? {}), [level]: choice },
    })
  }

  const leveledChoices = getLeveledChoices(classChoices[draft.class], draft.level, draft.chosenFeatures)
  const progressionLevels = getProgressionLevels(classProgression[draft.class], draft.level)
  const bonusCantripsNeeded = computeBonusCantripsNeeded(leveledChoices, draft.chosenFeatures ?? {})

  const conMod = Math.floor(((draft.baseAttributes?.con ?? 10) + (draft.racialBonuses?.con ?? 0) - 10) / 2)

  function handleClassChange(classIndex) {
    const cls = classes.find(c => c.index === classIndex) ?? null
    const saveKeys = (cls?.saving_throws ?? []).map(n => ATTR_NAME_TO_KEY[n]).filter(Boolean)
    const spellKey = SPELL_ABILITY_PT_TO_KEY[cls?.spellcasting_ability] ?? null
    const hitDice = cls?.hit_die ? `1d${cls.hit_die}` : '1d8'
    updateDraft({
      class: classIndex,
      chosenFeatures: {},
      bonusSpells: [],
      asiChoices: {},
      classEquipmentChoices: {},
      classEquipmentPicks: {},
      savingThrows: saveKeys,
      spellcastingAbility: spellKey,
      hitDice,
    })
  }

  function handleLevelChange(lvl) {
    updateDraft({ level: lvl, chosenFeatures: {}, bonusSpells: [], asiChoices: {} })
  }

  function handleFeatureChoice(choiceId, value, _multiSelect) {
    updateDraft({
      chosenFeatures: { ...(draft.chosenFeatures ?? {}), [choiceId]: value },
      bonusSpells: [],
    })
  }

  function handleASIChoice(level, choice) {
    updateDraft({ asiChoices: { ...(draft.asiChoices ?? {}), [level]: choice } })
  }

  return (
    <div className="flex flex-col gap-4">
      <ClassPicker
        classes={classesForOffer}
        classIndex={draft.class}
        level={draft.level}
        onClassChange={handleClassChange}
        onLevelChange={handleLevelChange}
      />

      {selectedClass && (
        <>
          <p className="text-xs font-display tracking-widest uppercase text-ink-500 mt-2">
            {draft.level === 1 ? 'Características da Classe' : `Progressão — Níveis 1 a ${draft.level}`}
          </p>

          <LevelProgressionList
            level={draft.level}
            progressionLevels={progressionLevels}
            leveledChoices={leveledChoices}
            draft={draft}
            onFeatureChoice={handleFeatureChoice}
            onASIChoice={handleASIChoice}
            allowFeats={draft.settings?.allowFeats ?? false}
            feats={feats}
            attributesReady={attributesReady}
          />

          {bonusCantripsNeeded > 0 && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
              <p className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
                Truques de Bônus
              </p>
              <CantripsGrantPicker
                needed={bonusCantripsNeeded}
                chosen={draft.bonusSpells ?? []}
                onChosenChange={spells => updateDraft({ bonusSpells: spells })}
              />
            </div>
          )}

          <ClassStatsCards
            classData={selectedClass}
            level={draft.level}
            conMod={conMod}
            savingThrows={draft.savingThrows ?? []}
          />

          <ClassEquipment
            draft={draft} updateDraft={updateDraft}
            selectedClass={selectedClass}
            classEquipmentData={classEquipment[draft.class] ?? null}
            weaponsArmor={weaponsArmor}
          />

          {allowMulticlass && (
            <div
              className={[
                'border-2 rounded-sm p-3 flex flex-col gap-2 transition-opacity',
                attributesReady
                  ? 'border-parchment-600 bg-parchment-100'
                  : 'border-parchment-600/50 bg-parchment-100/40',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-display tracking-widest uppercase text-ink-500">
                  Multiclasse
                </p>
                <button
                  type="button"
                  onClick={() => setMcModalOpen(true)}
                  disabled={!attributesReady}
                  title={attributesReady ? undefined : 'Defina Atributos primeiro — multiclasse exige pré-requisitos (ex: 13 FOR pra Guerreiro)'}
                  className="text-xs font-display tracking-wide text-ink-500 hover:text-ink-600 border-2 border-parchment-600 hover:border-ink-300 px-2.5 py-1 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-parchment-600 disabled:hover:text-ink-500"
                >+ Adicionar classe</button>
              </div>

              {!attributesReady && (
                <p className="text-xs ink-italic text-ink-300 leading-relaxed">
                  🔒 Disponível após definir <span className="font-semibold">Atributos</span> — multiclasse exige pré-requisitos (ex: 13 FOR pra Guerreiro, 13 CAR pra Bardo).
                </p>
              )}

              {attributesReady && multiclasses.length === 0 && (
                <p className="text-xs italic text-ink-300">Nenhuma classe secundária.</p>
              )}

              {multiclasses.map((mc, idx) => {
                const cls = classes.find(c => c.index === mc.class)
                // Calcula choices/progressão pra ESTA multiclasse, usando
                // as escolhas que vivem no objeto mc (e não no draft do primário).
                const mcLeveledChoices = getLeveledChoices(
                  classChoices[mc.class],
                  mc.level,
                  mc.chosenFeatures ?? {},
                )
                const mcProgressionLevels = getProgressionLevels(
                  classProgression[mc.class],
                  mc.level,
                )
                // Draft "sintético" pra LevelProgressionList ler o estado certo.
                // Mantém atributos/baseAttributes do draft real (ASIs precisam),
                // mas chosenFeatures/asiChoices vêm do mc.
                const mcDraft = {
                  ...draft,
                  chosenFeatures: mc.chosenFeatures ?? {},
                  asiChoices:     mc.asiChoices ?? {},
                }
                return (
                  <div key={idx} className="border-2 border-parchment-600 bg-parchment-50 rounded-sm px-3 py-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-display text-ink-500 flex-1">
                        {cls?.name ?? mc.class} <span className="text-ink-300">Nível {mc.level}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMulticlass(idx)}
                        aria-label={`Remover ${cls?.name ?? mc.class}`}
                        className="text-ink-300 hover:text-red-700 text-sm transition-colors"
                      >🗑</button>
                    </div>
                    {/* Pickers de subclasse/ASI desta multiclasse — antes
                        ausentes (jogador não conseguia escolher Origem do
                        Feiticeiro, Domínio do Clérigo etc. via MC). */}
                    <LevelProgressionList
                      level={mc.level}
                      progressionLevels={mcProgressionLevels}
                      leveledChoices={mcLeveledChoices}
                      draft={mcDraft}
                      onFeatureChoice={(choiceId, value) => handleMcFeatureChoice(idx, choiceId, value)}
                      onASIChoice={(level, choice) => handleMcASIChoice(idx, level, choice)}
                      allowFeats={draft.settings?.allowFeats ?? false}
                      feats={feats}
                      attributesReady={attributesReady}
                    />

                    {/* Perícia(s) concedida(s) pela multiclasse (Bardo/Ladino/
                        Patrulheiro — PHB p.164). Antes não havia onde escolher. */}
                    <MulticlassSkillPicker
                      cls={cls}
                      mc={mc}
                      draft={draft}
                      multiclasses={multiclasses}
                      mcIdx={idx}
                      onChange={skills => updateMulticlassAt(idx, { chosenSkills: skills })}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <MulticlassModal
        open={mcModalOpen}
        draft={draft}
        classes={classesForOffer}
        multiclassData={multiclassData}
        onAdd={handleAddMulticlass}
        onCancel={() => setMcModalOpen(false)}
      />
    </div>
  )
}

/**
 * Seletor de perícia(s) concedida(s) por uma multiclasse (PHB p.164).
 * Só aparece quando a classe concede perícias (`mc.proficiencies.skills > 0`).
 * As opções vêm da lista da classe (`skill_choices.from`); "qualquer ..."
 * (ex: Bardo) libera as 18. Perícias já proficientes por outra fonte são
 * desabilitadas — não é possível ganhar a mesma perícia duas vezes.
 */
function MulticlassSkillPicker({ cls, mc, draft, multiclasses, mcIdx, onChange }) {
  const limit = mc.proficiencies?.skills ?? 0
  if (limit <= 0) return null

  const fromNames = cls?.skill_choices?.from ?? []
  const anySkill = fromNames.some(n => /qualquer/i.test(n))
  const options = SKILLS.filter(s => anySkill || fromNames.includes(s.name))
  const chosen = mc.chosenSkills ?? []
  const ownedElsewhere = new Set([
    ...(draft.chosenSkills ?? []),
    ...(draft.backgroundSkills ?? []),
    ...(draft.racialSkills ?? []),
    ...multiclasses.flatMap((m, i) => (i === mcIdx ? [] : (m.chosenSkills ?? []))),
  ])
  const atLimit = chosen.length >= limit

  function toggle(key) {
    if (chosen.includes(key)) onChange(chosen.filter(k => k !== key))
    else if (!atLimit && !ownedElsewhere.has(key)) onChange([...chosen, key])
  }

  return (
    <div className="border-t border-parchment-600/60 pt-2 mt-1">
      <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-1.5">
        Perícias da classe — escolher {limit} <span className="text-ink-200">({chosen.length}/{limit})</span>
      </p>
      <div className="grid grid-cols-2 gap-1">
        {options.map(s => {
          const isChosen = chosen.includes(s.key)
          const owned = ownedElsewhere.has(s.key)
          const disabled = owned || (!isChosen && atLimit)
          return (
            <button
              type="button"
              key={s.key}
              onClick={() => toggle(s.key)}
              disabled={disabled}
              title={owned ? 'Já proficiente por outra fonte' : undefined}
              className={[
                'flex items-center gap-1.5 px-2 py-1 rounded-sm border-2 text-xs font-display text-left transition-colors',
                isChosen
                  ? 'border-ink-500 bg-parchment-200 text-ink-500'
                  : disabled
                  ? 'border-parchment-600 bg-parchment-50 text-ink-200 opacity-40 cursor-not-allowed'
                  : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300 cursor-pointer',
              ].join(' ')}
            >
              <span className={[
                'w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center shrink-0',
                isChosen ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
              ].join(' ')}>
                {isChosen && <span className="text-parchment-50 text-[10px]">✓</span>}
              </span>
              <span className="flex-1">{s.name}{owned ? ' 🎒' : ''}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
