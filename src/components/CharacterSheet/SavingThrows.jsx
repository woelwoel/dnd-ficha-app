import { memo } from 'react'
import { ABILITY_SCORES, ATTR_NAME_TO_KEY, formatModifier, calculateSavingThrow, getModifier } from '../../utils/calculations'
import { Tooltip } from '../Tooltip'
import { RollButton } from '../DiceRoller/RollButton'

function SavingThrowsBase({ attributes, profBonus, classData }) {

  // Salvaguardas são definidas exclusivamente pela classe
  const classGranted = (classData?.saving_throws ?? [])
    .map(n => ATTR_NAME_TO_KEY[n])
    .filter(Boolean)

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-1">
        Salvaguardas
      </h3>
      <p className="text-[10px] text-gray-600 mb-3">Definidas pela classe — 🔒 proficiente</p>
      <div className="space-y-1">
        {ABILITY_SCORES.map(({ key, abbr, name }) => {
          const proficient   = classGranted.includes(key)
          const abilityMod   = getModifier(attributes[key])
          const mod          = calculateSavingThrow(attributes[key], profBonus, proficient)
          const notation     = `1d20${formatModifier(mod)}`
          const tooltipParts = [`${abbr} ${formatModifier(abilityMod)}`]
          if (proficient) tooltipParts.push(`Prof ${formatModifier(profBonus)}`)
          tooltipParts.push(`= ${formatModifier(mod)}`)
          const tooltip = tooltipParts.join(' + ').replace('+ =', '=')

          return (
            <div key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={proficient}
                disabled
                readOnly
                className={`${proficient ? 'accent-amber-600' : ''} cursor-not-allowed opacity-70`}
              />
              <Tooltip content={tooltip} position="top">
                <span className={`w-8 text-sm font-bold cursor-help ${proficient ? 'text-amber-300' : 'text-gray-500'}`}>
                  {formatModifier(mod)}
                </span>
              </Tooltip>
              <RollButton
                notation={notation}
                label={`Salvaguarda — ${abbr}`}
                size="xs"
              />
              <span className={`text-sm ${proficient ? 'text-gray-200' : 'text-gray-500'}`}>
                {abbr}{' '}
                <span className="text-xs opacity-60">({name})</span>
                {proficient && <span className="ml-1 text-amber-600 text-xs">🔒</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const SavingThrows = memo(SavingThrowsBase)
