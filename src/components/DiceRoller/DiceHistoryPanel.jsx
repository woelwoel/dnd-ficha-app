import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
    <div className="flex items-start justify-between gap-2 py-2 border-b border-dotted border-parchment-600/60 last:border-0">
      <div className="min-w-0 flex-1">
        {entry.label && (
          <p className="text-xs text-ink-500 font-display tracking-wide truncate leading-tight">{entry.label}</p>
        )}
        <p className="text-[11px] ink-italic font-mono">{entry.notation}</p>
        {entry.rolls?.length > 0 && (
          <p className="text-[11px] ink-italic">
            [{entry.rolls.join(', ')}]
            {entry.modifier !== 0 ? ` ${entry.modifier > 0 ? '+' : ''}${entry.modifier}` : ''}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <span className={`text-xl font-bold leading-none font-mono ${
          isCrit   ? 'text-ink-600'  :
          isFumble ? 'text-ink-200'  :
                     'text-ink-500'
        }`}>
          {entry.total}
          {isCrit   && <span className="text-sm ml-0.5">✦</span>}
          {isFumble && <span className="text-sm ml-0.5">✗</span>}
        </span>
        <span className="text-[10px] ink-italic">{timeAgo(entry.timestamp)}</span>
      </div>
    </div>
  )
}

/**
 * Painel flutuante de histórico de dados.
 *
 * Renderiza via createPortal direto no <body> para garantir que position:fixed
 * seja sempre relativo ao viewport, independente de transforms nos ancestrais.
 *
 * Fechado → botão 🎲 arcano no canto inferior direito.
 * Aberto  → mini-janela arrastável (arraste pelo cabeçalho).
 */
export function DiceHistoryPanel() {
  const { history, clearHistory, open, togglePanel } = useDiceRoller()

  // null = posição padrão (canto inferior direito)
  // {x, y} = posição após arrasto (left/top do viewport)
  const [pos, setPos] = useState(null)
  const panelRef = useRef(null)
  const dragRef  = useRef(null) // { startX, startY, origX, origY }
  const moveRef  = useRef(null)
  const upRef    = useRef(null)

  /* ── Limpa listeners ao desmontar ──────────────────────────── */
  useEffect(() => () => {
    if (moveRef.current) window.removeEventListener('pointermove', moveRef.current)
    if (upRef.current)   window.removeEventListener('pointerup',   upRef.current)
  }, [])

  /* ── Fecha e reseta para o canto padrão ─────────────────────── */
  function handleClose() {
    setPos(null)
    togglePanel()
  }

  /* ── Início do arrasto no cabeçalho ─────────────────────────── */
  function startDrag(e) {
    // Só mouse esquerdo ou toque
    if (e.pointerType === 'mouse' && e.button !== 0) return

    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return

    // Guarda referência do estado de arrasto sem setTimeout
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX:  rect.left,
      origY:  rect.top,
    }

    // Captura o pointer para receber eventos mesmo fora da janela
    panelRef.current?.setPointerCapture?.(e.pointerId)

    let hasMoved = false

    moveRef.current = (me) => {
      const { startX, startY, origX, origY } = dragRef.current
      const dx = me.clientX - startX
      const dy = me.clientY - startY

      // Só inicia drag após movimento mínimo de 4px (evita salto no click simples)
      if (!hasMoved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      hasMoved = true

      const W = panelRef.current?.offsetWidth  ?? 288
      const H = panelRef.current?.offsetHeight ?? 300
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - W, origX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - H, origY + dy)),
      })
    }

    upRef.current = () => {
      window.removeEventListener('pointermove', moveRef.current)
      window.removeEventListener('pointerup',   upRef.current)
      dragRef.current = null
    }

    window.addEventListener('pointermove', moveRef.current)
    window.addEventListener('pointerup',   upRef.current)
  }

  /* ── Estilos de posição ──────────────────────────────────────
   * Usamos position:'fixed' via inline style (prioridade máxima)
   * para sobrepor qualquer CSS de classe (ex: arcane-card tem
   * position:relative que perderia para o inline style).
   * ─────────────────────────────────────────────────────────── */
  const baseStyle = {
    position:  'fixed',
    zIndex:    50,
    maxHeight: '60vh',
  }
  const posStyle = pos
    ? { ...baseStyle, left: pos.x, top: pos.y }
    : { ...baseStyle, bottom: '1.25rem', right: '1.25rem' }

  /* ── Botão quando fechado ──────────────────────────────────── */
  const button = !open ? (
    <button
      onClick={togglePanel}
      style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 50 }}
      className="w-12 h-12 rounded-full
        bg-parchment-100 hover:bg-parchment-200 border-2 border-ink-300 hover:border-ink-500
        text-xl flex items-center justify-center transition-all duration-200"
      style={{ boxShadow: 'var(--shadow-parchment)' }}
      title="Histórico de dados (🎲)"
      aria-label="Abrir histórico de rolagens"
    >
      🎲
    </button>
  ) : null

  /* ── Painel quando aberto ──────────────────────────────────── */
  const last = history[0]
  const panel = open ? (
    <div
      ref={panelRef}
      className="w-72 rounded-lg flex flex-col
        border-2 border-parchment-600 bg-parchment-50"
      style={{ ...posStyle, boxShadow: 'var(--shadow-parchment-lg)' }}
    >
      {/* ── Cabeçalho / alça de arrasto ─────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b-2 border-parchment-600 shrink-0
          cursor-grab active:cursor-grabbing select-none rounded-t-lg
          bg-parchment-200"
        onPointerDown={startDrag}
        title="Arraste para mover"
      >
        <span className="text-base shrink-0 pointer-events-none" aria-hidden>🎲</span>
        <h3 className="text-sm font-display text-ink-500 tracking-wide flex-1 pointer-events-none uppercase">
          Rolagens
        </h3>
        {last && (
          <span className="text-xs ink-italic font-mono pointer-events-none">
            último: <span className="text-ink-500 font-bold">{last.total}</span>
          </span>
        )}
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            onPointerDown={e => e.stopPropagation()}
            className="text-[11px] text-ink-200 hover:text-ink-500 underline transition-colors px-1 py-0.5"
          >
            limpar
          </button>
        )}
        <button
          onClick={handleClose}
          onPointerDown={e => e.stopPropagation()}
          className="text-ink-200 hover:text-ink-500 transition-colors leading-none ml-1 px-1 py-0.5"
          aria-label="Fechar painel de dados"
        >
          ✕
        </button>
      </div>

      {/* ── Histórico ─────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-3 py-1 min-h-0 bg-parchment-50 rounded-b-lg"
      >
        {history.length === 0 ? (
          <div className="py-8 text-center text-ink-200">
            <p className="text-3xl mb-2">🎲</p>
            <p className="text-xs ink-italic">Nenhuma rolagem ainda.</p>
            <p className="text-xs mt-1 ink-italic">
              Clique em 🎲 ao lado de perícias,<br />salvaguardas e ataques.
            </p>
          </div>
        ) : (
          history.map(e => <RollEntry key={e.id} entry={e} />)
        )}
      </div>
    </div>
  ) : null

  /* ── Renderiza via portal direto no body ─────────────────────── */
  return createPortal(
    <>{button}{panel}</>,
    document.body
  )
}
