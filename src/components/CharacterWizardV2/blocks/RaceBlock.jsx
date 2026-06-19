import { RacePicker } from './race/RacePicker'
import { DraconicAncestryPicker } from './race/DraconicAncestryPicker'
import { HighElfCantripPicker } from './race/HighElfCantripPicker'
import { FreeAbilityPicker } from './race/FreeAbilityPicker'
import { RacialSkillPicker } from './race/RacialSkillPicker'
import { RaceBonusPreview } from './race/RaceBonusPreview'
import { computeBonuses, getRaceRequirements } from './race-helpers'
import { VARIANT_HUMAN_SUBRACE } from '../../../domain/racialBonuses'

export function RaceBlock({ draft, updateDraft, races }) {
  const selectedRace    = races.find(r => r.index === draft.race) ?? null
  const selectedSubrace = selectedRace?.subraces?.find(s => s.index === draft.subrace) ?? null
  const reqs = getRaceRequirements(draft, selectedRace, selectedSubrace)

  function handleRaceChange(raceIndex) {
    const race = races.find(r => r.index === raceIndex)
    updateDraft({
      race: raceIndex,
      subrace: '',
      racialBonuses: computeBonuses(race, null, []),
      racialAbilityChoices: [],
      racialSkills: [],
      draconicAncestry: '',
      racialCantrip: '',
      speed: race?.speed ?? 9, // deslocamento base da raça, em metros
    })
  }

  function handleSubraceChange(subraceIndex) {
    const subrace = selectedRace?.subraces?.find(s => s.index === subraceIndex)
    updateDraft({
      subrace: subraceIndex,
      racialBonuses: computeBonuses(selectedRace, subrace, []),
      racialAbilityChoices: [],
      racialSkills: [],
      racialCantrip: '',
    })
  }

  function handleAbilityChoiceToggle(key, max) {
    const prev = draft.racialAbilityChoices ?? []
    const next = prev.includes(key)
      ? prev.filter(k => k !== key)
      : prev.length < max ? [...prev, key] : prev
    updateDraft({
      racialAbilityChoices: next,
      racialBonuses: computeBonuses(selectedRace, selectedSubrace, next),
    })
  }

  function handleSkillToggle(key, max) {
    const prev = draft.racialSkills ?? []
    const next = prev.includes(key)
      ? prev.filter(k => k !== key)
      : prev.length < max ? [...prev, key] : prev
    updateDraft({ racialSkills: next })
  }

  // Variante humano substitui o +1-em-tudo do humano base por escolhas livres.
  const isVariantHuman = selectedSubrace?.index === VARIANT_HUMAN_SUBRACE
  const fixedBonuses = [
    ...(isVariantHuman ? [] : (selectedRace?.ability_bonuses ?? [])),
    ...(selectedSubrace?.ability_bonuses ?? []),
  ].filter(b => !b.ability.includes('escolha'))

  return (
    <div className="flex flex-col gap-4">
      <RacePicker
        races={races}
        race={draft.race}
        subrace={draft.subrace}
        onRaceChange={handleRaceChange}
        onSubraceChange={handleSubraceChange}
      />

      {reqs.draconicAncestry && (
        <DraconicAncestryPicker
          value={draft.draconicAncestry}
          onChange={v => updateDraft({ draconicAncestry: v })}
        />
      )}

      {reqs.highElfCantrip && (
        <HighElfCantripPicker
          value={draft.racialCantrip}
          onChange={v => updateDraft({ racialCantrip: v })}
        />
      )}

      {reqs.freeAbility > 0 && (
        <FreeAbilityPicker
          label={reqs.freeAbilityExclude
            ? `Escolha ${reqs.freeAbility} atributos (exceto Carisma) para +1 cada`
            : `Escolha ${reqs.freeAbility} atributos para +1 cada`}
          count={reqs.freeAbility}
          chosen={draft.racialAbilityChoices ?? []}
          exclude={reqs.freeAbilityExclude}
          onToggle={k => handleAbilityChoiceToggle(k, reqs.freeAbility)}
        />
      )}

      {reqs.racialSkills > 0 && (
        <RacialSkillPicker
          label={`Escolha ${reqs.racialSkills} perícia${reqs.racialSkills > 1 ? 's' : ''}`}
          count={reqs.racialSkills}
          chosen={draft.racialSkills ?? []}
          onToggle={k => handleSkillToggle(k, reqs.racialSkills)}
        />
      )}

      {selectedRace && (
        <RaceBonusPreview
          bonuses={fixedBonuses}
          hasFreeChoice={reqs.freeAbility > 0}
        />
      )}
    </div>
  )
}
