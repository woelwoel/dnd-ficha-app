/* eslint-disable react-refresh/only-export-components */
import { memo, useCallback, useMemo, useRef } from 'react'

export const TABS = [
  { id: 'ficha',      label: 'Ficha',      icon: '◆' },
  { id: 'magias',     label: 'Magias',     icon: '✧' },
  { id: 'acoes',      label: 'Habilidades/Ações', icon: '⊛' },
  { id: 'inventario', label: 'Inventário', icon: '◈' },
  { id: 'progressao', label: 'Progressão', icon: '▲' },
  { id: 'notas',      label: 'Notas',      icon: '≡' },
]

/**
 * Navegação como "marcadores de livro" — sépia, fonte serifada display,
 * indicador ornamental para aba ativa.
 *
 * Mobile  → barra horizontal scrollável (topo)
 * Desktop → coluna lateral (esquerda) imitando guias de pergaminho
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
        'flex shrink-0',
        /* mobile: linha horizontal de guias */
        'flex-row overflow-x-auto scrollbar-none',
        'border-b border-parchment-600 bg-parchment-300',
        /* desktop: coluna lateral, guias de pergaminho */
        'lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto',
        'lg:w-48 lg:border-b-0 lg:border-r-2 lg:border-parchment-600',
        'lg:bg-parchment-100 lg:py-4 lg:gap-1',
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
              'gap-2 px-4 py-2.5 whitespace-nowrap',
              'lg:gap-3 lg:px-5 lg:py-3 lg:w-full',
              'font-display tracking-wider',
              'transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-200',
              isActive
                ? 'text-ink-500 bg-parchment-50 border border-parchment-600 lg:border-r-0 lg:border-l-4 lg:border-l-ink-500 -mb-px lg:-mr-0.5'
                : 'text-ink-200 hover:text-ink-500 hover:bg-parchment-200 border border-transparent',
            ].join(' ')}
          >
            <span className="text-base" aria-hidden>
              {tab.icon}
            </span>
            <span className="text-sm">
              {tab.label}
            </span>
            {isActive && (
              <span
                className="hidden lg:inline ml-auto text-gilt-500 text-xs"
                aria-hidden
              >
                ❧
              </span>
            )}
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
      className="flex items-center justify-between gap-3 bg-parchment-50 border border-ink-200 rounded-lg px-4 py-3 text-sm"
    >
      <div className="flex items-center gap-2 ink-italic">
        <span aria-hidden className="text-base">◆</span>
        Corrija os erros antes de avançar.
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onReview} className="text-xs ink-italic hover:text-ink-500 underline whitespace-nowrap">
          Revisar
        </button>
        {onDismiss && (
          <button onClick={onDismiss} className="text-ink-200 hover:text-ink-500 text-lg leading-none" aria-label="Fechar">
            ✕
          </button>
        )}
      </div>
    </div>
  )
})

export const ImportErrorBanner = memo(function ImportErrorBanner({ message, onDismiss }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 bg-parchment-50 border border-ink-200 rounded-lg px-4 py-3 text-sm">
      <span className="ink-italic">{message}</span>
      <button onClick={onDismiss} className="text-ink-200 hover:text-ink-500 text-lg leading-none" aria-label="Fechar">✕</button>
    </div>
  )
})
