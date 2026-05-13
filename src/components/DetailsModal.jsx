import { useEffect, useRef } from 'react'

export function DetailsModal({ isOpen, onClose, children, title }) {
  const closeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Move foco para o botão de fechar ao abrir
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink-700/70 backdrop-blur-sm" />

      {/* Modal — pergaminho desenrolado */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-modal-title"
        className="relative z-10 bg-parchment-50 border-2 border-parchment-600 rounded-sm w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: 'var(--shadow-parchment-lg)' }}
      >
        {/* Filete duplo superior */}
        <div className="h-1 w-full bg-ink-300" />
        <div className="h-px w-full bg-ink-300 mt-0.5" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-parchment-600 bg-parchment-100">
          <div className="flex items-center gap-2">
            <span className="text-gilt-500 text-sm" aria-hidden="true">✦</span>
            <h2 id="details-modal-title" className="text-lg font-display text-ink-500 tracking-wide uppercase">{title}</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Fechar"
            className="text-ink-200 hover:text-ink-500 transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-parchment-200"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 text-ink-500">
          {children}
        </div>

        {/* Filete duplo inferior */}
        <div className="h-px w-full bg-ink-300 mb-0.5" />
        <div className="h-1 w-full bg-ink-300" />
      </div>
    </div>
  )
}
