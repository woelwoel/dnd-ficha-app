/* eslint-disable react-refresh/only-export-components */
import { memo, useCallback, useMemo, useRef } from 'react'

export const TABS = [
  { id: 'ficha',       label: 'Ficha'       },
  { id: 'percias',     label: 'Perícias'    },
  { id: 'magias',      label: 'Magias'      },
  { id: 'inventario',  label: 'Inventário'  },
  { id: 'notas',       label: 'Notas'       },
  { id: 'visualizar',  label: 'Visualizar'  },
]

/**
 * Barra de abas acessível.
 * - role="tablist" / role="tab" / aria-selected / aria-controls
 * - roving tabindex: só a aba ativa tem tabIndex=0
 * - navegação por teclado: ←/→ circular, Home/End para extremos
 *
 * O painel controlado por cada aba deve ter `role="tabpanel"`
 * e `id={"tabpanel-" + tab.id}` (ver SheetContent).
 */
function SheetTabsBase({ activeTab, onChange }) {
  const btnRefs = useRef({})
  const activeIndex = useMemo(
    () => Math.max(0, TABS.findIndex(t => t.id === activeTab)),
    [activeTab]
  )

  const focusTab = useCallback(index => {
    const tab = TABS[index]
    if (!tab) return
    onChange(tab.id)
    // Foca no próximo tick para garantir que o render aplicou tabIndex.
    queueMicrotask(() => btnRefs.current[tab.id]?.focus())
  }, [onChange])

  const handleKeyDown = useCallback(e => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        focusTab((activeIndex + 1) % TABS.length)
        break
      case 'ArrowLeft':
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
      className="flex gap-0.5 border-b border-gray-700 overflow-x-auto scrollbar-none"
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
            className={`px-3 py-2 text-xs font-display tracking-wide whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isActive
                ? 'text-amber-400 border-b-2 border-amber-500 -mb-px bg-amber-950/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export const SheetTabs = memo(SheetTabsBase)

export const NavBlockedBanner = memo(function NavBlockedBanner({ onReview, onDismiss }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm"
    >
      <div className="flex items-center gap-2 text-red-300">
        <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Corrija os erros antes de avançar para a próxima aba.
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onReview} className="text-xs text-red-300 hover:text-white underline whitespace-nowrap">
          Revisar erros
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
    <div role="alert" className="flex items-center justify-between gap-3 bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm">
      <span className="text-red-300">{message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-white text-lg leading-none" aria-label="Fechar">✕</button>
    </div>
  )
})
