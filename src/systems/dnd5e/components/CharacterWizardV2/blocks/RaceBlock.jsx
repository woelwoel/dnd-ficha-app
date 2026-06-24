import { RacePicker } from './race/RacePicker'
import { DraconicAncestryPicker } from './race/DraconicAncestryPicker'
import { HighElfCantripPicker } from './race/HighElfCantripPicker'
import { FreeAbilityPicker } from './race/FreeAbilityPicker'
import { RacialSkillPicker } from './race/RacialSkillPicker'
import { RaceBonusPreview } from './race/RaceBonusPreview'
import { FeatPicker } from './FeatPicker'
import { computeBonuses, getRaceRequirements } from './race-helpers'
import { VARIANT_HUMAN_SUBRACE } from '../../../domain/racialBonuses'
import { RACE_LANGUAGES, DND_LANGUAGES, RACE_EXTRA_LANGUAGES } from '../../../../../utils/calculations'

export function RaceBlock({ draft, updateDraft, races, feats = [] }) {
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
      racialFeat: null,
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
      racialFeat: null,
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

  function handleExtraLanguageChange(slotIndex, value) {
    const prev = draft.racialLanguages ?? []
    const next = [...prev]
    if (value) {
      next[slotIndex] = value
    } else {
      next.splice(slotIndex, 1)
    }
    updateDraft({ racialLanguages: next.filter(Boolean) })
  }

  // Variante humano substitui o +1-em-tudo do humano base por escolhas livres.
  const isVariantHuman = selectedSubrace?.index === VARIANT_HUMAN_SUBRACE
  const fixedBonuses = [
    ...(isVariantHuman ? [] : (selectedRace?.ability_bonuses ?? [])),
    ...(selectedSubrace?.ability_bonuses ?? []),
  ].filter(b => !b.ability.includes('escolha'))

  // Idiomas concedidos pela raça + idiomas extras à escolha (ex: Humano, Meio-Elfo).
  const racialLangs = draft.race ? (RACE_LANGUAGES[draft.race] ?? []) : []
  const extraLanguageCount = draft.race ? (RACE_EXTRA_LANGUAGES[draft.race] ?? 0) : 0
  const chosenExtraLanguages = draft.racialLanguages ?? []

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

      {reqs.racialFeat && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-display tracking-widest uppercase text-ink-500">
            Talento <span className="text-red-700">*</span>
            <span className="ml-1.5 normal-case tracking-normal italic text-ink-300">
              (Humano Variante — escolha 1)
            </span>
          </p>
          <FeatPicker
            feats={feats}
            value={draft.racialFeat ?? null}
            onChange={f => updateDraft({ racialFeat: f })}
          />
        </div>
      )}

      {draft.race && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-display tracking-widest uppercase text-ink-500">
            Idiomas
          </p>
          <div className="flex flex-wrap gap-2">
            {racialLangs.map(lang => (
              <span
                key={lang}
                className="text-xs font-display bg-parchment-200 border-2 border-parchment-600 px-2.5 py-1 rounded-sm text-ink-500"
              >
                {lang}
              </span>
            ))}
          </div>

          {extraLanguageCount > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              {Array.from({ length: extraLanguageCount }).map((_, slotIndex) => {
                const otherChosen = chosenExtraLanguages.filter((_, i) => i !== slotIndex)
                const options = DND_LANGUAGES.filter(
                  lang => !racialLangs.includes(lang) && !otherChosen.includes(lang)
                )
                const label = extraLanguageCount > 1 ? `Idioma extra ${slotIndex + 1}` : 'Idioma extra'
                return (
                  <div key={slotIndex}>
                    <label
                      htmlFor={`racial-extra-language-${slotIndex}`}
                      className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1"
                    >
                      {label}
                    </label>
                    <select
                      id={`racial-extra-language-${slotIndex}`}
                      aria-label={label}
                      className="w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 focus:outline-none focus:border-ink-300"
                      value={chosenExtraLanguages[slotIndex] ?? ''}
                      onChange={e => handleExtraLanguageChange(slotIndex, e.target.value)}
                    >
                      <option value="">—</option>
                      {options.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}
        </div>
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
