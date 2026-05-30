import { useRef } from 'react'
import { Modal } from './Modal'

/**
 * Dialog de confirmação tematizado — substitui `window.confirm` nativo.
 *
 * Usar em qualquer ação destrutiva ou irreversível:
 *  - Apagar mesa / personagem / item
 *  - Descanso longo (zera estado)
 *  - Romper concentração
 *  - Rotacionar código de convite
 *  - Limpar bloco do wizard
 *
 * Props:
 *  - open                 boolean
 *  - title                string — título do header
 *  - message              ReactNode — corpo (pode ter <p>, listas, etc)
 *  - confirmLabel         string — default "Confirmar"
 *  - cancelLabel          string — default "Cancelar"
 *  - onConfirm            () => void
 *  - onCancel             () => void
 *  - variant              'default' | 'danger' — danger pinta o botão de vermelho
 *  - busy                 boolean — desativa botões e mostra "..."
 *  - dismissOnBackdrop    boolean — default true (cancelar)
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'default',
  busy = false,
  dismissOnBackdrop = true,
}) {
  // Foco inicial no botão Cancelar (mais seguro pra ações destrutivas).
  const cancelRef = useRef(null)

  const confirmCls = variant === 'danger'
    ? 'bg-red-700 hover:bg-red-600 border-red-800 text-parchment-50'
    : 'bg-ink-500 hover:bg-ink-600 border-ink-600 text-parchment-50'

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      dismissOnBackdrop={dismissOnBackdrop && !busy}
      initialFocusRef={cancelRef}
      footer={
        <>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-5 py-1.5 rounded-sm border-2 text-sm font-display tracking-wide transition-colors disabled:opacity-50 ${confirmCls}`}
          >
            {busy ? '...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-ink-500 leading-relaxed">
        {typeof message === 'string' ? <p>{message}</p> : message}
      </div>
    </Modal>
  )
}
