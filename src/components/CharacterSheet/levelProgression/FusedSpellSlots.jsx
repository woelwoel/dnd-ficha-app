// src/components/CharacterSheet/levelProgression/FusedSpellSlots.jsx
// Exibe os slots de magia fundidos da multiclasse (PHB p.164).
export function FusedSpellSlots({ fusedSlots, onNavigateToSpells }) {
  return (
    <div className="bg-gray-800 border border-blue-900/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold text-blue-300">Espaços de Magia Fundidos (Multiclasse D&D 5e)</p>
        {onNavigateToSpells && (
          <button
            onClick={onNavigateToSpells}
            className="text-xs px-3 py-1.5 rounded bg-blue-900/40 hover:bg-blue-800/50 border border-blue-700/50 text-blue-300 font-semibold transition-colors"
          >
            ✨ Adicionar / Gerenciar Magias →
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(fusedSlots).map(([lvl, qty]) => (
          <div key={lvl} className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-center">
            <span className="text-gray-400">Nível {lvl}: </span>
            <span className="text-blue-300 font-bold">{qty}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
