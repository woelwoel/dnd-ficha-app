import { useState } from 'react'
import { RacePicker } from './race/RacePicker'
import { DraconicAncestryPicker } from './race/DraconicAncestryPicker'
import { HighElfCantripPicker } from './race/HighElfCantripPicker'
import { FreeAbilityPicker } from './race/FreeAbilityPicker'
import { RacialSkillPicker } from './race/RacialSkillPicker'
import { RaceBonusPreview } from './race/RaceBonusPreview'
import { FeatPicker } from './FeatPicker'
import { computeBonuses, getRaceRequirements } from './race-helpers'
import { VARIANT_HUMAN_SUBRACE } from '../../../domain/racialBonuses'
import { RACE_LANGUAGES, DND_LANGUAGES, RACE_EXTRA_LANGUAGES, ABILITY_SCORES } from '../../../utils/calculations'

// Tasha's "Customizando sua Origem": distribuições válidas pro override de
// atributo racial — +2/+1 (dois atributos distintos) ou +1/+1/+1 (três).
const ASI_MODES = {
  '2-1': { slots: [{ label: 'Atributo +2', amount: 2 }, { label: 'Atributo +1', amount: 1 }] },
  '1-1-1': {
    slots: [
      { label: 'Atributo +1 (1)', amount: 1 },
      { label: 'Atributo +1 (2)', amount: 1 },
      { label: 'Atributo +1 (3)', amount: 1 },
    ],
  },
}

// Reconstrói a seleção local (por slot) a partir de um override já salvo no
// draft, pra re-renders/voltar-pro-passo manterem a escolha visível.
function initialSelectionFromOverride(override, mode) {
  const entries = Object.entries(override ?? {})
  const slots = ASI_MODES[mode].slots
  if (!entries.length || entries.length !== slots.length) return slots.map(() => '')
  // +2/+1: a primeira entrada com bonus 2 vai pro slot 0, o resto na ordem.
  if (mode === '2-1') {
    const two = entries.find(([, v]) => v === 2)
    const one = entries.find(([, v]) => v === 1)
    return [two?.[0] ?? '', one?.[0] ?? '']
  }
  return entries.map(([k]) => k)
}

function detectModeFromOverride(override) {
  const values = Object.values(override ?? {}).sort((a, b) => b - a)
  if (values.length === 2 && values[0] === 2 && values[1] === 1) return '2-1'
  if (values.length === 3 && values.every(v => v === 1)) return '1-1-1'
  return '2-1'
}

export function RaceBlock({ draft, updateDraft, races, feats = [] }) {
  const selectedRace    = races.find(r => r.index === draft.race) ?? null
  const selectedSubrace = selectedRace?.subraces?.find(s => s.index === draft.subrace) ?? null
  const reqs = getRaceRequirements(draft, selectedRace, selectedSubrace)

  const flexibleAsi = draft.settings?.flexibleRacialAsi === true
  const [asiMode, setAsiMode] = useState(() => detectModeFromOverride(draft.racialAsiOverride))
  const [asiSelection, setAsiSelection] = useState(() => initialSelectionFromOverride(draft.racialAsiOverride, asiMode))

  function handleAsiModeChange(mode) {
    setAsiMode(mode)
    setAsiSelection(ASI_MODES[mode].slots.map(() => ''))
  }

  function handleAsiSlotChange(slotIndex, value) {
    const next = [...asiSelection]
    next[slotIndex] = value
    setAsiSelection(next)

    const slots = ASI_MODES[asiMode].slots
    const complete = next.every(Boolean)
    const distinct = new Set(next).size === next.length
    if (complete && distinct) {
      const override = {}
      next.forEach((key, i) => { override[key] = slots[i].amount })
      updateDraft({ racialAsiOverride: override, racialBonuses: override })
    }
  }

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

  // Tasha's "Customizando sua Origem": troca de um idioma fixo da raça por
  // outro padrão. value === '' remove a troca (mantém o idioma original).
  function handleLanguageSwapChange(originalLang, value) {
    const next = { ...(draft.racialLanguageOverride ?? {}) }
    if (value) {
      next[originalLang] = value
    } else {
      delete next[originalLang]
    }
    updateDraft({ racialLanguageOverride: next })
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
  // Tasha's "Customizando sua Origem": troca de idioma fixo por outro padrão.
  const racialLanguageOverride = draft.racialLanguageOverride ?? {}

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

      {!flexibleAsi && reqs.freeAbility > 0 && (
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

      {flexibleAsi && draft.race && (
        <fieldset className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3 flex flex-col gap-2">
          <legend className="px-2 text-xs font-display tracking-widest uppercase text-ink-500">
            Customizando sua Origem
          </legend>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-xs text-ink-500">
              <input
                type="radio"
                name="racial-asi-mode"
                aria-label="+2/+1"
                checked={asiMode === '2-1'}
                onChange={() => handleAsiModeChange('2-1')}
              />
              +2/+1
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink-500">
              <input
                type="radio"
                name="racial-asi-mode"
                aria-label="+1/+1/+1"
                checked={asiMode === '1-1-1'}
                onChange={() => handleAsiModeChange('1-1-1')}
              />
              +1/+1/+1
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ASI_MODES[asiMode].slots.map((slot, slotIndex) => {
              const otherChosen = asiSelection.filter((_, i) => i !== slotIndex)
              return (
                <div key={slotIndex}>
                  <label
                    htmlFor={`racial-asi-slot-${slotIndex}`}
                    className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1"
                  >
                    {slot.label}
                  </label>
                  <select
                    id={`racial-asi-slot-${slotIndex}`}
                    aria-label={slot.label}
                    className="w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 focus:outline-none focus:border-ink-300"
                    value={asiSelection[slotIndex] ?? ''}
                    onChange={e => handleAsiSlotChange(slotIndex, e.target.value)}
                  >
                    <option value="">—</option>
                    {ABILITY_SCORES.filter(a => !otherChosen.includes(a.key)).map(a => (
                      <option key={a.key} value={a.key}>{a.abbr} — {a.name}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </fieldset>
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

          {flexibleAsi && racialLangs.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              {racialLangs.map(lang => {
                const otherChosen = Object.entries(racialLanguageOverride)
                  .filter(([orig]) => orig !== lang)
                  .map(([, novo]) => novo)
                const options = DND_LANGUAGES.filter(
                  l => l !== lang && !otherChosen.includes(l)
                )
                const label = `Trocar ${lang}`
                return (
                  <div key={lang}>
                    <label
                      htmlFor={`racial-language-swap-${lang}`}
                      className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1"
                    >
                      {label}
                    </label>
                    <select
                      id={`racial-language-swap-${lang}`}
                      aria-label={label}
                      className="w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 focus:outline-none focus:border-ink-300"
                      value={racialLanguageOverride[lang] ?? ''}
                      onChange={e => handleLanguageSwapChange(lang, e.target.value)}
                    >
                      <option value="">(manter)</option>
                      {options.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}

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

      {!flexibleAsi && selectedRace && (
        <RaceBonusPreview
          bonuses={fixedBonuses}
          hasFreeChoice={reqs.freeAbility > 0}
        />
      )}
    </div>
  )
}
