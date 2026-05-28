import { useEffect, useState } from 'react'
import { listMyCampaigns } from '../../lib/campaigns'

/**
 * Dropdown no header do CharacterList. "Pessoais" filtra fichas com
 * campaign_id NULL; uma mesa selecionada filtra por aquela mesa.
 */
export function CampaignSelector({ scope, onChange }) {
  const [campaigns, setCampaigns] = useState([])

  useEffect(() => { listMyCampaigns().then(setCampaigns) }, [])

  const value = scope === 'personal' ? 'personal' : scope?.campaignId

  function onSelect(e) {
    const v = e.target.value
    if (v === 'personal') onChange('personal')
    else onChange({ campaignId: v })
  }

  return (
    <select
      value={value}
      onChange={onSelect}
      className="px-3 py-1 bg-gray-900 border rounded text-gray-100 text-sm"
      style={{ borderColor: 'var(--color-shell-border)' }}
      aria-label="Contexto de personagens"
    >
      <option value="personal">Personagens pessoais</option>
      {campaigns.map(c => (
        <option key={c.id} value={c.id}>Mesa: {c.name}</option>
      ))}
    </select>
  )
}
