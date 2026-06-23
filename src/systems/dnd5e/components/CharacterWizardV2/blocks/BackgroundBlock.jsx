import { SKILLS, parseBackgroundEquipment } from '../../../../../utils/calculations'

const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

export function BackgroundBlock({ draft, updateDraft, backgrounds }) {
  const selectedBg = backgrounds.find(b => b.index === draft.background)

  function handleBackgroundChange(bgIndex) {
    const bg = backgrounds.find(b => b.index === bgIndex)
    const bgSkillKeys = (bg?.skill_proficiencies ?? [])
      .map(name => SKILLS.find(s => s.name === name)?.key)
      .filter(Boolean)
    const { items, gold } = parseBackgroundEquipment(bg?.equipment)
    const cleanedChosenSkills = (draft.chosenSkills ?? []).filter(k => !bgSkillKeys.includes(k))
    updateDraft({
      background: bgIndex,
      backgroundSkills: bgSkillKeys,
      backgroundItems: items,
      backgroundGold: gold,
      chosenSkills: cleanedChosenSkills,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="background-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Antecedente <span className="text-red-700">*</span>
        </label>
        <select
          id="background-select"
          value={draft.background ?? ''}
          onChange={e => handleBackgroundChange(e.target.value)}
          className={fieldCls}
        >
          <option value="">Escolher antecedente...</option>
          {backgrounds.map(b => (
            <option key={b.index} value={b.index}>{b.name}</option>
          ))}
        </select>
      </div>

      {selectedBg && (
        <>
          {(draft.backgroundSkills?.length ?? 0) > 0 && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
              <p className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
                Perícias concedidas
              </p>
              <div className="flex flex-wrap gap-2">
                {draft.backgroundSkills.map(key => {
                  const skill = SKILLS.find(s => s.key === key)
                  return (
                    <span key={key} className="flex items-center gap-1.5 text-xs font-display bg-parchment-50 border-2 border-parchment-600 px-2.5 py-1 rounded-sm text-ink-500">
                      🎒 {skill?.name ?? key}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {selectedBg.tool_proficiencies?.length > 0 && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-0.5">Ferramentas</p>
              <p className="text-sm text-ink-500">{selectedBg.tool_proficiencies.join(', ')}</p>
            </div>
          )}
          {selectedBg.languages && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-0.5">Idiomas</p>
              <p className="text-sm text-ink-500">{selectedBg.languages}</p>
            </div>
          )}
          {selectedBg.equipment && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-0.5">Equipamento</p>
              <p className="text-sm text-ink-500 leading-relaxed">{selectedBg.equipment}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
