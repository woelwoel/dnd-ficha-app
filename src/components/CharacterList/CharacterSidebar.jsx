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

export function CharacterSidebar({ characters = [], onSelect, onDelete, onFilterChange }) {
  const [classFilter, setClassFilter] = useState(null) // null = todos
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

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
    <aside className="flex flex-col h-full p-3 rounded border border-shell-border bg-gradient-to-b from-shell-800 to-shell-900 text-ink-inverse font-redesign-sans">
      <h6 className="text-center pb-1.5 mb-2 text-[13px] uppercase tracking-[0.18em] font-bold border-b border-shell-border text-gold-400 font-display">
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
          <p className="text-xs italic text-center mt-4 px-2 leading-relaxed text-gold-500">
            {characters.length === 0
              ? 'Nenhum herói recrutado ainda.'
              : 'Nenhum aventureiro dessa estirpe na companhia.'}
          </p>
        )}
        {visible.map(c => {
          const confirming = confirmDeleteId === c.id
          return (
            <div
              key={c.id}
              className="group relative flex items-center gap-2 px-1 py-1.5 transition-colors hover:bg-[rgba(212,173,106,0.08)] border-b border-[rgba(110,87,43,0.3)]"
            >
              <button
                type="button"
                onClick={() => onSelect && onSelect(c.id)}
                className="flex-1 flex items-center gap-2 text-left min-w-0"
                aria-label={`Abrir ${c.info?.name || 'personagem'}`}
              >
                <span className="companion-avatar grid place-items-center rounded-full flex-shrink-0 w-[26px] h-[26px] border border-shell-800 text-shell-800">
                  <ClassIcon classKey={c.info?.class} size={16} color="currentColor" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-semibold leading-tight truncate font-body text-ink-inverse">
                    {c.info?.name || 'Sem nome'}
                  </span>
                  <span className="block text-xs italic mt-0.5 text-gold-500">
                    {c.info?.class || '—'}
                  </span>
                </span>
                <span className="text-[13px] font-bold flex-shrink-0 mr-1 font-display text-gold-400">
                  {toRoman(c.info?.level ?? 1)}
                </span>
              </button>

              {/* Delete inline com confirmação — só na ficha do próprio dono
                  (excluir ficha alheia falharia no RLS de qualquer forma). */}
              {c.canDelete === false ? null : confirming ? (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (onDelete) onDelete(c.id)
                      setConfirmDeleteId(null)
                    }}
                    className="text-xs px-2 py-0.5 rounded font-bold border border-[#5a0000] bg-blood text-ink-inverse font-display tracking-[0.08em]"
                  >
                    Riscar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs px-2 py-0.5 rounded border border-shell-border bg-transparent text-gold-400 font-display tracking-[0.08em]"
                    aria-label="Cancelar exclusão"
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(c.id)}
                  className="flex-shrink-0 w-6 h-6 grid place-items-center rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-[rgba(139,0,0,0.18)] text-gold-500"
                  aria-label={`Excluir ${c.info?.name || 'personagem'}`}
                  title="Excluir"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
        {hidden > 0 && (
          <div className="mt-2 p-2 rounded text-xs text-center italic border border-dashed border-shell-border bg-[rgba(212,173,106,0.1)] text-gold-500">
            + {hidden} outros
          </div>
        )}
      </div>
    </aside>
  )
}
