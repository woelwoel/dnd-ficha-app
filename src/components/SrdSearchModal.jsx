import { useState, useEffect, useRef } from 'react'

export function SrdSearchModal({ isOpen, onClose, title, items, onSelect, renderItem, filterFn }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const titleId = 'srd-search-modal-title'

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      // Foca o campo de busca ao abrir (setTimeout evita conflito com foco do portal)
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      document.addEventListener('keydown', onKey)
      return () => {
        clearTimeout(t)
        document.removeEventListener('keydown', onKey)
      }
    }
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // O componente retorna null quando !isOpen, então o state de query é
  // automaticamente zerado no próximo mount — sem necessidade de reset manual.
  if (!isOpen) return null

  const defaultFilter = (item) => item.name.toLowerCase().includes(query.toLowerCase())
  const filtered = query.length < 2
    ? items.slice(0, 40)
    : items.filter(filterFn || defaultFilter).slice(0, 60)

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-gray-800 border border-gray-600 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 id={titleId} className="font-bold text-amber-400">{title}</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-700">
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar pelo nome..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
          />
          {query.length > 0 && query.length < 2 && (
            <p className="text-xs text-gray-500 mt-1">Digite pelo menos 2 caracteres para buscar.</p>
          )}
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum resultado encontrado.</p>
          ) : (
            filtered.map(item => (
              <button
                key={item.index}
                onClick={() => { onSelect(item); onClose() }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-700 border-b border-gray-700/50 last:border-0 transition-colors"
              >
                {renderItem(item)}
              </button>
            ))
          )}
        </div>

        {query.length >= 2 && filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
