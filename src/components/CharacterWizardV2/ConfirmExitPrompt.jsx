export function ConfirmExitPrompt({ open, onSaveAndExit, onDiscard, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4">
      <div
        role="dialog"
        className="w-full max-w-sm bg-parchment-50 border-2 border-parchment-600 rounded-sm p-5 flex flex-col gap-4"
        style={{ boxShadow: 'var(--shadow-parchment-lg)' }}
      >
        <h2 className="text-base font-display text-ink-500 tracking-widest uppercase text-center">
          Sair sem finalizar?
        </h2>
        <p className="text-sm text-ink-300 text-center">
          O personagem ainda não foi inscrito.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onSaveAndExit}
            className="px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide"
          >Salvar e sair</button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-red-700 text-ink-300 hover:text-red-700 text-sm font-display tracking-wide"
          >Descartar progresso</button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
          >Cancelar</button>
        </div>
      </div>
    </div>
  )
}
