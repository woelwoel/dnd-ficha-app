import { useState, useEffect } from 'react'
import {
  totalAttributes, meetsPrereqs, formatPrereqs, totalLevels, takenClassIndices,
} from './blocks/class/multiclass-helpers'

const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

export function MulticlassModal({ open, draft, classes, multiclassData, onAdd, onCancel }) {
  const [classIndex, setClassIndex] = useState('')
  const [level, setLevel] = useState(1)

  useEffect(() => {
    if (open) {
      setClassIndex('')
      setLevel(1)
    }
  }, [open])

  if (!open) return null

  const taken = takenClassIndices(draft)
  const available = classes.filter(c => !taken.has(c.index))
  const selectedClass = classes.find(c => c.index === classIndex) ?? null
  const mcData = multiclassData?.[classIndex] ?? null
  const prereqs = mcData?.prerequisites ?? null
  const profs = mcData?.proficiencies ?? null
  const attrs = totalAttributes(draft)
  const prereqOk = !classIndex || meetsPrereqs(prereqs, attrs)
  const currentTotal = totalLevels(draft)
  const wouldExceed20 = currentTotal + level > 20

  const canAdd = !!classIndex && prereqOk && !wouldExceed20

  function handleConfirm() {
    if (!canAdd) return
    const cls = classes.find(c => c.index === classIndex)
    onAdd({
      class: classIndex,
      level,
      chosenFeatures: {},
      asiChoices: {},
      bonusSpells: [],
      hitDie: cls?.hit_die ?? 8,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-label="Adicionar Multiclasse"
        className="w-full max-w-md flex flex-col gap-4 bg-parchment-50 border-2 border-parchment-600 rounded-sm p-6 shadow-parchment-lg"
        onClick={e => e.stopPropagation()}
      >
        <header className="text-center">
          <p className="text-[10px] ink-italic tracking-[0.3em] uppercase mb-1">Forjar Herói</p>
          <h2 className="text-xl font-display text-ink-500 tracking-widest uppercase">
            Adicionar Classe
          </h2>
        </header>

        <div>
          <label htmlFor="mc-class-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
            Classe <span className="text-red-700">*</span>
          </label>
          <select
            id="mc-class-select"
            value={classIndex}
            onChange={e => setClassIndex(e.target.value)}
            className={fieldCls}
          >
            <option value="">Escolher classe...</option>
            {available.map(c => (
              <option key={c.index} value={c.index}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="mc-level-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
            Nível
          </label>
          <select
            id="mc-level-select"
            value={level}
            onChange={e => setLevel(Number(e.target.value))}
            className={fieldCls}
          >
            {Array.from({ length: 19 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>Nível {n}</option>
            ))}
          </select>
        </div>

        {selectedClass && prereqs && (
          <div className={[
            'text-xs px-3 py-2 rounded-sm border-2 flex items-center gap-2',
            prereqOk
              ? 'border-emerald-700 bg-emerald-50 text-emerald-700'
              : 'border-red-700 bg-red-50 text-red-700',
          ].join(' ')}>
            {prereqOk ? '✓' : '✗'} Pré-requisito: {formatPrereqs(prereqs)}
          </div>
        )}

        {selectedClass && profs && (
          <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2 text-xs">
            <p className="font-display tracking-widest uppercase text-ink-300 mb-1">Proficiências ganhas</p>
            <div className="flex flex-col gap-0.5 text-ink-500">
              {profs.armor?.length > 0 && <p><span className="text-ink-300">Armaduras:</span> {profs.armor.join(', ')}</p>}
              {profs.weapons?.length > 0 && <p><span className="text-ink-300">Armas:</span> {profs.weapons.join(', ')}</p>}
              {profs.tools?.length > 0 && <p><span className="text-ink-300">Ferramentas:</span> {profs.tools.join(', ')}</p>}
              {profs.skills > 0 && <p><span className="text-ink-300">Perícias:</span> escolher {profs.skills}</p>}
            </div>
          </div>
        )}

        {wouldExceed20 && (
          <div className="text-xs px-3 py-2 rounded-sm border-2 border-amber-700 bg-amber-50 text-amber-700">
            ⚠ Total de níveis excederia 20 ({currentTotal} + {level} = {currentTotal + level})
          </div>
        )}

        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
          >Cancelar</button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canAdd}
            className="px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide disabled:opacity-35 disabled:cursor-not-allowed"
          >Adicionar</button>
        </div>
      </div>
    </div>
  )
}
