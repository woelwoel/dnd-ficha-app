import { listSystems } from '../systems'

/** Tela simples de escolha de sistema. Só aparece quando há 2+ sistemas. */
export function SystemPicker({ onPick, onBack }) {
  const systems = listSystems()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-amber-400 text-lg">Escolha o sistema</h1>
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {systems.map(s => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className="rounded border border-amber-700 px-4 py-3 text-left hover:bg-amber-950"
          >
            {s.name}
          </button>
        ))}
      </div>
      <button onClick={onBack} className="text-gray-400 text-sm underline">Voltar</button>
    </div>
  )
}
