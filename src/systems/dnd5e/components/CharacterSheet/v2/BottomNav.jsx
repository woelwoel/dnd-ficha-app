/* eslint-disable react-refresh/only-export-components */
import { useRef } from 'react'

export const MOBILE_SECTIONS = [
  { id: 'ficha',      label: 'Ficha',  icon: '◆' },
  { id: 'acoes',      label: 'Ações',  icon: '⊛' },
  { id: 'magias',     label: 'Magias', icon: '✧' },
  { id: 'inventario', label: 'Itens',  icon: '◈' },
  { id: 'mais',       label: 'Mais',   icon: '≡' },
]

/**
 * Navegação inferior do mobile (< lg). Componente CONTROLADO: `active` + `onChange`.
 * Mesmo padrão de teclado do tablist do MainBox (roving tabindex + setas).
 */
export function BottomNav({ active, onChange }) {
  const refs = useRef({})

  function go(i) {
    const target = MOBILE_SECTIONS[(i + MOBILE_SECTIONS.length) % MOBILE_SECTIONS.length]
    onChange(target.id)
    queueMicrotask(() => refs.current[target.id]?.focus())
  }

  function onKeyDown(e) {
    const idx = MOBILE_SECTIONS.findIndex(s => s.id === active)
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); go(idx + 1); break
      case 'ArrowLeft':  e.preventDefault(); go(idx - 1); break
      case 'Home':       e.preventDefault(); go(0); break
      case 'End':        e.preventDefault(); go(MOBILE_SECTIONS.length - 1); break
      default:
    }
  }

  return (
    <nav className="v2-bottomnav lg:hidden" aria-label="Seções da ficha">
      <div role="tablist" aria-label="Seções da ficha" onKeyDown={onKeyDown} style={{ display: 'flex' }}>
        {MOBILE_SECTIONS.map(s => (
          <button
            key={s.id}
            ref={el => { refs.current[s.id] = el }}
            role="tab"
            type="button"
            className="v2-bottomnav-item"
            aria-selected={active === s.id}
            tabIndex={active === s.id ? 0 : -1}
            onClick={() => onChange(s.id)}
          >
            <span aria-hidden style={{ fontSize: 16 }}>{s.icon}</span>
            <span style={{ fontSize: 11 }}>{s.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
