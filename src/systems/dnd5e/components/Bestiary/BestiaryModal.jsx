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
} from '../../../../utils/monsters'
import { useLanguage } from '../../../../utils/useLanguage'
import { mergeMonster, indexOverrides } from '../../../../utils/monsters-i18n'
import { MonsterStatBlock } from './MonsterStatBlock'

export function BestiaryModal({ isOpen, onClose }) {
  const [monstersEn, setMonstersEn] = useState([])
  const [ptOverrides, setPtOverrides] = useState(null) // Map<index, override>
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_MONSTER_FILTERS)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const { lang, toggle: toggleLang } = useLanguage()

  useEffect(() => {
    if (!isOpen || monstersEn.length > 0) return
    const ctrl = new AbortController()
    fetch('/srd-data/5e-SRD-Monsters.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => setMonstersEn(Array.isArray(data) ? data : []))
      .catch(err => {
        if (err.name === 'AbortError') return
        console.error('Falha ao carregar bestiário:', err)
        setMonstersEn([])
      })
    return () => ctrl.abort()
  }, [isOpen, monstersEn.length])

  // Carrega overrides PT-BR sob demanda (apenas uma vez)
  useEffect(() => {
    if (!isOpen || ptOverrides !== null) return
    const ctrl = new AbortController()
    fetch('/srd-data/5e-SRD-Monsters-pt.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => setPtOverrides(indexOverrides(data)))
      .catch(err => {
        if (err.name === 'AbortError') return
        console.error('Falha ao carregar traduções PT do bestiário:', err)
        setPtOverrides(new Map())
      })
    return () => ctrl.abort()
  }, [isOpen, ptOverrides])

  // Lista de monstros com tradução aplicada conforme o idioma escolhido
  const monsters = useMemo(() => {
    if (lang !== 'pt' || !ptOverrides || ptOverrides.size === 0) return monstersEn
    return monstersEn.map(m => mergeMonster(m, ptOverrides.get(m.index)))
  }, [monstersEn, ptOverrides, lang])

  // Monstro selecionado derivado da lista já traduzida (mantém sincronia com toggle)
  const selected = useMemo(() => {
    if (!selectedIndex) return null
    return monsters.find(m => m.index === selectedIndex) || null
  }, [monsters, selectedIndex])

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
      className="fixed inset-0 z-50 bg-ink-700/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bestiário SRD"
        className="bg-parchment-50 border-2 border-parchment-600 rounded-sm w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-parchment-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-parchment-600 bg-parchment-100 shrink-0">
          <h2 className="text-base font-display tracking-widest uppercase text-ink-500 leading-tight">
            Bestiário SRD
            <span className="ml-2 text-xs ink-italic text-ink-300 normal-case tracking-normal">
              {filtered.length} de {monsters.length} monstros
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLang}
              aria-label={lang === 'pt' ? 'Mostrar nomes em inglês' : 'Mostrar nomes em português'}
              title={lang === 'pt' ? 'Mostrar nomes em inglês (original)' : 'Mostrar nomes em português'}
              className="text-xs font-display font-semibold border-2 border-parchment-600 rounded-sm px-2 py-1 text-ink-500 hover:border-ink-300 hover:bg-parchment-200 transition-colors"
            >
              {lang === 'pt' ? 'PT' : 'EN'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-sm text-ink-300 hover:text-ink-500 hover:bg-parchment-200"
              aria-label="Fechar bestiário"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Busca + filtros */}
        <div className="px-4 py-3 border-b border-parchment-600 bg-parchment-100/40 space-y-2 shrink-0">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar monstro..."
              className="flex-1 bg-parchment-50 border-2 border-parchment-600 rounded-sm px-3 py-1.5 text-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
            />
            <button
              type="button"
              onClick={() => setPanelOpen(v => !v)}
              aria-pressed={panelOpen}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-sm border-2 font-display tracking-wide transition-colors ${
                activeCount > 0
                  ? 'border-ink-500 bg-ink-500 text-parchment-50'
                  : 'border-parchment-600 text-ink-500 hover:border-ink-300 hover:bg-parchment-200'
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
          <div className={`${selected ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-2/5 sm:border-r-2 border-parchment-600 overflow-hidden`}>
            <div className="flex-1 overflow-y-auto divide-y divide-parchment-600/50">
              {filtered.length === 0 && (
                <p className="text-xs ink-italic text-ink-300 p-4 text-center">Nenhum monstro encontrado.</p>
              )}
              {filtered.map(m => (
                <button
                  key={m.index}
                  type="button"
                  onClick={() => setSelectedIndex(m.index)}
                  className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                    selectedIndex === m.index
                      ? 'bg-amber-100 border-l-4 border-amber-700'
                      : 'hover:bg-parchment-200 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-display font-semibold text-ink-500 truncate tracking-wide">{m.name}</div>
                    <div className="text-[13px] ink-italic text-ink-300 capitalize">{m.size?.toLowerCase()} {m.type}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-sm border font-bold ${crBadgeColor(m.challenge_rating)}`}>
                    CR {formatCR(m.challenge_rating)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Stat block (direita) */}
          <div className={`${selected ? 'flex' : 'hidden sm:flex'} flex-col w-full sm:w-3/5 overflow-hidden`}>
            {selected ? (
              <div className="flex-1 overflow-y-auto p-4 bg-parchment-50">
                <button
                  type="button"
                  onClick={() => setSelectedIndex(null)}
                  className="sm:hidden mb-3 text-xs ink-italic text-ink-300 hover:text-ink-500"
                >
                  ← Voltar à lista
                </button>
                <MonsterStatBlock monster={selected} lang={lang} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm ink-italic text-ink-300 bg-parchment-100/30">
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
    `text-[13px] px-2 py-1 rounded-sm border-2 transition-colors capitalize font-display tracking-wide ${
      active
        ? 'border-ink-600 bg-ink-500 text-parchment-50'
        : 'border-parchment-600 text-ink-500 hover:border-ink-300 hover:bg-parchment-200'
    }`

  return (
    <div className="bg-parchment-100/80 border-2 border-parchment-600 rounded-sm p-2.5 space-y-2.5">
      <div>
        <div className="text-xs font-display uppercase tracking-widest text-ink-500 mb-1">Challenge Rating</div>
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <span className="ink-italic">min</span>
          <input
            type="number" min="0" max="30" step="0.125"
            value={filters.cr.min}
            onChange={e => setCR('min', e.target.value)}
            className="w-20 bg-parchment-50 border-2 border-parchment-600 rounded-sm px-2 py-0.5 text-sm text-ink-500 focus:outline-none focus:border-ink-300"
          />
          <span className="ink-italic">max</span>
          <input
            type="number" min="0" max="30" step="1"
            value={filters.cr.max}
            onChange={e => setCR('max', e.target.value)}
            className="w-20 bg-parchment-50 border-2 border-parchment-600 rounded-sm px-2 py-0.5 text-sm text-ink-500 focus:outline-none focus:border-ink-300"
          />
        </div>
      </div>

      <div>
        <div className="text-xs font-display uppercase tracking-widest text-ink-500 mb-1">Tipo</div>
        <div className="flex flex-wrap gap-1">
          {MONSTER_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleInSet('types', t)} className={chip(filters.types.has(t))}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-display uppercase tracking-widest text-ink-500 mb-1">Tamanho</div>
        <div className="flex flex-wrap gap-1">
          {MONSTER_SIZES.map(s => (
            <button key={s} type="button" onClick={() => toggleInSet('sizes', s)} className={chip(filters.sizes.has(s))}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-display uppercase tracking-widest text-ink-500 mb-1">Alinhamento</div>
        <div className="flex flex-wrap gap-1">
          {ALIGNMENTS.map(a => (
            <button key={a} type="button" onClick={() => toggleInSet('alignments', a)} className={chip(filters.alignments.has(a))}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-1 border-t border-parchment-600">
        <button
          type="button"
          onClick={reset}
          className="text-[13px] ink-italic text-ink-300 hover:text-ink-500 transition-colors underline"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  )
}
