import { ABILITY_SCORES, ATTR_NAME_TO_KEY, formatModifier, calculateSavingThrow, getProficiencyBonus, getModifier } from '../../utils/calculations'
import { Tooltip } from '../Tooltip'

export function SavingThrows({ attributes, proficiencies, level, onToggle, classData }) {
  const profBonus = getProficiencyBonus(level)

  // Salvaguardas garantidas pela classe (sempre proficientes, checkbox travado)
  const classGranted = (classData?.saving_throws ?? [])
    .map(n => ATTR_NAME_TO_KEY[n])
    .filter(Boolean)

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">
        Salvaguardas
        {classData && (
          <span className="ml-2 text-gray-600 font-normal normal-case text-xs">
            🔒 = concedida pela classe
          </span>
        )}
      </h3>
      <div className="space-y-1">
        {ABILITY_SCORES.map(({ key, abbr, name }) => {
          const isClassGranted = classGranted.includes(key)
          const proficient     = isClassGranted || proficiencies.savingThrows.includes(key)
          const abilityMod     = getModifier(attributes[key])
          const mod            = calculateSavingThrow(attributes[key], profBonus, proficient)
          const tooltipParts   = [`${abbr} ${formatModifier(abilityMod)}`]
          if (proficient) tooltipParts.push(`Prof ${formatModifier(profBonus)}`)
          tooltipParts.push(`= ${formatModifier(mod)}`)
          if (isClassGranted) tooltipParts.push('(classe)')
          const tooltip = tooltipParts.join(' + ').replace('+ =', '=')

          return (
            <div key={key} className="flex items-center gap-2">
              <Tooltip content={isClassGranted ? `Salvaguarda da classe` : undefined} position="top">
                <input
                  type="checkbox"
                  checked={proficient}
                  disabled={isClassGranted}
                  onChange={() => !isClassGranted && onToggle(key)}
                  className={`cursor-pointer ${isClassGranted ? 'accent-amber-600 opacity-80 cursor-not-allowed' : 'accent-amber-400'}`}
                />
              </Tooltip>
              <Tooltip content={tooltip} position="top">
                <span className={`w-8 text-sm font-bold cursor-help ${isClassGranted ? 'text-amber-200' : 'text-amber-300'}`}>
                  {formatModifier(mod)}
                </span>
              </Tooltip>
              <span className="text-sm text-gray-300">
                {abbr}{' '}
                <span className="text-gray-500 text-xs">({name})</span>
                {isClassGranted && <span className="ml-1 text-amber-600 text-xs">🔒</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
