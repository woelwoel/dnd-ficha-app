import { useState } from 'react'
import { joinCampaign } from '../../lib/campaigns'
import { Button } from '../ui/Button'

/**
 * Form inline na CampaignsScreen. Entra com código (case-sensitive — não
 * normaliza) e devolve o id da mesa pro pai navegar.
 */
export function JoinCampaignForm({ onJoined }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true); setErr(null)
    const r = await joinCampaign(code.trim())
    setBusy(false)
    if (!r.ok) {
      setErr(
        r.reason === 'rate-limited'
          ? 'Muitas tentativas. Aguarde um minuto.'
          : 'Código inválido ou você já é membro.',
      )
      return
    }
    setCode('')
    onJoined?.(r.id)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 p-4 rounded border border-shell-border"
    >
      <label className="text-sm text-gray-300">Entrar com código</label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Ex: AbCdEfGhJk"
        maxLength={10}
        className="px-3 py-2 bg-gray-950 border border-gray-700 rounded text-gray-100 font-mono tracking-wider"
      />
      {err && <p className="text-xs text-red-400">{err}</p>}
      <Button type="submit" variant="gold" size="sm" disabled={busy || code.trim().length !== 10}>
        {busy ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
