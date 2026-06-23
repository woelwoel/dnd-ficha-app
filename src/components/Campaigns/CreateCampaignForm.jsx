import { useState } from 'react'
import { createCampaign } from '../../lib/campaigns'
import { listSystems } from '../../systems'
import { Button } from '../ui/Button'

/**
 * Form inline na CampaignsScreen. Cria mesa via RPC e devolve o id pro pai
 * decidir pra onde navegar.
 */
export function CreateCampaignForm({ onCreated }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true); setErr(null)
    const r = await createCampaign(name.trim(), listSystems()[0].id)
    setBusy(false)
    if (!r.ok) {
      const msg = r.reason === 'too-many-campaigns'
        ? 'Limite de 20 mesas por DM atingido. Apague uma antiga antes.'
        : r.reason === 'invalid-name'
          ? 'Informe um nome válido pra mesa.'
          : 'Falha ao criar a mesa. Tente novamente.'
      setErr(msg); return
    }
    setName('')
    onCreated?.(r.id)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 p-4 rounded-sm border-2 border-parchment-600 bg-parchment-50 shadow-parchment-sm"
    >
      <label className="text-sm font-display tracking-widest uppercase text-ink-500">Criar mesa nova</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da mesa"
        maxLength={80}
        className="px-3 py-2 bg-parchment-100 border-2 border-parchment-600 rounded-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
      />
      {err && <p className="text-xs text-red-700 bg-red-50 border border-red-300 rounded-sm px-2 py-1">{err}</p>}
      <Button type="submit" variant="gold" size="sm" disabled={busy || !name.trim()}>
        {busy ? 'Criando…' : 'Criar mesa'}
      </Button>
    </form>
  )
}
