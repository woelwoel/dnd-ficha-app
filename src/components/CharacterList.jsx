import { useState, useCallback } from 'react'

const CLASS_ICONS = {
  guerreiro: '⚔️', mago: '🔮', clérigo: '✨', ladino: '🗡️',
  bárbaro: '🪓', bardo: '🎭', druida: '🌿', guardião: '🏹',
  paladino: '🛡️', feiticeiro: '🌟', bruxo: '👁️', monge: '☯️',
}

function classIcon(cls) {
  if (!cls) return '📜'
  const key = cls.toLowerCase()
  for (const [k, v] of Object.entries(CLASS_ICONS)) {
    if (key.includes(k)) return v
  }
  return '📜'
}

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
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center pt-12 px-4 pb-20">
      <div className="w-full max-w-2xl">

        {/* ── Cabeçalho ──────────────────────────────────── */}
        <div className="text-center mb-10">
          <p className="text-amber-600 text-sm tracking-[0.3em] uppercase mb-2 font-display">
            Taverna do Aventureiro
          </p>
          <h1 className="text-4xl font-bold text-amber-400 font-display mb-3">
            Grimório de Personagens
          </h1>
          <div className="flex items-center gap-3 justify-center text-gray-600">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-800 to-amber-700" />
            <span className="text-amber-700 text-lg">⚜</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-800 to-amber-700" />
          </div>
          <p className="text-gray-400 text-sm mt-3 italic">
            D&amp;D 5e · Sistema de Referência de Regras
          </p>
        </div>

        {/* ── Botão criar ────────────────────────────────── */}
        <div className="flex justify-end mb-5">
          <button
            onClick={onCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-600 text-amber-100 font-semibold rounded-lg transition-colors shadow-lg shadow-amber-950/50 font-display text-sm tracking-wide"
          >
            <span>✦</span> Nova Ficha
          </button>
        </div>

        {/* ── Lista / estado vazio ────────────────────────── */}
        {characters.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-5">🐉</div>
            <p className="text-amber-400 font-display text-xl mb-2">
              Nenhum herói registrado
            </p>
            <p className="text-gray-500 text-sm italic leading-relaxed max-w-xs mx-auto">
              As páginas do grimório aguardam. Crie sua primeira ficha e que a aventura comece.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {characters.map(c => {
              const icon = classIcon(c.info?.class)
              const subtitle = [
                c.info?.race,
                c.info?.class ? `${c.info.class} nível ${c.info.level}` : null,
              ].filter(Boolean).join(' · ')

              return (
                <div
                  key={c.id}
                  className="flex items-center bg-gray-800 border border-gray-700 hover:border-amber-700 rounded-lg overflow-hidden transition-all group shadow-md hover:shadow-amber-950/40"
                >
                  {/* Ícone da classe */}
                  <div className="flex items-center justify-center w-14 h-full bg-gray-700 group-hover:bg-amber-950/60 transition-colors text-2xl py-4 shrink-0 border-r border-gray-700 group-hover:border-amber-800">
                    {icon}
                  </div>

                  <button
                    onClick={() => onSelect(c.id)}
                    className="flex-1 text-left px-4 py-3"
                  >
                    <div className="font-semibold text-gray-100 font-display text-base group-hover:text-amber-300 transition-colors">
                      {c.info?.name || <span className="text-gray-500 italic font-body">Sem nome</span>}
                    </div>
                    <div className="text-sm text-gray-400 mt-0.5 font-body">
                      {subtitle || <span className="italic text-gray-600">Personagem sem detalhes</span>}
                    </div>
                  </button>

                  {confirmDelete === c.id ? (
                    <div className="flex items-center gap-2 px-3">
                      <span className="text-xs text-red-400 font-display">Confirmar?</span>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs px-2 py-1 bg-red-800 hover:bg-red-700 text-red-200 rounded transition-colors"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all px-4 text-xl leading-none"
                      title="Excluir personagem"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Rodapé decorativo ──────────────────────────── */}
        <div className="flex items-center gap-3 justify-center mt-12 text-gray-700">
          <div className="h-px flex-1 bg-gray-800" />
          <span className="text-xs tracking-widest font-display">✦ ✦ ✦</span>
          <div className="h-px flex-1 bg-gray-800" />
        </div>
      </div>
    </div>
  )
}
