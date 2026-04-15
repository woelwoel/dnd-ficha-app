import { formatModifier, getProficiencyBonus, calculateInitiative, getModifier } from '../../utils/calculations'
import { FormFieldError } from '../FormFieldError'

export function CombatStats({ combat, attributes, level, onUpdateCombat, suggestedAC, suggestedMaxHp, errors = {} }) {
  const profBonus = getProficiencyBonus(level)
  const initiative = calculateInitiative(attributes.dex)

  function handleHpChange(field, value) {
    const num = parseInt(value, 10)
    if (!isNaN(num)) onUpdateCombat(field, Math.max(0, num))
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Combate</h3>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatBox label="Classe de Armadura" value={combat.armorClass} editable
          fieldId="field-armorClass"
          errId="err-armorClass"
          error={errors.armorClass}
          onChange={v => onUpdateCombat('armorClass', Math.max(0, parseInt(v) || 0))}
          hint={suggestedAC !== undefined && suggestedAC !== combat.armorClass
            ? { label: `Sugerida: ${suggestedAC}`, onApply: () => onUpdateCombat('armorClass', suggestedAC) }
            : null}
        />
        <StatBox label="Iniciativa" value={formatModifier(initiative)} />
        <StatBox label="Velocidade" value={`${combat.speed}ft`} editable
          onChange={v => onUpdateCombat('speed', Math.max(0, parseInt(v) || 0))} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatBox label="Bônus de Proficiência" value={formatModifier(profBonus)} />
        <StatBox label="Dado de Vida" value={combat.hitDice} />
      </div>

      {/* HP Tracker */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-gray-400">Pontos de Vida</label>
            <span className="text-xs text-gray-500">Máx: {combat.maxHp}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleHpChange('currentHp', combat.currentHp - 1)}
              className="w-8 h-8 rounded bg-red-900 hover:bg-red-700 text-white font-bold text-lg flex items-center justify-center"
            >−</button>
            <input
              id="field-currentHp"
              type="number"
              value={combat.currentHp}
              onChange={e => handleHpChange('currentHp', e.target.value)}
              aria-describedby={errors.currentHp ? 'err-currentHp' : undefined}
              className={`flex-1 text-center bg-gray-700 border rounded px-2 py-1 text-white font-bold text-xl focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                errors.currentHp
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-gray-500 focus:border-amber-400'
              }`}
            />
            <button
              onClick={() => handleHpChange('currentHp', combat.currentHp + 1)}
              className="w-8 h-8 rounded bg-green-900 hover:bg-green-700 text-white font-bold text-lg flex items-center justify-center"
            >+</button>
          </div>
          <FormFieldError id="err-currentHp" message={errors.currentHp} />
          {/* HP Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${combat.maxHp > 0 ? Math.min(100, (combat.currentHp / combat.maxHp) * 100) : 0}%`,
                backgroundColor: combat.currentHp > combat.maxHp * 0.5 ? '#22c55e' : combat.currentHp > combat.maxHp * 0.25 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400">PV Temporários</label>
          <input
            type="number"
            min={0}
            value={combat.tempHp}
            onChange={e => handleHpChange('tempHp', e.target.value)}
            className="w-full mt-1 text-center bg-gray-700 border border-gray-500 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400">PV Máximo</label>
            {suggestedMaxHp != null && suggestedMaxHp !== combat.maxHp && (
              <button
                onClick={() => onUpdateCombat('maxHp', suggestedMaxHp)}
                className="text-[10px] text-amber-500 hover:text-amber-300 underline"
                title="Aplica o PV calculado pela classe e CON"
              >
                Sugerido: {suggestedMaxHp}
              </button>
            )}
          </div>
          <input
            type="number"
            min={1}
            value={combat.maxHp}
            onChange={e => onUpdateCombat('maxHp', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full text-center bg-gray-700 border border-gray-500 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, editable, onChange, hint, fieldId, errId, error }) {
  return (
    <div className="flex flex-col items-center bg-gray-900 rounded p-2">
      <span className="text-xs text-gray-400 text-center mb-1 leading-tight">{label}</span>
      {editable ? (
        <input
          id={fieldId}
          type="number"
          value={typeof value === 'string' ? parseInt(value) || 0 : value}
          onChange={e => onChange(e.target.value)}
          aria-describedby={error ? errId : undefined}
          className={`w-full text-center text-xl font-bold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            error ? 'text-red-300' : 'text-white'
          }`}
        />
      ) : (
        <span className="text-xl font-bold text-white">{value}</span>
      )}
      {hint && (
        <button
          onClick={hint.onApply}
          className="text-[9px] text-amber-500 hover:text-amber-300 underline mt-0.5 leading-none"
        >
          {hint.label}
        </button>
      )}
      {error && (
        <p id={errId} role="alert" className="text-[9px] text-red-400 mt-0.5 text-center leading-none">
          {error}
        </p>
      )}
    </div>
  )
}
