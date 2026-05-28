/**
 * Card individual de mesa na CampaignsScreen. Clicar navega pra /campaigns/:id.
 */
export function CampaignCard({ campaign, onOpen }) {
  return (
    <button
      onClick={() => onOpen(campaign.id)}
      className="w-full text-left p-4 rounded border bg-gray-900 hover:bg-gray-800 transition"
      style={{ borderColor: 'var(--color-shell-border)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-amber-300 font-semibold">{campaign.name}</h3>
        <span className="text-xs uppercase tracking-wider text-gray-400">
          {campaign.role === 'dm' ? 'Mestre' : 'Jogador'}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        Criada em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
      </p>
    </button>
  )
}
