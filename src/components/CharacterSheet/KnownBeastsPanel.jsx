import { useEffect, useMemo, useState } from 'react'

/**
 * Curadoria das bestas conhecidas do druida (PHB p.66). Lista todo o catálogo
 * de Forma Selvagem com um toggle conhecida/não conhecida por besta — pensado
 * pro momento "alinhei com o mestre na criação, conheço lobo/urso/águia".
 * Marcação feita pelo próprio jogador via onToggleKnownBeast.
 */
function useBeasts(enabled) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    fetch('/srd-data/wild-shape-beasts-pt.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setData(d.beasts ?? []))
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Falha ao carregar bestas:', err)
      })
    return () => ctrl.abort()
  }, [enabled])
  return data
}

export function KnownBeastsPanel({ druidaLevel, character, onToggleKnownBeast }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const beasts = useBeasts(open)

  const knownSet = useMemo(
    () => new Set(character.combat?.knownBeasts ?? []),
    [character.combat?.knownBeasts]
  )

  const filtered = useMemo(() => {
    if (!beasts) return []
    const q = query.trim().toLowerCase()
    if (!q) return beasts
    return beasts.filter(b =>
      b.name.toLowerCase().includes(q) || b.nameEn.toLowerCase().includes(q)
    )
  }, [beasts, query])

  if (druidaLevel < 2) return null

  return (
    <div className="rounded-lg border-2 border-parchment-600 bg-parchment-50 p-3">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-sm font-display tracking-wide text-ink-500"
      >
        <span>📖 Bestas conhecidas</span>
        <span className="text-xs ink-italic text-ink-300">
          {knownSet.size} conhecida{knownSet.size !== 1 ? 's' : ''} {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="mt-2 pt-2 border-t border-parchment-600 space-y-2">
          <p className="text-[13px] ink-italic text-ink-300">
            Marque as bestas que seu druida já viu. Só as conhecidas podem ser
            assumidas na Forma Selvagem.
          </p>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar besta…"
            className="w-full bg-parchment-50 border border-parchment-600 rounded px-2 py-1 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
          />
          {!beasts && <p className="text-xs italic text-ink-300">Carregando catálogo…</p>}
          <div className="max-h-72 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1 pr-1">
            {filtered.map(b => {
              const known = knownSet.has(b.index)
              return (
                <button
                  key={b.index}
                  onClick={() => onToggleKnownBeast(b.index)}
                  aria-pressed={known}
                  className={`text-left text-[13px] px-2 py-1.5 rounded border transition-colors ${
                    known
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-parchment-600 bg-parchment-100/50 text-ink-300'
                  }`}
                >
                  <span className="font-bold"><span aria-hidden>{known ? '✓ ' : '○ '}</span>{b.name}</span>
                  <span className="ml-1 text-[11px] font-mono opacity-70">CR {b.crLabel}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
