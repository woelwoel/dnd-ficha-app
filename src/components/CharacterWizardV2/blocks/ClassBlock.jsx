import { ClassPicker } from './class/ClassPicker'
import { LevelProgressionList } from './class/LevelProgressionList'
import { ClassStatsCards } from './class/ClassStatsCards'
import { CantripsGrantPicker } from '../../CantripsGrantPicker'
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
}) {
  const selectedClass = classes.find(c => c.index === draft.class) ?? null

  const leveledChoices = getLeveledChoices(classChoices[draft.class], draft.level)
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

          <div className="border-2 border-dashed border-parchment-600 bg-parchment-50 rounded-sm p-3 text-center">
            <p className="text-xs italic text-ink-300">Equipamento: PR 3b (em construção)</p>
          </div>
        </>
      )}
    </div>
  )
}
