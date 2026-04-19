import { useState, useEffect } from 'react'

export function CantripsGrantPicker({ needed, chosen, onChosenChange }) {
  const [allSpells, setAllSpells] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/srd-data/phb-spells-pt.json')
      .then(r => r.json())
      .then(data => setAllSpells((data ?? []).filter(s => s.level === 0)))
      .catch(() => {})
  }, [])

  const filtered = allSpells.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-gray-900 border border-blue-800/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-blue-300">
          Escolha {needed} truque{needed > 1 ? 's' : ''} de qualquer lista
        </p>
        <span className="text-xs text-gray-500">{chosen.length}/{needed}</span>
      </div>
      <input
        type="text"
        placeholder="Pesquisar truques..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
      />
      <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
        {filtered.map(spell => {
          const isChosen = !!chosen.find(c => c.index === spell.index)
          const disabled = !isChosen && chosen.length >= needed
          return (
            <button
              key={spell.index}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (isChosen) onChosenChange(chosen.filter(c => c.index !== spell.index))
                else onChosenChange([...chosen, {
                  index: spell.index, name: spell.name, level: 0,
                  school: spell.school ?? '', desc: spell.desc ?? '',
                }])
              }}
              className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${
                isChosen   ? 'bg-blue-900/40 border border-blue-600/50 text-blue-200'
                : disabled ? 'opacity-30 cursor-not-allowed text-gray-500 bg-gray-800'
                :             'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${isChosen ? 'border-blue-400 bg-blue-500' : 'border-gray-600'}`} />
              <span className="flex-1">{spell.name}</span>
              {spell.school && <span className="text-gray-500 text-[10px]">{spell.school}</span>}
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-600 italic text-center py-2">Nenhum truque encontrado.</p>
        )}
      </div>
    </div>
  )
}
