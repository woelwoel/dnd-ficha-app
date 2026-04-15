import { useState, useCallback } from 'react'

function loadCharacters() {
  return JSON.parse(localStorage.getItem('dnd-app-characters') || '[]')
}

export function CharacterList({ onSelect, onCreate }) {
  const [characters, setCharacters] = useState(loadCharacters)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleDelete = useCallback((id) => {
    const updated = loadCharacters().filter(c => c.id !== id)
    localStorage.setItem('dnd-app-characters', JSON.stringify(updated))
    setCharacters(updated)
    setConfirmDelete(null)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center pt-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Ficha D&D 5e</h1>
            <p className="text-gray-500 text-sm mt-1">Seus personagens</p>
          </div>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
          >
            + Nova Ficha
          </button>
        </div>

        {/* Character list */}
        {characters.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <div className="text-6xl mb-4">🐉</div>
            <p className="text-lg">Nenhum personagem ainda.</p>
            <p className="text-sm mt-1">Clique em "Nova Ficha" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {characters.map(c => (
              <div
                key={c.id}
                className="flex items-center bg-gray-800 border border-gray-700 hover:border-amber-600 rounded-lg px-4 py-3 transition-colors group"
              >
                <button
                  onClick={() => onSelect(c.id)}
                  className="flex-1 text-left"
                >
                  <div className="font-semibold text-white text-lg">
                    {c.info.name || <span className="text-gray-500 italic">Sem nome</span>}
                  </div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    {[
                      c.info.race,
                      c.info.class ? `${c.info.class} nível ${c.info.level}` : null,
                    ].filter(Boolean).join(' · ') || 'Personagem sem detalhes'}
                  </div>
                </button>

                {confirmDelete === c.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Confirmar?</span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all ml-4 text-xl leading-none"
                    title="Excluir personagem"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
