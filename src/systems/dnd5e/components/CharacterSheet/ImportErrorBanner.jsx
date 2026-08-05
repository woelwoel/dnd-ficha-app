import { memo } from 'react'

/**
 * Aviso dispensável no topo da ficha: erro ao importar JSON, ou conflito de
 * versão (a ficha foi salva por outro dispositivo da mesma conta).
 *
 * Morava dentro de um arquivo do layout v1 (já apagado). Ganhou módulo próprio
 * quando o v2 passou a depender dele também.
 */
export const ImportErrorBanner = memo(function ImportErrorBanner({ message, onDismiss }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 bg-parchment-50 border border-ink-200 rounded-lg px-4 py-3 text-sm">
      <span className="ink-italic">{message}</span>
      <button onClick={onDismiss} className="text-ink-200 hover:text-ink-500 text-lg leading-none" aria-label="Fechar">✕</button>
    </div>
  )
})
