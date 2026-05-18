import { useState, useRef } from 'react'
import { ClassIcon } from '../../utils/class-icons'
import { MapTooltip } from './MapTooltip'

function toRoman(num) {
  if (!Number.isFinite(num) || num <= 0) return '—'
  const map = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let r = ''
  let n = num
  for (const [v, s] of map) {
    while (n >= v) { r += s; n -= v }
  }
  return r
}

/**
 * Token individual no mapa. Posicionado em coordenadas normalizadas
 * (position.x e position.y em 0..1) → traduzidas em % CSS.
 *
 * Click → onSelect(id). Hover/focus mostra MapTooltip.
 *
 * Drag é wired via onDragStart prop (controlled pelo parent CharacterMap).
 */
export function CharacterToken({ character, onSelect, onDragStart }) {
  const [hovered, setHovered] = useState(false)
  const buttonRef = useRef(null)

  const { id, info = {}, position = { x: 0.5, y: 0.5 } } = character
  const lv = info.level ?? 1
  const romanLv = toRoman(lv)

  const ariaLabel = [
    info.name || 'Personagem',
    info.class,
    `nível ${lv}`,
  ].filter(Boolean).join(', ')

  function handlePointerDown(e) {
    if (onDragStart) onDragStart(e, id)
  }

  function handleClick() {
    if (onSelect) onSelect(id)
  }

  return (
    <div
      className="absolute z-[6] text-center -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${(position.x * 100).toFixed(2)}%`,
        top:  `${(position.y * 100).toFixed(2)}%`,
        width: '76px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="relative block mx-auto rounded-full transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-none"
        style={{
          width: '56px',
          height: '56px',
          background: 'radial-gradient(circle at 30% 25%, #faf2da 0%, #e8dcc0 35%, #b89855 75%, #6e572b 100%)',
          border: '3px solid var(--color-shell-800)',
          boxShadow: 'var(--shadow-token)',
          color: 'var(--color-ink-on-map)',
          cursor: onDragStart ? 'grab' : 'pointer',
        }}
      >
        <span className="absolute inset-0 grid place-items-center">
          <ClassIcon classKey={info.class} size={32} />
        </span>
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 rounded-full grid place-items-center font-bold"
          style={{
            background: 'linear-gradient(180deg, var(--color-blood), #5a0000)',
            color: 'var(--color-ink-inverse)',
            border: '2px solid var(--color-shell-800)',
            width: '22px',
            height: '22px',
            fontSize: '10px',
            fontFamily: 'IM Fell English SC, serif',
          }}
        >
          {romanLv}
        </span>
      </button>
      <div
        className="mt-1 inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold leading-tight max-w-full truncate"
        style={{
          background: 'rgba(255,251,242,0.95)',
          border: '1px solid var(--color-shell-border)',
          color: 'var(--color-ink-on-map)',
          fontFamily: 'IM Fell English SC, EB Garamond, serif',
          letterSpacing: '0.04em',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        {info.name || 'Sem nome'}
      </div>
      {hovered && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-20 pointer-events-none">
          <MapTooltip character={character} />
        </div>
      )}
    </div>
  )
}
