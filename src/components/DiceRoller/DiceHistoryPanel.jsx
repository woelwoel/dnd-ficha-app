import { useDiceRoller } from '../../context/DiceRollerContext'

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)   return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

function RollEntry({ entry }) {
  const isCrit   = entry.sides === 20 && entry.rolls?.length > 0 && Math.max(...entry.rolls) === 20
  const isFumble = entry.sides === 20 && entry.rolls?.length === 1 && entry.rolls[0] === 1

  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-gray-700/40 last:border-0">
      <div className="min-w-0 flex-1">
        {entry.label && (
          <p className="text-xs text-gray-200 font-semibold truncate leading-tight">{entry.label}</p>
        )}
        <p className="text-[11px] text-gray-600 font-mono">{entry.notation}</p>
        {entry.rolls?.length > 0 && (
          <p className="text-[11px] text-gray-500">
            [{entry.rolls.join(', ')}]
            {entry.modifier !== 0 ? ` ${entry.modifier > 0 ? '+' : ''}${entry.modifier}` : ''}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <span className={`text-xl font-bold leading-none font-mono ${
          isCrit   ? 'text-green-400'  :
          isFumble ? 'text-red-400'    :
                     'text-amber-400'
        }`}>
          {entry.total}
          {isCrit   && <span className="text-sm ml-0.5">✦</span>}
          {isFumble && <span className="text-sm ml-0.5">✗</span>}
        </span>
        <span className="text-[10px] text-gray-600">{timeAgo(entry.timestamp)}</span>
      </div>
    </div>
  )
}

/**
 * Painel flutuante de histórico de dados.
 * Fechado → botão 🎲 arcano no canto inferior direito.
 * Aberto  → card com histórico de rolagens.
 */
export function DiceHistoryPanel() {
  const { history, clearHistory, open, togglePanel } = useDiceRoller()

  if (!open) {
    return (
      <button
        onClick={togglePanel}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full
          bg-blue-900/70 hover:bg-blue-800/80 border border-blue-700/60 hover:border-blue-500
          shadow-[0_0_20px_rgba(40,90,152,0.3)] hover:shadow-[0_0_28px_rgba(40,90,152,0.45)]
          text-xl flex items-center justify-center transition-all duration-200"
        title="Histórico de dados (🎲)"
        aria-label="Abrir histórico de rolagens"
      >
        🎲
      </button>
    )
  }

  const last = history[0]

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-72 rounded-xl flex flex-col
        border border-gray-700/70 bg-gray-900/95 backdrop-blur-md
        shadow-[0_0_40px_rgba(3,5,13,0.8),0_0_0_1px_rgba(40,90,152,0.15)] arcane-card"
      style={{ maxHeight: '70vh' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-700/50 shrink-0">
        <span className="text-base shrink-0" aria-hidden>🎲</span>
        <h3 className="text-sm font-bold text-amber-400 font-display tracking-wide flex-1">
          Rolagens
        </h3>
        {last && (
          <span className="text-xs text-gray-500 font-mono">
            último: <span className="text-amber-300 font-bold">{last.total}</span>
          </span>
        )}
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-[11px] text-gray-600 hover:text-red-400 transition-colors"
          >
            limpar
          </button>
        )}
        <button
          onClick={togglePanel}
          className="text-gray-500 hover:text-gray-100 transition-colors leading-none ml-1"
          aria-label="Fechar painel de dados"
        >
          ✕
        </button>
      </div>

      {/* Histórico */}
      <div className="flex-1 overflow-y-auto px-3 py-1 min-h-0">
        {history.length === 0 ? (
          <div className="py-8 text-center text-gray-600">
            <p className="text-3xl mb-2">🎲</p>
            <p className="text-xs">Nenhuma rolagem ainda.</p>
            <p className="text-xs mt-1 text-gray-700">
              Clique em 🎲 ao lado de perícias,<br />salvaguardas e ataques.
            </p>
          </div>
        ) : (
          history.map(e => <RollEntry key={e.id} entry={e} />)
        )}
      </div>
    </div>
  )
}
