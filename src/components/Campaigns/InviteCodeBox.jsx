import { useState } from 'react'
import { rotateInviteCode } from '../../lib/campaigns'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'

/**
 * Caixa com o código de convite. Botão "Copiar" pra qualquer membro;
 * "Rotacionar" só pra DM.
 */
export function InviteCodeBox({ campaignId, code, isDM, onRotated }) {
  const [copied, setCopied] = useState(false)
  const [rotated, setRotated] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard pode estar bloqueado */ }
  }

  async function performRotate() {
    setBusy(true)
    const r = await rotateInviteCode(campaignId)
    setBusy(false)
    setConfirmOpen(false)
    if (r.ok) {
      onRotated?.(r.code)
      setRotated(true)
      setTimeout(() => setRotated(false), 2000)
    }
  }

  return (
    <div className="p-4 rounded-sm border-2 border-parchment-600 bg-parchment-50 shadow-parchment-sm">
      <div className="text-xs font-display uppercase tracking-widest text-ink-500 mb-1">Código de convite</div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-2xl text-ink-500 tracking-wider font-bold">{code}</span>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          {copied ? '✓ Copiado' : 'Copiar'}
        </Button>
        {isDM && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)} disabled={busy}>
            {busy ? '...' : rotated ? '✓ Código atualizado' : '↻ Rotacionar'}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Rotacionar código?"
        message="Gerar um código novo? O atual deixa de funcionar e os jogadores que ainda não entraram precisarão do código novo."
        confirmLabel="Gerar novo código"
        cancelLabel="Cancelar"
        busy={busy}
        onConfirm={performRotate}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
