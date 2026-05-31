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
      className="flex flex-col gap-2 p-4 rounded-sm border-2 border-parchment-600 bg-parchment-50 shadow-parchment-sm"
    >
      <label className="text-sm font-display tracking-widest uppercase text-ink-500">Entrar com código</label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Ex: AbCdEfGhJk"
        maxLength={10}
        className="px-3 py-2 bg-parchment-100 border-2 border-parchment-600 rounded-sm text-ink-500 placeholder:text-ink-200 font-mono tracking-wider focus:outline-none focus:border-ink-300"
      />
      {err && <p className="text-xs text-red-700 bg-red-50 border border-red-300 rounded-sm px-2 py-1">{err}</p>}
      <Button type="submit" variant="gold" size="sm" disabled={busy || code.trim().length !== 10}>
        {busy ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
