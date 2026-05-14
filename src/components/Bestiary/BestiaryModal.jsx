import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  matchesMonsterFilters,
  formatCR,
  countActiveMonsterFilters,
  crBadgeColor,
  EMPTY_MONSTER_FILTERS,
  MONSTER_TYPES,
  MONSTER_SIZES,
  ALIGNMENTS,
} from '../../utils/monsters'
import { MonsterStatBlock } from './MonsterStatBlock'

export function BestiaryModal({ isOpen, onClose }) {
  const [monsters, setMonsters] = useState([])
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_MONSTER_FILTERS)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!isOpen || monsters.length > 0) return
    fetch('/srd-data/5e-SRD-Monsters.json')
      .then(r => r.json())
      .then(data => setMonsters(Array.isArray(data) ? data : []))
      .catch(() => setMonsters([]))
  }, [isOpen, monsters.length])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return monsters.filter(m => {
      if (!matchesMonsterFilters(m, filters)) return false
      if (q && !(m.name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [monsters, search, filters])

  const activeCount = countActiveMonsterFilters(filters)

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-amber-700/50 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-700/40">
          <h2 className="text-lg font-bold text-amber-400">
            Bestiário SRD
            <span className="ml-2 text-xs text-gray-500 font-normal">
              {filtered.length} de {monsters.length} monstros
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-amber-400 hover:bg-gray-800"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Busca + filtros */}
        <div className="px-4 py-3 border-b border-gray-700 space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar monstro..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-600"
            />
            <button
              type="button"
              onClick={() => setPanelOpen(v => !v)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded border font-semibold transition-colors ${
                activeCount > 0
                  ? 'border-amber-500 bg-amber-900/40 text-amber-200'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              Filtros{activeCount > 0 ? ` · ${activeCount}` : ''}
            </button>
          </div>

          {panelOpen && (
            <MonsterFilterPanel filters={filters} onChange={setFilters} />
          )}
        </div>

        {/* Corpo: lista + stat block */}
        <div className="flex-1 flex overflow-hidden">
          {/* Lista (esquerda) */}
          <div className={`${selected ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-2/5 sm:border-r border-gray-700 overflow-hidden`}>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-700/50">
              {filtered.length === 0 && (
                <p className="text-xs text-gray-600 p-4 text-center">Nenhum monstro encontrado.</p>
              )}
              {filtered.map(m => (
                <button
                  key={m.index}
                  type="button"
                  onClick={() => setSelected(m)}
                  className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                    selected?.index === m.index
                      ? 'bg-amber-900/30 border-l-4 border-amber-500'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{m.name}</div>
                    <div className="text-[11px] text-gray-500 capitalize">{m.size?.toLowerCase()} {m.type}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${crBadgeColor(m.challenge_rating)}`}>
                    CR {formatCR(m.challenge_rating)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Stat block (direita) */}
          <div className={`${selected ? 'flex' : 'hidden sm:flex'} flex-col w-full sm:w-3/5 overflow-hidden`}>
            {selected ? (
              <div className="flex-1 overflow-y-auto p-4">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="sm:hidden mb-3 text-xs text-amber-400 hover:text-amber-300"
                >
                  ← Voltar à lista
                </button>
                <MonsterStatBlock monster={selected} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                Selecione um monstro
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function MonsterFilterPanel({ filters, onChange }) {
  function toggleInSet(key, value) {
    const next = new Set(filters[key])
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange({ ...filters, [key]: next })
  }
  function setCR(field, raw) {
    const v = Number(raw)
    if (Number.isNaN(v)) return
    const clamped = Math.max(0, Math.min(30, v))
    onChange({ ...filters, cr: { ...filters.cr, [field]: clamped } })
  }
  function reset() {
    onChange({
      cr: { min: 0, max: 30 },
      types: new Set(),
      sizes: new Set(),
      alignments: new Set(),
    })
  }
  const chip = (active) =>
    `text-[11px] px-2 py-1 rounded border transition-colors capitalize ${
      active
        ? 'border-amber-500 bg-amber-900/40 text-amber-200'
        : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
    }`

  return (
    <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 space-y-2.5">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Challenge Rating</div>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <span>min</span>
          <input
            type="number" min="0" max="30" step="0.125"
            value={filters.cr.min}
            onChange={e => setCR('min', e.target.value)}
            className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-sm text-white"
          />
          <span>max</span>
          <input
            type="number" min="0" max="30" step="1"
            value={filters.cr.max}
            onChange={e => setCR('max', e.target.value)}
            className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-sm text-white"
          />
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Tipo</div>
        <div className="flex flex-wrap gap-1">
          {MONSTER_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleInSet('types', t)} className={chip(filters.types.has(t))}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Tamanho</div>
        <div className="flex flex-wrap gap-1">
          {MONSTER_SIZES.map(s => (
            <button key={s} type="button" onClick={() => toggleInSet('sizes', s)} className={chip(filters.sizes.has(s))}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Alinhamento</div>
        <div className="flex flex-wrap gap-1">
          {ALIGNMENTS.map(a => (
            <button key={a} type="button" onClick={() => toggleInSet('alignments', a)} className={chip(filters.alignments.has(a))}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-1 border-t border-gray-700/50">
        <button
          type="button"
          onClick={reset}
          className="text-[11px] text-gray-500 hover:text-amber-400 transition-colors"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  )
}
