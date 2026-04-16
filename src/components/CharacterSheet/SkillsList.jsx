import { SKILLS, ABILITY_SCORES, formatModifier, calculateSkillModifier, getProficiencyBonus, getModifier } from '../../utils/calculations'
import { Tooltip } from '../Tooltip'

export function SkillsList({ attributes, proficiencies, level, onToggle }) {
  const profBonus = getProficiencyBonus(level)

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">
        Perícias
        <span className="ml-2 text-gray-500 font-normal normal-case text-xs">
          Bônus de proficiência: {formatModifier(profBonus)}
        </span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {SKILLS.map(({ key, name, ability, abbr }) => {
          const proficient   = proficiencies.skills.includes(key)
          const abilityMod   = getModifier(attributes[ability])
          const mod          = calculateSkillModifier(attributes[ability], profBonus, proficient, false)
          // Tooltip explica a fórmula de cálculo
          const abbrName = ABILITY_SCORES.find(a => a.key === ability)?.abbr ?? abbr
          const tooltipParts = [`${abbrName} ${formatModifier(abilityMod)}`]
          if (proficient) tooltipParts.push(`Prof ${formatModifier(profBonus)}`)
          tooltipParts.push(`= ${formatModifier(mod)}`)
          const tooltip = tooltipParts.join(' + ').replace('+ =', '=')

          return (
            <div key={key} className="flex items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={proficient}
                onChange={() => onToggle(key)}
                className="accent-amber-400 cursor-pointer flex-shrink-0"
              />
              <Tooltip content={tooltip} position="top">
                <span className="w-8 text-sm font-bold text-amber-300 text-right flex-shrink-0 cursor-help">
                  {formatModifier(mod)}
                </span>
              </Tooltip>
              <span className="text-sm text-gray-300 leading-tight">
                {name}{' '}
                <span className="text-gray-500 text-xs">({abbr})</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
