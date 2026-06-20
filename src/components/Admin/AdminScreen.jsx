import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminListCharacters, adminListCampaigns } from '../../lib/admin'
import { deleteCharacter } from '../../utils/storage'
import { deleteCampaign, renameCampaign } from '../../lib/campaigns'

const TABS = [['fichas', 'Fichas'], ['mesas', 'Mesas']]

export function AdminScreen({ onBack }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('fichas')
  const [chars, setChars] = useState([])
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const [c, m] = await Promise.all([adminListCharacters(), adminListCampaigns()])
    setChars(c); setCamps(m); setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])

  const onDeleteChar = useCallback(async (id, name) => {
    if (!window.confirm(`Apagar a ficha "${name}"? Isso não tem volta.`)) return
    await deleteCharacter(id); reload()
  }, [reload])

  const onDeleteCamp = useCallback(async (id, name) => {
    if (!window.confirm(`Apagar a mesa "${name}"? Isso não tem volta.`)) return
    await deleteCampaign(id); reload()
  }, [reload])

  const onRenameCamp = useCallback(async (id, current) => {
    const name = window.prompt('Novo nome da mesa:', current)
    if (!name || name.trim() === current) return
    await renameCampaign(id, name); reload()
  }, [reload])

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-display text-amber-400">Administração</h1>
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-200">← Voltar</button>
      </div>

      <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 text-sm font-medium ${tab === id ? 'bg-blue-700/50 text-blue-200' : 'bg-gray-800/60 text-gray-400 hover:text-gray-200'}`}
          >{label}</button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Carregando…</p>}

      {!loading && tab === 'fichas' && (
        <div className="space-y-1.5">
          {chars.length === 0 && <p className="text-sm text-gray-500">Nenhuma ficha.</p>}
          {chars.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-2 border border-gray-700 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-100 truncate">{c.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {c.className} nv {c.level} · dono: {c.ownerName}{c.campaignId ? ' · em mesa' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/c/${c.shortId ?? c.id}?adm=1`)}
                  aria-label={`Abrir ficha ${c.name}`}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                >Abrir</button>
                <button
                  onClick={() => onDeleteChar(c.id, c.name)}
                  aria-label={`Apagar ficha ${c.name}`}
                  className="text-xs px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200"
                >Apagar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'mesas' && (
        <div className="space-y-1.5">
          {camps.length === 0 && <p className="text-sm text-gray-500">Nenhuma mesa.</p>}
          {camps.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-2 border border-gray-700 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-100 truncate">{m.name}</p>
                <p className="text-xs text-gray-500 truncate">DM: {m.dmName} · {m.memberCount} membro(s)</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/campaigns/${m.id}`)}
                  aria-label={`Abrir mesa ${m.name}`}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                >Abrir</button>
                <button
                  onClick={() => onRenameCamp(m.id, m.name)}
                  aria-label={`Renomear mesa ${m.name}`}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                >Renomear</button>
                <button
                  onClick={() => onDeleteCamp(m.id, m.name)}
                  aria-label={`Apagar mesa ${m.name}`}
                  className="text-xs px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200"
                >Apagar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
