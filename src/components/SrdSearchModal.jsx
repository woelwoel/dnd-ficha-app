import { useState, useEffect, useRef } from 'react'
import { Modal } from './ui/Modal'

export function SrdSearchModal({ isOpen, onClose, title, items, onSelect, renderItem, filterFn, categories }) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [isOpen])

  // Reset busca/categoria ao fechar
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelectedCategory(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const defaultFilter = (item) => {
    const matchesName = query.length < 2 || item.name.toLowerCase().includes(query.toLowerCase())
    const matchesCategory = !selectedCategory || (categories?.find(c => c.key === selectedCategory)?.match?.(item) ?? true)
    return matchesName && matchesCategory
  }

  const baseFiltered = filterFn
    ? items.filter(item => filterFn(item) && (!selectedCategory || (categories?.find(c => c.key === selectedCategory)?.match?.(item) ?? true)))
    : items.filter(defaultFilter)

  const filtered = query.length < 2 && !selectedCategory
    ? items.slice(0, 40)
    : baseFiltered.slice(0, 80)

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        (query.length >= 2 || selectedCategory) && filtered.length > 0 ? (
          <span className="text-xs ink-italic text-ink-300">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        ) : null
      }
    >
      {/* Busca + chips de categoria */}
      <div className="space-y-2 mb-3 pb-3 border-b border-parchment-600 -mx-5 px-5">
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar pelo nome..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full px-3 py-2 bg-parchment-100 border-2 border-parchment-600 rounded-sm text-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
        />
        {query.length > 0 && query.length < 2 && (
          <p className="text-xs ink-italic text-ink-300">Digite pelo menos 2 caracteres para buscar.</p>
        )}
        {categories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              aria-pressed={!selectedCategory}
              className={`text-xs px-2.5 py-1 rounded-sm border-2 font-display tracking-wide transition-colors ${
                !selectedCategory
                  ? 'bg-ink-500 border-ink-600 text-parchment-50'
                  : 'bg-parchment-50 border-parchment-600 text-ink-300 hover:border-ink-300 hover:text-ink-500'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => {
              const active = selectedCategory === cat.key
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(active ? null : cat.key)}
                  aria-pressed={active}
                  className={`text-xs px-2.5 py-1 rounded-sm border-2 font-display tracking-wide transition-colors ${
                    active
                      ? 'bg-ink-500 border-ink-600 text-parchment-50'
                      : 'bg-parchment-50 border-parchment-600 text-ink-300 hover:border-ink-300 hover:text-ink-500'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Resultados */}
      <div className="-mx-5">
        {filtered.length === 0 ? (
          <p className="text-ink-300 ink-italic text-sm text-center py-8">Nenhum resultado encontrado.</p>
        ) : (
          filtered.map(item => (
            <button
              key={item.index}
              type="button"
              onClick={() => { onSelect(item); onClose() }}
              className="w-full text-left px-5 py-2.5 hover:bg-parchment-200 border-b border-parchment-600/50 last:border-0 transition-colors text-ink-500"
            >
              {renderItem(item)}
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}
