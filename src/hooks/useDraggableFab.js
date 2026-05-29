import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Hook pra botão flutuante (FAB) arrastável com posição persistida.
 *
 * Comportamento:
 *  - Sem posição salva → usa `defaultAnchor` (ex.: `{ bottom: 20, right: 20 }`).
 *  - Após o primeiro arrasto → posição absoluta `{ left, top }` em px, persistida
 *    em `localStorage[storageKey]`.
 *  - Resize de janela → clampa pra dentro do viewport.
 *  - Click após drag é suprimido por ~200ms (evita disparar a ação ao soltar).
 *
 * Retorna:
 *   - `style`        — aplicar inline no botão; já inclui `position: fixed`.
 *   - `onPointerDown`— handler pra começar o arrasto.
 *   - `isDragSuppressed()` — chame no início do `onClick` pra abortar quando
 *      o pointerup foi um fim-de-arrasto e não um click puro.
 *   - `resetPosition()` — volta pro `defaultAnchor` e limpa localStorage.
 *
 * Threshold de 4px evita salto em clicks levemente trêmulos no toque.
 */
const DRAG_THRESHOLD = 4 // px
const SUPPRESS_MS    = 200

export function useDraggableFab(storageKey, defaultAnchor = { bottom: 20, right: 20 }) {
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return null
      const p = JSON.parse(raw)
      if (typeof p?.x === 'number' && typeof p?.y === 'number') return p
    } catch { /* ignore */ }
    return null
  })

  const elRef         = useRef(null)
  const dragState     = useRef(null)
  const suppressRef   = useRef(false)

  const onPointerDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const el = e.currentTarget
    elRef.current = el
    const rect = el.getBoundingClientRect()
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX:  rect.left,
      origY:  rect.top,
      moved:  false,
    }
    try { el.setPointerCapture(e.pointerId) } catch { /* não suportado */ }

    function onMove(me) {
      const s = dragState.current
      if (!s) return
      const dx = me.clientX - s.startX
      const dy = me.clientY - s.startY
      if (!s.moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
      s.moved = true
      const w = el.offsetWidth  || 48
      const h = el.offsetHeight || 48
      const x = Math.max(0, Math.min(window.innerWidth  - w, s.origX + dx))
      const y = Math.max(0, Math.min(window.innerHeight - h, s.origY + dy))
      setPos({ x, y })
    }

    function onUp(ue) {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
      const s = dragState.current
      dragState.current = null
      try { el.releasePointerCapture?.(ue.pointerId) } catch { /* ok */ }
      if (s?.moved) {
        // Suprime o click que vai disparar depois do pointerup.
        suppressRef.current = true
        setTimeout(() => { suppressRef.current = false }, SUPPRESS_MS)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
  }, [])

  // Persistência
  useEffect(() => {
    if (!pos) return
    try { localStorage.setItem(storageKey, JSON.stringify(pos)) } catch { /* full */ }
  }, [pos, storageKey])

  // Reposicionar se o viewport encolher
  useEffect(() => {
    if (!pos) return
    function onResize() {
      const el = elRef.current
      const w = el?.offsetWidth  || 48
      const h = el?.offsetHeight || 48
      setPos(p => p && ({
        x: Math.max(0, Math.min(window.innerWidth  - w, p.x)),
        y: Math.max(0, Math.min(window.innerHeight - h, p.y)),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pos])

  function isDragSuppressed() {
    return suppressRef.current
  }

  function resetPosition() {
    setPos(null)
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
  }

  const style = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : {
        position: 'fixed',
        ...Object.fromEntries(
          Object.entries(defaultAnchor).map(([k, v]) => [k, typeof v === 'number' ? `${v}px` : v]),
        ),
      }

  return { style, onPointerDown, isDragSuppressed, resetPosition }
}
