const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

export function RacePicker({ races, race, subrace, onRaceChange, onSubraceChange }) {
  const selectedRace = races.find(r => r.index === race)
  const hasSubraces = (selectedRace?.subraces?.length ?? 0) > 0
  const optional = selectedRace?.optionalSubrace

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="race-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Raça <span className="text-red-700">*</span>
        </label>
        <select
          id="race-select"
          value={race}
          onChange={e => onRaceChange(e.target.value)}
          className={fieldCls}
        >
          <option value="">Escolher raça...</option>
          {races.map(r => (
            <option key={r.index} value={r.index}>{r.name}</option>
          ))}
        </select>
      </div>

      {hasSubraces && (
        <div>
          <label htmlFor="subrace-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
            Sub-raça {optional
              ? <span className="text-ink-200 normal-case lowercase">(opcional)</span>
              : <span className="text-red-700">*</span>}
          </label>
          <select
            id="subrace-select"
            value={subrace}
            onChange={e => onSubraceChange(e.target.value)}
            className={fieldCls}
          >
            <option value="">{optional ? 'Nenhuma (raça base)' : 'Escolher sub-raça...'}</option>
            {selectedRace.subraces.map(sr => (
              <option key={sr.index} value={sr.index}>{sr.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
