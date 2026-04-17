import { useEffect } from 'react'

export function DetailsModal({ isOpen, onClose, children, title }) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
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
      {/* Backdrop com textura */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 bg-gray-900 border border-amber-800 rounded-xl shadow-2xl shadow-black/60 w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: '0 0 0 1px rgba(212,168,67,0.12), 0 25px 60px rgba(0,0,0,0.7)' }}
      >
        {/* Linha ornamental superior */}
        <div className="h-0.5 w-full rounded-t-xl bg-gradient-to-r from-transparent via-amber-600 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-amber-700 text-sm">✦</span>
            <h2 className="text-lg font-bold text-amber-400 font-display tracking-wide">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-amber-400 transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {children}
        </div>

        {/* Linha ornamental inferior */}
        <div className="h-0.5 w-full rounded-b-xl bg-gradient-to-r from-transparent via-amber-800 to-transparent" />
      </div>
    </div>
  )
}
