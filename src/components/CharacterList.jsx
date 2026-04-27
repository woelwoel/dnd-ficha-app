import { useState, useCallback } from 'react'
import { loadCharacters, deleteCharacter } from '../utils/storage'

const CLASS_ICONS = {
  guerreiro: '⚔️', mago: '🔮', clerigo: '✨', ladino: '🗡️',
  barbaro: '🪓', bardo: '🎭', druida: '🌿', patrulheiro: '🏹',
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

/* ── Círculo arcano decorativo ─────────────────────────────── */
function ArcaneCircle() {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 -top-12 w-72 h-72 pointer-events-none select-none"
      aria-hidden
    >
      <svg className="w-full h-full opacity-[0.13]" viewBox="0 0 288 288">
        {/* Anéis */}
        <circle cx="144" cy="144" r="135" fill="none" stroke="#4080c8" strokeWidth="1" />
        <circle cx="144" cy="144" r="100" fill="none" stroke="#4080c8" strokeWidth="1" strokeDasharray="3 7" />
        <circle cx="144" cy="144" r="64" fill="none" stroke="#c49030" strokeWidth="1" />
        <circle cx="144" cy="144" r="30" fill="none" stroke="#4080c8" strokeWidth="1" strokeDasharray="2 5" />
        {/* Pontos cardinais externos */}
        {[0, 60, 120, 180, 240, 300].map(a => {
          const r = (a - 90) * Math.PI / 180
          return (
            <circle
              key={a}
              cx={144 + Math.cos(r) * 135}
              cy={144 + Math.sin(r) * 135}
              r="3.5"
              fill="#4080c8"
            />
          )
        })}
        {/* Marcações intermediárias */}
        {[30, 90, 150, 210, 270, 330].map(a => {
          const r = (a - 90) * Math.PI / 180
          const x1 = 144 + Math.cos(r) * 92
          const y1 = 144 + Math.sin(r) * 92
          const x2 = 144 + Math.cos(r) * 108
          const y2 = 144 + Math.sin(r) * 108
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c49030" strokeWidth="1.2" />
        })}
        {/* Linhas diagonais internas */}
        {[45, 135, 225, 315].map(a => {
          const r = (a - 90) * Math.PI / 180
          const x1 = 144 + Math.cos(r) * 30
          const y1 = 144 + Math.sin(r) * 30
          const x2 = 144 + Math.cos(r) * 62
          const y2 = 144 + Math.sin(r) * 62
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4080c8" strokeWidth="0.8" />
        })}
      </svg>
    </div>
  )
}

/* ── Estado vazio ──────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="text-center py-24">
      <div className="w-20 h-20 rounded-full bg-blue-950/40 border border-blue-800/30 flex items-center justify-center text-4xl mx-auto mb-6">
        🐉
      </div>
      <p className="text-amber-400 font-display text-xl mb-3 tracking-wide">
        Grimório Vazio
      </p>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto italic">
        As páginas aguardam. Crie sua primeira ficha e que a aventura comece.
      </p>
    </div>
  )
}

/* ── Card de personagem ────────────────────────────────────── */
function CharacterCard({ character: c, onSelect, confirmDelete, setConfirmDelete, onDelete }) {
  const icon = classIcon(c.info?.class)
  const subtitle = [
    c.info?.race,
    c.info?.class
      ? `${c.info.class} · Nível ${c.info.level ?? 1}`
      : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="group relative flex items-stretch border border-gray-700/80 hover:border-blue-700/60 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-[0_0_24px_rgba(40,90,152,0.13)] arcane-card">
      {/* Barra lateral de acento */}
      <div className="w-0.5 shrink-0 bg-gradient-to-b from-blue-600/50 via-blue-700/20 to-transparent group-hover:from-blue-400/70 transition-colors duration-300" />

      {/* Ícone da classe */}
      <div className="flex items-center justify-center w-14 bg-gray-900/60 group-hover:bg-blue-950/40 transition-colors text-2xl py-4 shrink-0 border-r border-gray-700/50">
        {icon}
      </div>

      {/* Info */}
      <button
        onClick={() => onSelect(c.id)}
        className="flex-1 text-left px-4 py-3.5 min-w-0"
      >
        <div className="font-semibold text-gray-100 font-display text-sm group-hover:text-amber-300 transition-colors truncate">
          {c.info?.name || (
            <span className="text-gray-500 italic font-body font-normal">Sem nome</span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 capitalize truncate">
          {subtitle || (
            <span className="italic text-gray-600">Personagem sem detalhes</span>
          )}
        </div>
      </button>

      {/* Confirmar exclusão */}
      {confirmDelete === c.id ? (
        <div className="flex items-center gap-2 px-3 shrink-0">
          <span className="text-xs text-red-400 font-display">Excluir?</span>
          <button
            onClick={() => onDelete(c.id)}
            className="text-xs px-2 py-1 bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded border border-red-800/60 transition-colors"
          >
            Sim
          </button>
          <button
            onClick={() => setConfirmDelete(null)}
            className="text-xs px-2 py-1 bg-gray-800/80 hover:bg-gray-700/80 text-gray-400 rounded border border-gray-700 transition-colors"
          >
            Não
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(c.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all px-4 text-xl leading-none shrink-0"
          title="Excluir personagem"
        >
          ×
        </button>
      )}
    </div>
  )
}

/* ── Componente principal ──────────────────────────────────── */
export function CharacterList({ onSelect, onCreate }) {
  const [characters, setCharacters] = useState(loadCharacters)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleDelete = useCallback((id) => {
    deleteCharacter(id)
    setCharacters(loadCharacters())
    setConfirmDelete(null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pb-24 relative overflow-hidden">

      {/* Névoa de atmosfera arcana */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-blue-900/20 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-900/12 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-xl pt-20">

        {/* ── Cabeçalho arcano ─────────────────────────────── */}
        <div className="text-center mb-12 relative">
          <ArcaneCircle />

          <div className="relative pt-4">
            <p className="text-blue-400/50 text-xs tracking-[0.4em] uppercase mb-5 font-display">
              D&D 5e · Sistema de Referência
            </p>

            <h1 className="text-6xl font-bold text-amber-400 font-display tracking-wider leading-none mb-1">
              Grimório
            </h1>
            <p className="text-gray-500 text-base font-display tracking-[0.2em]">
              de Personagens
            </p>

            {/* Divisor decorativo */}
            <div className="flex items-center gap-3 justify-center mt-7">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-800/50 to-blue-700/30" />
              <div className="flex gap-2 items-center">
                <div className="w-1.5 h-1.5 rotate-45 bg-amber-600/80" />
                <div className="w-2 h-2 rotate-45 bg-blue-500/60" />
                <div className="w-1.5 h-1.5 rotate-45 bg-amber-600/80" />
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-blue-800/50 to-blue-700/30" />
            </div>
          </div>
        </div>

        {/* ── Botão criar ──────────────────────────────────── */}
        <div className="flex justify-center mb-8">
          <button
            onClick={onCreate}
            className="group flex items-center gap-3 px-8 py-3
              bg-blue-950/50 border border-blue-700/50 hover:border-blue-500/70
              text-blue-200 hover:text-blue-100
              font-display text-sm tracking-[0.15em] uppercase rounded-lg
              transition-all duration-300
              shadow-[0_0_20px_rgba(40,90,152,0.18)] hover:shadow-[0_0_35px_rgba(40,90,152,0.32)]"
          >
            <span className="text-amber-400 text-base leading-none">✦</span>
            Nova Ficha
          </button>
        </div>

        {/* ── Lista / estado vazio ──────────────────────────── */}
        {characters.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {characters.map(c => (
              <CharacterCard
                key={c.id}
                character={c}
                onSelect={onSelect}
                confirmDelete={confirmDelete}
                setConfirmDelete={setConfirmDelete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* ── Rodapé decorativo ────────────────────────────── */}
        <div className="flex items-center gap-4 justify-center mt-14">
          <div className="h-px flex-1 bg-gray-800/50" />
          <span className="text-[11px] tracking-widest font-display text-gray-700">✦ ✦ ✦</span>
          <div className="h-px flex-1 bg-gray-800/50" />
        </div>
      </div>
    </div>
  )
}
