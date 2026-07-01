import { SOURCES } from '../../../../domain/sources'
import { ClassInfoButton } from './ClassInfoButton'

const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

/** Sufixo de procedência pra labels de <option> (não aceitam JSX). Vazio pra PHB. */
function sourceSuffix(source) {
  const meta = SOURCES[source]
  return meta && source !== 'phb' ? ` — ${meta.abbr}` : ''
}

export function ClassPicker({ classes, classIndex, level, onClassChange, onLevelChange, selectedClass: selectedClassProp = null }) {
  // `classes` é a lista de OFERTA (filtrada por fonte). Pra resolver a classe
  // já escolhida — que pode ter fonte desativada depois (ex.: Artífice/Tasha) —
  // o pai (ClassBlock) passa `selectedClass` do catálogo completo. Fallback pra
  // computação local mantém o componente testável isolado.
  const selectedClass = selectedClassProp ?? (classes.find(c => c.index === classIndex) ?? null)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="class-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Classe <span className="text-red-700">*</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
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
          <ClassInfoButton classData={selectedClass} />
        </div>
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
