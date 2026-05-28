import { useEffect, useMemo, useState } from 'react'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import { listMyCampaigns } from '../../lib/campaigns'
import { resetScopeIfMissing } from '../../hooks/useCampaignContext'

/**
 * Combobox no header do CharacterList. "Pessoais" filtra fichas com
 * campaign_id NULL; uma mesa selecionada filtra por aquela mesa.
 *
 * #25 super review: substitui o <select> nativo por Headless UI Combobox
 * pra acomodar nomes longos com truncate elegante e busca quando houver
 * muitas mesas. Acessibilidade ARIA cuidada pela lib.
 */
const PERSONAL = { id: 'personal', label: 'Personagens pessoais' }

export function CampaignSelector({ scope, onChange }) {
  const [campaigns, setCampaigns] = useState([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    listMyCampaigns().then(list => {
      setCampaigns(list)
      resetScopeIfMissing(scope, onChange, list)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const options = useMemo(
    () => [PERSONAL, ...campaigns.map(c => ({ id: c.id, label: `Mesa: ${c.name}` }))],
    [campaigns],
  )

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  const selectedId = scope === 'personal' ? 'personal' : scope?.campaignId
  const selected = options.find(o => o.id === selectedId) ?? PERSONAL

  function onSelect(opt) {
    if (!opt) return
    if (opt.id === 'personal') onChange('personal')
    else onChange({ campaignId: opt.id })
    setQuery('')
  }

  return (
    <Combobox value={selected} onChange={onSelect}>
      <div className="relative">
        <div className="flex items-center bg-gray-900 border border-shell-border rounded text-sm">
          <ComboboxInput
            aria-label="Contexto de personagens"
            className="px-3 py-1 bg-transparent text-gray-100 w-48 sm:w-56 outline-none truncate"
            displayValue={(opt) => opt?.label ?? ''}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pessoais / Mesa…"
          />
          <ComboboxButton className="px-2 text-gray-400 hover:text-amber-300">▾</ComboboxButton>
        </div>
        <ComboboxOptions className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded border border-shell-border bg-gray-900 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-500">Nenhum resultado</li>
          ) : (
            filtered.map(opt => (
              <ComboboxOption
                key={opt.id}
                value={opt}
                className={({ active }) =>
                  `px-3 py-2 cursor-pointer truncate ${active ? 'bg-gray-800 text-amber-300' : 'text-gray-100'}`
                }
              >
                {opt.label}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  )
}
