/* eslint-disable react-refresh/only-export-components */
export const TABS = [
  { id: 'ficha',       label: 'Ficha'       },
  { id: 'percias',     label: 'Perícias'    },
  { id: 'magias',      label: 'Magias'      },
  { id: 'inventario',  label: 'Inventário'  },
  { id: 'notas',       label: 'Notas'       },
  { id: 'visualizar',  label: 'Visualizar'  },
]

export function SheetTabs({ activeTab, onChange }) {
  return (
    <div className="flex gap-0.5 border-b border-gray-700 overflow-x-auto scrollbar-none">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-2 text-xs font-display tracking-wide whitespace-nowrap transition-all ${
            activeTab === tab.id
              ? 'text-amber-400 border-b-2 border-amber-500 -mb-px bg-amber-950/30'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function NavBlockedBanner({ onReview, onDismiss }) {
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
}

export function ImportErrorBanner({ message, onDismiss }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm">
      <span className="text-red-300">{message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-white text-lg leading-none">✕</button>
    </div>
  )
}
