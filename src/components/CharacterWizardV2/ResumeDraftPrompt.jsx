export function ResumeDraftPrompt({ open, onResume, onDiscard }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4">
      <div
        role="dialog"
        className="w-full max-w-sm bg-parchment-50 border-2 border-parchment-600 rounded-sm p-5 flex flex-col gap-4 shadow-parchment-lg"
      >
        <h2 className="text-base font-display text-ink-500 tracking-widest uppercase text-center">
          Continuar personagem em construção?
        </h2>
        <p className="text-sm text-ink-300 text-center">
          Encontramos um rascunho salvo na sua sessão.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
          >Começar novo</button>
          <button
            type="button"
            onClick={onResume}
            className="px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide"
          >Continuar</button>
        </div>
      </div>
    </div>
  )
}
