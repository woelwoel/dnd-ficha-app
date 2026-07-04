import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

const WIDTHS = { sm: 360, md: 560, lg: 760, full: 'min(1100px, 96vw)' }

/**
 * Modal de edição do design system v2 (Headless UI Dialog).
 * O Dialog porta pro <body> — FORA do escopo .sheet-v2 — então o painel
 * reaplica a classe (num wrapper) pra manter os tokens --v2-* disponíveis.
 * Nota: `.sheet-v2 .v2-panel` é uma regra de DESCENDENTE em tokens.css, então
 * `.v2-panel` precisa ser um elemento filho de `.sheet-v2`, não a mesma tag.
 */
export function EditDialog({ open, onClose, title, size = 'sm', children }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <DialogPanel as="div" className="sheet-v2">
          <div
            className="v2-panel"
            style={{ width: WIDTHS[size] ?? WIDTHS.sm, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="v2-row" style={{ marginBottom: 8 }}>
              <DialogTitle className="v2-title" style={{ margin: 0 }}>{title}</DialogTitle>
              <button type="button" className="v2-btn" onClick={onClose} aria-label="Fechar">✕</button>
            </div>
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
