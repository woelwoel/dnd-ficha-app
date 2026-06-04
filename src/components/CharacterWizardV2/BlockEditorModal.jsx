import { Modal } from '../ui/Modal'

/**
 * Modal de edição de bloco no Wizard. Wrapper sobre <Modal> primitivo
 * com footer customizado (Limpar | Fechar | Continuar →).
 *
 * `onNext` (opcional): se fornecido, mostra botão "Continuar: <label>"
 * Resolve o débito de UX "qual o próximo passo?" depois de fechar —
 * auto-abre o próximo bloco recomendado.
 *
 * `nextLabel` é o label do próximo bloco (ex: "Classe").
 *
 * `onClear` (opcional): botão "Limpar" no canto esquerdo do footer pra
 * zerar o bloco atual. Aparece só quando faz sentido pro bloco.
 */
export function BlockEditorModal({ open, title, onClose, onClear, onNext, nextLabel, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      closeLabel="Fechar bloco"
      footer={
        <div className="flex items-center justify-between gap-3 flex-1">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-display tracking-wide text-ink-300 hover:text-ink-500 uppercase"
            >Limpar</button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
            >Fechar</button>
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="px-4 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide inline-flex items-center gap-1.5"
              >
                <span>Continuar{nextLabel ? `: ${nextLabel}` : ''}</span>
                <span aria-hidden>→</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      {children}
    </Modal>
  )
}
