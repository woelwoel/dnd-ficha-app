import { useEffect } from 'react'

export function BlockEditorModal({ open, title, onClose, onClear, children }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-parchment-50 border-2 border-parchment-600 rounded-sm overflow-hidden"
        style={{ boxShadow: 'var(--shadow-parchment-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b-2 border-parchment-600 bg-parchment-100">
          <h2 className="text-base font-display text-ink-500 tracking-widest uppercase">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-ink-300 hover:text-ink-500 text-lg leading-none"
          >✕</button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <footer className="flex items-center justify-between gap-3 px-5 py-3 border-t-2 border-parchment-600 bg-parchment-100">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-display tracking-wide text-ink-300 hover:text-ink-500 uppercase"
            >Limpar</button>
          ) : <span />}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-sm border-2 border-ink-300 hover:border-ink-500 text-ink-500 text-sm font-display tracking-wide bg-parchment-50 hover:bg-parchment-100"
          >Fechar</button>
        </footer>
      </div>
    </div>
  )
}
