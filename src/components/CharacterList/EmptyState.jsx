import { Button } from '../ui/Button'

export function EmptyState({ onCreate }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-[2] pointer-events-none">
      <div
        className="pointer-events-auto max-w-sm text-center p-6 rounded"
        style={{
          background: 'rgba(255, 251, 242, 0.92)',
          border: '2px solid var(--color-accent-500)',
          boxShadow: 'var(--shadow-elevated)',
          color: 'var(--color-ink-primary)',
        }}
      >
        <p
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: 'EB Garamond, serif' }}
        >
          Sua história começa aqui
        </p>
        <p
          className="text-sm italic mb-4"
          style={{ color: 'var(--color-ink-secondary)' }}
        >
          Recrute seu primeiro aventureiro pra começar a aventura.
        </p>
        <Button variant="gold" size="md" onClick={onCreate}>
          ⚔ Recrutar Aventureiro
        </Button>
      </div>
    </div>
  )
}
