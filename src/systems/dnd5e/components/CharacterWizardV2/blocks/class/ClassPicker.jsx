import { SOURCES } from '../../../../domain/sources'

const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

/** Sufixo de procedência pra labels de <option> (não aceitam JSX). Vazio pra PHB. */
function sourceSuffix(source) {
  const meta = SOURCES[source]
  return meta && source !== 'phb' ? ` — ${meta.abbr}` : ''
}

export function ClassPicker({ classes, classIndex, level, onClassChange, onLevelChange }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="class-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Classe <span className="text-red-700">*</span>
        </label>
        <select
          id="class-select"
          value={classIndex}
          onChange={e => onClassChange(e.target.value)}
          className={fieldCls}
        >
          <option value="">Escolher classe...</option>
          {classes.map(c => (
            <option key={c.index} value={c.index}>{c.name}{sourceSuffix(c.source)}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="level-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Nível Inicial
        </label>
        <select
          id="level-select"
          value={level}
          onChange={e => onLevelChange(Number(e.target.value))}
          className={fieldCls}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Nível {n}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
