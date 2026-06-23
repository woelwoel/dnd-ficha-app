import {
  SKILLS, ABILITY_SCORES, getProficiencyBonus,
  calculateSkillModifier, formatModifier,
} from '../../../../../utils/calculations'

export function SkillsBlock({ draft, updateDraft, classData }) {
  const limit = classData?.skill_choices?.count ?? null
  const availableList = classData?.skill_choices?.from ?? []
  const bgSkills = draft.backgroundSkills ?? []
  const chosen = draft.chosenSkills ?? []
  const selectedCount = chosen.length
  const atLimit = limit !== null && selectedCount >= limit

  const finalAttrs = {}
  for (const { key } of ABILITY_SCORES) {
    const base = draft.baseAttributes?.[key] ?? 10
    const bonus = draft.racialBonuses?.[key] ?? 0
    finalAttrs[key] = base > 0 ? base + bonus : 10
  }
  // Nível total (primária + multiclasses) — o bônus de proficiência usa o
  // nível total do personagem (PHB p.164), não só o da classe primária.
  const totalLevel = (draft.level ?? 1)
    + (draft.multiclasses ?? []).reduce((s, mc) => s + (mc.level ?? 0), 0)
  const profBonus = getProficiencyBonus(totalLevel)

  function toggle(key) {
    if (chosen.includes(key)) {
      updateDraft({ chosenSkills: chosen.filter(k => k !== key) })
    } else if (!atLimit) {
      updateDraft({ chosenSkills: [...chosen, key] })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs italic text-ink-300">
        {limit !== null
          ? `Escolha ${limit} perícias entre as opções da sua classe.`
          : 'Escolha uma classe primeiro para ver as perícias disponíveis.'}
      </p>

      {limit !== null && (
        <div className={[
          'flex items-center justify-between px-4 py-2 rounded-sm border-2 font-display',
          atLimit ? 'border-amber-700 bg-amber-50' : 'border-parchment-600 bg-parchment-100',
        ].join(' ')}>
          <span className="text-sm text-ink-500">Perícias selecionadas</span>
          <span className="text-xl text-ink-500">{selectedCount}/{limit}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {SKILLS.map(({ key, name, ability, abbr }) => {
          const isClassOption = availableList.includes(name)
          const isBgSkill = bgSkills.includes(key)
          const isChosen = chosen.includes(key)
          const proficient = isChosen || isBgSkill
          const mod = calculateSkillModifier(finalAttrs[ability], profBonus, proficient, false)
          const canClick = isClassOption && !isBgSkill && (!atLimit || isChosen)

          return (
            <div
              key={key}
              onClick={() => canClick && toggle(key)}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-sm border-2 transition-colors',
                isBgSkill
                  ? 'border-parchment-600 bg-parchment-200 cursor-default'
                  : isChosen
                  ? 'border-ink-500 bg-parchment-200 cursor-pointer'
                  : canClick
                  ? 'border-parchment-600 bg-parchment-50 hover:border-ink-300 cursor-pointer'
                  : 'border-parchment-600 bg-parchment-50 opacity-40 cursor-not-allowed',
              ].join(' ')}
            >
              {isBgSkill ? (
                <span className="text-sm shrink-0" title="Antecedente">🎒</span>
              ) : (
                <span className={[
                  'w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0',
                  isChosen ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                ].join(' ')}>
                  {isChosen && <span className="text-parchment-50 text-xs">✓</span>}
                </span>
              )}
              <span className={[
                'text-sm font-display flex-1',
                proficient ? 'text-ink-500' : 'text-ink-300',
              ].join(' ')}>
                {name}
                <span className="text-ink-200 text-xs ml-1">({abbr})</span>
              </span>
              <span className={[
                'text-xs font-display shrink-0',
                proficient ? 'text-ink-500' : 'text-ink-200',
              ].join(' ')}>
                {formatModifier(mod)}
              </span>
            </div>
          )
        })}
      </div>

      {bgSkills.length > 0 && (
        <p className="text-xs italic text-ink-300">
          🎒 = Concedida pelo antecedente (não conta pro limite)
        </p>
      )}
    </div>
  )
}
