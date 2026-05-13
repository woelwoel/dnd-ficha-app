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
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg p-4"
      style={{ boxShadow: 'var(--shadow-parchment-sm)' }}>
      <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest mb-1 border-b border-parchment-600 pb-1">
        Salvaguardas
      </h3>
      <p className="text-[10px] ink-italic mb-3 mt-1">Definidas pela classe — 🔒 proficiente</p>
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
                className={`${proficient ? 'accent-ink-500' : ''} cursor-not-allowed opacity-70`}
              />
              <Tooltip content={tooltip} position="top">
                <span className={`w-8 text-sm font-bold cursor-help ${proficient ? 'text-ink-500' : 'text-ink-200'}`}>
                  {formatModifier(mod)}
                </span>
              </Tooltip>
              <RollButton
                notation={notation}
                label={`Salvaguarda — ${abbr}`}
                size="xs"
              />
              <span className={`text-sm ${proficient ? 'text-ink-500 font-semibold' : 'text-ink-200'}`}>
                {abbr}{' '}
                <span className="text-xs ink-italic">({name})</span>
                {proficient && <span className="ml-1 text-ink-300 text-xs">🔒</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const SavingThrows = memo(SavingThrowsBase)
