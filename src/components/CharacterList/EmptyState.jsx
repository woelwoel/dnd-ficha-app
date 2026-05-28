import { Button } from '../ui/Button'

export function EmptyState({ onCreate }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-[2] pointer-events-none">
      <div className="pointer-events-auto max-w-sm text-center p-6 rounded border-2 border-accent-500 shadow-elevated text-ink-primary bg-[rgba(255,251,242,0.92)]">
        <p className="text-lg font-semibold mb-2 font-body">
          Sua história começa aqui
        </p>
        <p className="text-sm italic mb-4 text-ink-secondary">
          Recrute seu primeiro aventureiro pra começar a aventura.
        </p>
        <Button variant="gold" size="md" onClick={onCreate}>
          ⚔ Recrutar Aventureiro
        </Button>
      </div>
    </div>
  )
}
