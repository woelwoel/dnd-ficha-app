/* eslint-disable react-refresh/only-export-components */
import { memo, useCallback, useMemo, useRef } from 'react'

export const TABS = [
  { id: 'ficha',      label: 'Ficha',      icon: '◆' },  // stats + perícias + combate
  { id: 'magias',     label: 'Magias',     icon: '✧' },  // slots e lista de magias
  { id: 'acoes',      label: 'Habilidades/Ações', icon: '⊛' },  // ações + habilidades de classe/raça
  { id: 'inventario', label: 'Inventário', icon: '◈' },  // itens e moedas
  { id: 'progressao', label: 'Progressão', icon: '▲' },  // evolução de nível
  { id: 'notas',      label: 'Notas',      icon: '≡' },  // anotações e antecedente
]

/**
 * Navegação responsiva da ficha.
 *
 * Mobile  → barra horizontal scrollável (topo)
 * Desktop → sidebar vertical (esquerda)
 *
 * Acessibilidade: role="tablist" / role="tab" / aria-selected / aria-controls.
 * Teclado: ←/→ (mobile) ou ↑/↓ (desktop) + Home/End.
 */
function SheetTabsBase({ activeTab, onChange }) {
  const btnRefs = useRef({})
  const activeIndex = useMemo(
    () => Math.max(0, TABS.findIndex(t => t.id === activeTab)),
    [activeTab],
  )

  const focusTab = useCallback(index => {
    const tab = TABS[index]
    if (!tab) return
    onChange(tab.id)
    queueMicrotask(() => btnRefs.current[tab.id]?.focus())
  }, [onChange])

  const handleKeyDown = useCallback(e => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        focusTab((activeIndex + 1) % TABS.length)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        focusTab((activeIndex - 1 + TABS.length) % TABS.length)
        break
      case 'Home':
        e.preventDefault()
        focusTab(0)
        break
      case 'End':
        e.preventDefault()
        focusTab(TABS.length - 1)
        break
      default:
    }
  }, [activeIndex, focusTab])

  return (
    <div
      role="tablist"
      aria-label="Seções da ficha"
      onKeyDown={handleKeyDown}
      className={[
        /* base */
        'flex shrink-0 bg-gray-900/50',
        /* mobile: linha horizontal */
        'flex-row overflow-x-auto scrollbar-none border-b border-gray-700/70',
        /* desktop: coluna lateral */
        'lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto',
        'lg:w-44 lg:border-b-0 lg:border-r lg:border-gray-700/70',
        'lg:py-3 lg:gap-px',
      ].join(' ')}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            ref={el => { btnRefs.current[tab.id] = el }}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={[
              'relative flex items-center shrink-0',
              /* mobile */
              'gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap',
              /* desktop */
              'lg:gap-3 lg:px-5 lg:py-3 lg:text-sm lg:whitespace-normal lg:w-full',
              'transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
              isActive
                ? 'text-amber-300'
                : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/40',
            ].join(' ')}
          >
            {/* Indicador mobile: barra embaixo */}
            {isActive && (
              <span
                className="lg:hidden absolute bottom-0 inset-x-1 h-0.5 rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-amber-400"
                aria-hidden
              />
            )}
            {/* Indicador desktop: barra à esquerda + fundo */}
            {isActive && (
              <>
                <span
                  className="hidden lg:block absolute left-0 inset-y-1.5 w-0.5 rounded-r-full bg-gradient-to-b from-blue-400 to-amber-400"
                  aria-hidden
                />
                <span
                  className="hidden lg:block absolute inset-0 bg-blue-950/40 rounded-none"
                  aria-hidden
                />
              </>
            )}

            {/* Conteúdo do botão */}
            <span className="relative text-sm lg:text-base" aria-hidden>
              {tab.icon}
            </span>
            <span className="relative font-display tracking-wide">
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export const SheetTabs = memo(SheetTabsBase)

/* ── Banners ─────────────────────────────────────────────────── */

export const NavBlockedBanner = memo(function NavBlockedBanner({ onReview, onDismiss }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 bg-red-900/30 border border-red-700/60 rounded-lg px-4 py-3 text-sm"
    >
      <div className="flex items-center gap-2 text-red-300">
        <svg aria-hidden className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Corrija os erros antes de avançar.
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onReview} className="text-xs text-red-300 hover:text-white underline whitespace-nowrap">
          Revisar
        </button>
        {onDismiss && (
          <button onClick={onDismiss} className="text-red-400 hover:text-white text-lg leading-none" aria-label="Fechar">
            ✕
          </button>
        )}
      </div>
    </div>
  )
})

export const ImportErrorBanner = memo(function ImportErrorBanner({ message, onDismiss }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 bg-red-900/30 border border-red-700/60 rounded-lg px-4 py-3 text-sm">
      <span className="text-red-300">{message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-white text-lg leading-none" aria-label="Fechar">✕</button>
    </div>
  )
})
