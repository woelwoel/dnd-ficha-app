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
import { SPELL_ABILITY_PT_TO_KEY } from '../../../utils/calculations'

const ATTR_NAME_TO_KEY = {
  'Força': 'str', 'Destreza': 'dex', 'Constituição': 'con',
  'Inteligência': 'int', 'Sabedoria': 'wis', 'Carisma': 'cha',
}

export function ClassBlock({
  draft, updateDraft, classes, classChoices = {}, classProgression = {}, feats = [],
  classEquipment = {}, weaponsArmor = {}, multiclassData = {},
}) {
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
        classes={classes}
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
        classes={classes}
        multiclassData={multiclassData}
        onAdd={handleAddMulticlass}
        onCancel={() => setMcModalOpen(false)}
      />
    </div>
  )
}
