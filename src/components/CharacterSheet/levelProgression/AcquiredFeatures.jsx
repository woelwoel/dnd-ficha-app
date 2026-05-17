// src/components/CharacterSheet/levelProgression/AcquiredFeatures.jsx
import { useState } from 'react'

export function AcquiredFeatures({ levels, currentLevel, onFeatureClick }) {
  const [open, setOpen] = useState(false)
  const acquired = []
  for (const entry of levels) {
    if (entry.level > currentLevel) break
    for (const f of (entry.features ?? [])) acquired.push({ ...f, level: entry.level })
  }
  if (!acquired.length) return null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-300 hover:text-white"
      >
        <span>Características Adquiridas <span className="text-gray-500 font-normal text-xs">({acquired.length})</span></span>
        <span className="text-gray-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {acquired.map((f, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] text-gray-600 shrink-0 w-8 text-right">Nv{f.level}</span>
              <button
                onClick={() => onFeatureClick(f)}
                className="text-xs text-amber-300 hover:text-amber-200 text-left underline decoration-dotted leading-tight"
              >
                {f.name}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
