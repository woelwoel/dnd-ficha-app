import { Button } from '../../../../components/ui/Button'

/**
 * Barra de comando do combate: onde estamos e o que dá pra fazer agora.
 * Fica grudada no topo porque a lista de iniciativa cresce e passar o turno não
 * pode exigir rolar a página de volta.
 */
export function EncounterToolbar({ round, xp, onPrevious, onNext, onAdd, onArea, areaOn, onClose }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-parchment-100 border-b-2 border-parchment-600 flex flex-wrap items-center gap-2">
      <span className="text-sm font-display tracking-widest uppercase text-ink-500">
        Rodada {round}
      </span>
      <span className="text-xs ink-italic text-ink-300">{xp} XP em monstros</span>
      <div className="flex-1" />
      <Button size="sm" variant="ghost" onClick={onPrevious}>Anterior</Button>
      <Button size="sm" onClick={onNext}>Próximo turno</Button>
      <Button size="sm" variant="ghost" onClick={onAdd}>Adicionar monstro</Button>
      <Button size="sm" variant="ghost" disabled={areaOn} onClick={onArea}>Dano em área</Button>
      <Button size="sm" variant="danger" onClick={onClose}>Encerrar</Button>
    </div>
  )
}

/** Slot único de desfazer. Some sozinho quando não há o que desfazer. */
export function UndoBar({ action, onUndo }) {
  if (!action) return null
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-sm border-2 border-amber-700 bg-amber-50">
      <span className="flex-1 text-xs text-ink-500">{action.label}</span>
      <button
        type="button"
        onClick={onUndo}
        className="text-xs px-2 py-1 border-2 border-amber-700 text-amber-800 rounded-sm hover:bg-amber-100"
      >
        Desfazer
      </button>
    </div>
  )
}
