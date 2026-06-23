// src/components/CharacterSheet/levelProgression/TotalLevelHeader.jsx
// Cabeçalho com nível total quando há multiclasses.
export function TotalLevelHeader({ totalLevel, primaryClassName, currentLevel, multiclasses, classes }) {
  return (
    <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-5 py-3 flex items-center gap-6 flex-wrap">
      <div>
        <p className="text-xs text-amber-600 uppercase tracking-widest font-semibold">Nível Total</p>
        <p className="text-3xl font-black text-amber-300">{totalLevel}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div>
          <p className="text-xs text-gray-500 uppercase">Classe Principal</p>
          <p className="text-sm font-bold text-white">
            {primaryClassName}{' '}
            <span className="text-amber-400">{currentLevel}</span>
          </p>
        </div>
        {multiclasses.map((mc, idx) => {
          const mcName = (classes ?? []).find(c => c.index === mc.class)?.name ?? mc.class
          return (
            <div key={idx}>
              <p className="text-xs text-gray-500 uppercase">Multiclasse {idx + 1}</p>
              <p className="text-sm font-bold text-white">{mcName} <span className="text-amber-400">{mc.level}</span></p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
