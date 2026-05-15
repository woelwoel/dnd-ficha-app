import { useMemo, useState } from 'react'
import { Chip } from '../ui/Chip'
import { ClassIcon, getClassIconKey } from '../../utils/class-icons'
import { MAX_VISIBLE_TOKENS } from '../../utils/config'

const FILTER_CLASSES = [
  { key: 'guerreiro',   label: 'Guerreiro' },
  { key: 'mago',        label: 'Mago' },
  { key: 'clerigo',     label: 'Clérigo' },
  { key: 'ladino',      label: 'Ladino' },
  { key: 'barbaro',     label: 'Bárbaro' },
  { key: 'bardo',       label: 'Bardo' },
  { key: 'druida',      label: 'Druida' },
  { key: 'patrulheiro', label: 'Patrulheiro' },
  { key: 'paladino',    label: 'Paladino' },
  { key: 'feiticeiro',  label: 'Feiticeiro' },
  { key: 'bruxo',       label: 'Bruxo' },
  { key: 'monge',       label: 'Monge' },
]

function toRoman(num) {
  if (!Number.isFinite(num) || num <= 0) return '—'
  const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let r = ''
  let n = num
  for (const [v, s] of map) {
    while (n >= v) { r += s; n -= v }
  }
  return r
}

export function CharacterSidebar({ characters = [], onSelect, onFilterChange }) {
  const [classFilter, setClassFilter] = useState(null) // null = todos

  const filtered = useMemo(() => {
    if (!classFilter) return characters
    return characters.filter(c => getClassIconKey(c.info?.class) === classFilter)
  }, [characters, classFilter])

  const visible = filtered.slice(0, MAX_VISIBLE_TOKENS)
  const hidden = filtered.length - visible.length

  function applyFilter(key) {
    setClassFilter(key)
    if (onFilterChange) onFilterChange(key)
  }

  return (
    <aside
      className="flex flex-col h-full p-3 rounded border"
      style={{
        background: 'linear-gradient(180deg, var(--color-shell-800), var(--color-shell-900))',
        borderColor: 'var(--color-shell-border)',
        color: 'var(--color-ink-inverse)',
        fontFamily: 'var(--font-redesign-sans)',
      }}
    >
      <h6
        className="text-center pb-1.5 mb-2 text-[11px] uppercase tracking-[0.18em] font-bold border-b"
        style={{
          color: 'var(--color-gold-400)',
          borderColor: 'var(--color-shell-border)',
          fontFamily: 'IM Fell English SC, serif',
        }}
      >
        Companhia
      </h6>

      <div className="flex flex-wrap gap-1 mb-2" role="group" aria-label="Filtros de classe">
        <Chip
          active={classFilter === null}
          onClick={() => applyFilter(null)}
        >
          Todos
        </Chip>
        {FILTER_CLASSES.map(f => (
          <Chip
            key={f.key}
            active={classFilter === f.key}
            onClick={() => applyFilter(f.key)}
            ariaLabel={`Filtrar por ${f.label.toLowerCase()}`}
            title={f.label}
          >
            <ClassIcon classKey={f.key} size={18} color="currentColor" />
          </Chip>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs italic text-center mt-4 px-2 leading-relaxed" style={{ color: 'var(--color-gold-500)' }}>
            {characters.length === 0
              ? 'Nenhum herói recrutado ainda.'
              : 'Nenhum aventureiro dessa estirpe na companhia.'}
          </p>
        )}
        {visible.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect && onSelect(c.id)}
            className="w-full flex items-center gap-2 px-1 py-1.5 text-left transition-colors hover:bg-[rgba(212,173,106,0.08)] border-b"
            style={{ borderColor: 'rgba(110, 87, 43, 0.3)' }}
          >
            <span
              className="grid place-items-center rounded-full flex-shrink-0"
              style={{
                width: '26px', height: '26px',
                background: 'radial-gradient(circle at 30% 25%, var(--color-accent-100), var(--color-accent-500))',
                border: '1px solid var(--color-shell-800)',
                color: 'var(--color-shell-800)',
              }}
            >
              <ClassIcon classKey={c.info?.class} size={16} color="currentColor" />
            </span>
            <span className="flex-1 min-w-0">
              <span
                className="block text-[12px] font-semibold leading-tight truncate"
                style={{ fontFamily: 'EB Garamond, serif', color: 'var(--color-ink-inverse)' }}
              >
                {c.info?.name || 'Sem nome'}
              </span>
              <span className="block text-[10px] italic mt-0.5" style={{ color: 'var(--color-gold-500)' }}>
                {c.info?.class || '—'}
              </span>
            </span>
            <span
              className="text-[11px] font-bold flex-shrink-0"
              style={{ fontFamily: 'IM Fell English SC, serif', color: 'var(--color-gold-400)' }}
            >
              {toRoman(c.info?.level ?? 1)}
            </span>
          </button>
        ))}
        {hidden > 0 && (
          <div
            className="mt-2 p-2 rounded text-[10px] text-center italic border-dashed"
            style={{
              background: 'rgba(212,173,106,0.1)',
              border: '1px dashed var(--color-shell-border)',
              color: 'var(--color-gold-500)',
            }}
          >
            + {hidden} outros
          </div>
        )}
      </div>
    </aside>
  )
}
