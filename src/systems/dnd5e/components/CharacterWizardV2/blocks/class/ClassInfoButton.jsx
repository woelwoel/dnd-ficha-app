import { useState } from 'react'
import { Modal } from '../../../../../../components/ui/Modal'
import { Icon } from '../../../../../../components/ui/Icon'
import { ClassInfoContent } from './ClassInfoContent'

/**
 * Botão ℹ ao lado do seletor de classe. Só aparece quando há classe
 * selecionada (classData). Ao clicar, abre um modal em pergaminho com papéis,
 * resumo e lore completa da classe.
 */
export function ClassInfoButton({ classData }) {
  const [open, setOpen] = useState(false)
  if (!classData) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Sobre a classe ${classData.name}`}
        title={`Sobre a classe ${classData.name}`}
        className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-sm border-2 border-parchment-600 text-ink-300 hover:text-ink-600 hover:border-ink-300 hover:bg-parchment-200 transition-colors"
      >
        <Icon name="info" size={18} strokeWidth={2} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={classData.name} size="lg">
        <ClassInfoContent classData={classData} />
      </Modal>
    </>
  )
}
