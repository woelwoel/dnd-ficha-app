/**
 * Card individual de mesa na CampaignsScreen. Clicar navega pra /campaigns/:id.
 */
export function CampaignCard({ campaign, onOpen }) {
  return (
    <button
      onClick={() => onOpen(campaign.id)}
      className="w-full text-left p-4 rounded-sm border-2 border-parchment-600 bg-parchment-50 hover:bg-parchment-200 hover:border-ink-300 transition shadow-parchment-sm"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-ink-500 font-display tracking-wide font-semibold">{campaign.name}</h3>
        <span className={
          'text-xs uppercase tracking-widest px-1.5 py-0.5 rounded-sm font-display ' +
          (campaign.role === 'dm'
            ? 'bg-amber-100 text-amber-800 border border-amber-600'
            : 'bg-parchment-200 text-ink-300 border border-parchment-600')
        }>
          {campaign.role === 'dm' ? 'Mestre' : 'Jogador'}
        </span>
      </div>
      <p className="text-xs ink-italic text-ink-300">
        Criada em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
      </p>
    </button>
  )
}
