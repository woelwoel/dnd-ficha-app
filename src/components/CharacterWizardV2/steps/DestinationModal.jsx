import { useEffect, useState } from 'react'
import { listMyCampaigns } from '../../../lib/campaigns'
import { Button } from '../../ui/Button'

/**
 * Modal mostrado antes do wizard quando o usuário cria ficha sem ter mesa
 * selecionada no CharacterList. Pergunta se a ficha é pessoal ou vinculada
 * a alguma mesa. Quando o usuário escolhe, o wizard renderiza normalmente.
 */
export function DestinationModal({ onChoose }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMyCampaigns().then(list => { setCampaigns(list); setLoading(false) })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        className="bg-gray-900 border rounded p-6 max-w-md w-full"
        style={{ borderColor: 'var(--color-shell-border)' }}
      >
        <h2 className="text-amber-400 text-lg mb-1" style={{ fontFamily: 'IM Fell English SC, serif' }}>
          Onde criar?
        </h2>
        <p className="text-gray-400 text-xs mb-4">
          Esta ficha será pessoal ou vinculada a uma mesa?
        </p>

        <Button variant="gold" size="md" onClick={() => onChoose(null)} className="w-full mb-2">
          Personagem pessoal
        </Button>

        {loading ? (
          <p className="text-amber-400 text-xs">Carregando mesas…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-gray-500 text-xs">Você ainda não tem mesas.</p>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider text-gray-400 mt-3 mb-1">Vincular a mesa:</p>
            <div className="flex flex-col gap-1">
              {campaigns.map(c => (
                <Button key={c.id} variant="ghost-dark" size="sm" onClick={() => onChoose(c.id)}>
                  {c.name}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
