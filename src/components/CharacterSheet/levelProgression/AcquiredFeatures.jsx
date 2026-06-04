// src/components/CharacterSheet/levelProgression/AcquiredFeatures.jsx
import { useState } from 'react'

/**
 * Lista das features adquiridas pelo personagem até o nível atual.
 *
 * `defaultOpen = true` (audit P0 #5): é o conteúdo MAIS importante da
 * aba Progressão. Antes começava colapsado, exigindo clique extra pra
 * ver a coisa principal. Agora abre por default.
 */
export function AcquiredFeatures({ levels, currentLevel, onFeatureClick, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const acquired = []
  for (const entry of levels) {
    if (entry.level > currentLevel) break
    for (const f of (entry.features ?? [])) acquired.push({ ...f, level: entry.level })
  }
  if (!acquired.length) return null

  return (
    <section className="bg-parchment-50 border-2 border-parchment-600 rounded-sm shadow-parchment-sm">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-display tracking-widest uppercase text-ink-500 hover:bg-parchment-100"
      >
        <span className="inline-flex items-center gap-2">
          <span className="text-base">❦</span>
          <span>Características Adquiridas</span>
          <span className="ink-italic text-ink-300 font-normal normal-case tracking-normal">
            ({acquired.length})
          </span>
        </span>
        <span aria-hidden className="text-ink-300 text-xs">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-parchment-600 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {acquired.map((f, i) => (
            <div key={i} className="flex items-baseline gap-2 py-1">
              <span className="text-xs ink-italic text-ink-300 shrink-0 w-9 text-right font-mono">Nv{f.level}</span>
              <button
                type="button"
                onClick={() => onFeatureClick(f)}
                className="text-sm text-ink-500 hover:text-amber-700 text-left underline decoration-dotted underline-offset-2 leading-tight font-display tracking-wide"
                title="Ver descrição completa"
              >
                {f.name}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
