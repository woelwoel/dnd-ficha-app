import { useState } from 'react'
import { BestiaryModal } from './BestiaryModal'
import { useDraggableFab } from '../../hooks/useDraggableFab'
import { Icon } from '../ui/Icon'

export function BestiaryButton() {
  const [open, setOpen] = useState(false)
  const { style, onPointerDown, isDragSuppressed } = useDraggableFab(
    'dnd-ficha:fab-bestiary',
    { bottom: 20, right: 80 }, // ao lado do dado (que fica em right: 20)
  )

  function handleClick() {
    if (isDragSuppressed()) return
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={onPointerDown}
        onClick={handleClick}
        title="Bestiário SRD — arraste para mover"
        aria-label="Abrir bestiário"
        style={{ ...style, zIndex: 50, touchAction: 'none' }}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200 border-2 bg-parchment-100/60 hover:bg-parchment-200/90 border-ink-300/70 hover:border-ink-500 text-ink-500 shadow-parchment backdrop-blur-sm cursor-grab active:cursor-grabbing"
      >
        <Icon name="skull" size={22} strokeWidth={1.75} />
      </button>
      <BestiaryModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
