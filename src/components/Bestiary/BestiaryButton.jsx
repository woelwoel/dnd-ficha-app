import { useState } from 'react'
import { BestiaryModal } from './BestiaryModal'

export function BestiaryButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Bestiário SRD"
        aria-label="Abrir bestiário"
        style={{
          position: 'fixed', bottom: '1.25rem', right: '5rem', zIndex: 50,
          boxShadow: 'var(--shadow-parchment, 0 4px 16px rgba(0,0,0,0.4))',
        }}
        className="w-12 h-12 rounded-full text-xl flex items-center justify-center transition-all duration-200 border-2 bg-parchment-100 hover:bg-parchment-200 border-ink-300 hover:border-ink-500"
      >
        🐉
      </button>
      <BestiaryModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
