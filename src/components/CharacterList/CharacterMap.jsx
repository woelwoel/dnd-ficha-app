import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { CharacterToken } from './CharacterToken'
import { Banner } from '../ui/Banner'
import { CAMPAIGN_NAME_DEFAULT } from '../../utils/config'
import { getDefaultPosition, clampPosition } from '../../utils/token-position'

const DRAG_THRESHOLD_PX = 4

export function CharacterMap({
  characters = [],
  campaignName = CAMPAIGN_NAME_DEFAULT,
  onSelect,
  onPositionChange,
}) {
  const containerRef = useRef(null)
  const dragState = useRef(null)
  // Cleanup ref para o drag em vigor (limpo no unmount ou em novo drag).
  const cleanupRef = useRef(null)
  const [draggedPositions, setDraggedPositions] = useState({})

  const positioned = useMemo(
    () => characters.map(c => ({
      ...c,
      position: draggedPositions[c.id] || c.position || getDefaultPosition(c, 'default'),
    })),
    [characters, draggedPositions]
  )

  const computePos = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return clampPosition({
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    })
  }, [])

  const handleTokenDragStart = useCallback((e, id) => {
    // Limpa drag anterior se houver (segurança).
    if (cleanupRef.current) cleanupRef.current()

    dragState.current = {
      id, startX: e.clientX, startY: e.clientY, moved: false, lastPos: null,
    }

    function onMove(ev) {
      const st = dragState.current
      if (!st) return
      const dx = Math.abs(ev.clientX - st.startX)
      const dy = Math.abs(ev.clientY - st.startY)
      if (!st.moved && (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX)) {
        st.moved = true
      }
      if (st.moved) {
        const pos = computePos(ev.clientX, ev.clientY)
        if (pos) {
          st.lastPos = pos
          setDraggedPositions(prev => ({ ...prev, [st.id]: pos }))
        }
      }
    }

    function onUp() {
      const st = dragState.current
      cleanup()
      dragState.current = null
      if (!st) return
      if (st.moved && st.lastPos && onPositionChange) {
        onPositionChange(st.id, st.lastPos)
        setDraggedPositions(prev => {
          const next = { ...prev }
          delete next[st.id]
          return next
        })
      } else if (!st.moved && onSelect) {
        onSelect(st.id)
      }
    }

    function cleanup() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      cleanupRef.current = null
    }

    cleanupRef.current = cleanup
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    e.preventDefault()
  }, [computePos, onSelect, onPositionChange])

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  // Click é tratado pelo pointerup quando moved === false; CharacterToken's
  // onClick fica como no-op para evitar disparo duplo.
  const noopSelect = useCallback(() => {}, [])

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa da campanha"
      className="map-frame relative w-full h-full overflow-hidden rounded"
    >
      <div
        data-testid="character-map-canvas"
        className="map-canvas absolute inset-0 bg-center bg-cover bg-no-repeat"
      />

      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[320px] max-w-[80%] z-[10]">
        <Banner>{campaignName}</Banner>
      </div>

      <svg
        viewBox="0 0 78 78"
        className="absolute bottom-3 right-3 z-[4] w-[78px] h-[78px] opacity-85"
        aria-hidden="true"
      >
        <circle cx="39" cy="39" r="34" fill="rgba(244,234,211,0.55)" stroke="var(--color-shell-800)" strokeWidth="1.8"/>
        <circle cx="39" cy="39" r="26" fill="none" stroke="var(--color-shell-800)" strokeWidth="0.8"/>
        <circle cx="39" cy="39" r="3" fill="var(--color-shell-800)"/>
        <path d="M39,5 L43,39 L39,73 L35,39 Z" fill="var(--color-shell-800)"/>
        <path d="M5,39 L39,43 L73,39 L39,35 Z" fill="var(--color-shell-800)" opacity="0.55"/>
        <text x="39" y="3.5" textAnchor="middle" fontSize="7" fill="var(--color-shell-800)" fontWeight="700">N</text>
      </svg>

      {positioned.map(c => (
        <CharacterToken
          key={c.id}
          character={c}
          onSelect={noopSelect}
          onDragStart={handleTokenDragStart}
        />
      ))}
    </div>
  )
}
