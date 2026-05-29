import { useMemo } from 'react'
import { ClassIcon } from '../../utils/class-icons'

function relativeTime(epoch) {
  if (!epoch) return null
  const delta = Date.now() - epoch
  const min = Math.floor(delta / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `há ${w} sem`
  const mo = Math.floor(d / 30)
  return `há ${mo} mês${mo > 1 ? 'es' : ''}`
}

export function CharacterListView({ characters = [], onSelect }) {
  const sorted = useMemo(() => {
    return [...characters].sort((a, b) => {
      const ta = a.lastOpenedAt || 0
      const tb = b.lastOpenedAt || 0
      return tb - ta
    })
  }, [characters])

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-ink-secondary">
        <p className="text-sm italic">Nenhum herói recrutado ainda.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {sorted.map(c => {
        const info = c.info || {}
        const last = relativeTime(c.lastOpenedAt)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect && onSelect(c.id)}
            data-testid="list-card"
            className="flex items-center gap-3 p-3 rounded-md text-left transition-colors hover:shadow-elevated border border-accent-300 bg-bg-surface shadow-card text-ink-primary font-redesign-sans"
          >
            <span className="companion-avatar grid place-items-center rounded-full flex-shrink-0 w-11 h-11 border-2 border-shell-800 text-shell-800">
              <ClassIcon classKey={info.class} size={24} color="currentColor" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-base font-semibold truncate font-body">
                {info.name || 'Sem nome'}
              </span>
              <span className="block text-xs mt-0.5 text-ink-secondary">
                {[info.race, info.class].filter(Boolean).join(' · ') || '—'}
                {info.level != null && <> · Nível {info.level}</>}
              </span>
            </span>
            {last && (
              <span className="text-[11px] italic flex-shrink-0 text-ink-muted">
                {last}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
