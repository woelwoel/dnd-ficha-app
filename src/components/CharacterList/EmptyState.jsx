import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

export function EmptyState({ onCreate }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-[2] pointer-events-none">
      <div className="pointer-events-auto relative max-w-md text-center px-7 py-8 rounded-sm border-2 border-parchment-600 bg-parchment-50 shadow-parchment-lg">
        {/* Cantos decorativos (mesmo motivo do Login + CampaignSetupModal) */}
        <span aria-hidden className="absolute top-2 left-2  w-3 h-3 border-l-2 border-t-2 border-parchment-600/70" />
        <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-parchment-600/70" />
        <span aria-hidden className="absolute bottom-2 left-2  w-3 h-3 border-l-2 border-b-2 border-parchment-600/70" />
        <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-parchment-600/70" />

        {/* Ornamento heráldico — flor-de-lis + espadas + flor-de-lis */}
        <div className="flex items-center justify-center gap-3 mb-4 text-parchment-600" aria-hidden>
          <span className="text-2xl leading-none">❦</span>
          <span className="text-ink-500">
            <Icon name="swords" size={32} strokeWidth={1.5} />
          </span>
          <span className="text-2xl leading-none">❦</span>
        </div>

        <p className="text-xs ink-italic tracking-[0.3em] uppercase text-ink-300 mb-1">
          O Mapa aguarda
        </p>
        <h2 className="text-xl font-display tracking-widest uppercase text-ink-500 leading-tight mb-3">
          Sua história começa aqui
        </h2>
        <p className="text-sm ink-italic text-ink-300 mb-5 max-w-xs mx-auto">
          Recrute seu primeiro aventureiro pra começar a campanha. Pode ser pessoal ou já vinculado a uma mesa.
        </p>

        <Button variant="gold" size="md" onClick={onCreate} className="inline-flex">
          <Icon name="swords" size={14} strokeWidth={2} />
          <span>Recrutar Aventureiro</span>
        </Button>
      </div>
    </div>
  )
}
