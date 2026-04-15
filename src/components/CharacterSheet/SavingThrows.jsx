import { ABILITY_SCORES, formatModifier, calculateSavingThrow, getProficiencyBonus } from '../../utils/calculations'

export function SavingThrows({ attributes, proficiencies, level, onToggle }) {
  const profBonus = getProficiencyBonus(level)

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Salvaguardas</h3>
      <div className="space-y-1">
        {ABILITY_SCORES.map(({ key, abbr, name }) => {
          const proficient = proficiencies.savingThrows.includes(key)
          const mod = calculateSavingThrow(attributes[key], profBonus, proficient)
          return (
            <div key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={proficient}
                onChange={() => onToggle(key)}
                className="accent-amber-400 cursor-pointer"
              />
              <span className="w-8 text-sm font-bold text-amber-300">{formatModifier(mod)}</span>
              <span className="text-sm text-gray-300">{abbr} <span className="text-gray-500 text-xs">({name})</span></span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
