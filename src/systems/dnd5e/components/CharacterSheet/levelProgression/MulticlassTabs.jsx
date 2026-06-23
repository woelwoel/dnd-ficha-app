// src/components/CharacterSheet/levelProgression/MulticlassTabs.jsx
// Abas de classe primária + multiclasses + botão "+" para adicionar.
export function MulticlassTabs({
  classes, primaryClassName, primaryClassIndex, currentLevel,
  multiclasses, safeTab, onSelectTab, onRemoveMulticlass,
  allowMulticlass, canAddMore, onAddClick,
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {/* Aba classe primária */}
      <button
        onClick={() => onSelectTab('primary')}
        className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition-colors ${
          safeTab === 'primary'
            ? 'border-amber-500 text-amber-300 bg-amber-900/20'
            : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        }`}
      >
        <span>{primaryClassName}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
          safeTab === 'primary' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'
        }`}>{currentLevel}</span>
      </button>

      {/* Abas de multiclasses */}
      {multiclasses.map((mc, idx) => {
        const mcClassName = (classes ?? []).find(c => c.index === mc.class)?.name ?? mc.class
        const isActive = safeTab === idx
        return (
          <div key={idx} className="relative shrink-0 flex items-center">
            <button
              onClick={() => onSelectTab(idx)}
              className={`flex items-center gap-1.5 px-3 pr-7 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition-colors ${
                isActive
                  ? 'border-amber-500 text-amber-300 bg-amber-900/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <span>{mcClassName}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}>{mc.level}</span>
            </button>
            <button
              onClick={() => { onRemoveMulticlass?.(idx); if (isActive) onSelectTab('primary') }}
              className="absolute right-1 text-gray-500 hover:text-red-400 transition-colors text-xs w-5 h-5 flex items-center justify-center"
              aria-label={`Remover ${mcClassName}`}
              title="Remover multiclasse"
            >×</button>
          </div>
        )
      })}

      {/* Aba "+" para adicionar multiclasse — só aparece quando permitido pela campanha */}
      {allowMulticlass && currentLevel >= 3 && canAddMore && (
        <button
          onClick={onAddClick}
          className="shrink-0 px-3 py-2 rounded-t-lg text-sm text-amber-500 hover:text-amber-300 font-bold border-b-2 border-transparent hover:bg-gray-800/50 transition-colors"
          title="Adicionar multiclasse"
        >
          ＋
        </button>
      )}
    </div>
  )
}
