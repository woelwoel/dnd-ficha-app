// src/components/CharacterSheet/levelProgression/LevelUpChoicePicker.jsx
// Renderiza UMA escolha de característica do nível (subclasse, expertise, etc).
// Suporta single-select (radio) e multi-select (checkbox). Mostra picker de
// cantrips bônus quando a opção single-select escolhida concede bonusCantrips.
import { CantripsGrantPicker } from '../../CantripsGrantPicker'

export function LevelUpChoicePicker({
  choice,
  currentChosenFeatures,
  newChoices,
  setNewChoices,
  bonusCantripsNeeded,
  bonusCantripsChosen,
  setBonusCantripsChosen,
  onOptionInfo,
}) {
  const isMulti    = (choice.multiSelect ?? 0) > 1
  const currentVal = newChoices[choice.id] ?? currentChosenFeatures?.[choice.id] ?? ''
  const selectedVals = isMulti
    ? (currentVal ? String(currentVal).split(',').filter(Boolean) : [])
    : null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-amber-300">
        🎭 {choice.featureName}{' '}
        <span className="text-red-400 font-normal text-xs">*</span>
        {isMulti && (
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({selectedVals.length}/{choice.multiSelect} escolhidas)
          </span>
        )}
      </h4>
      <p className="text-xs text-gray-400">{choice.prompt}</p>
      <div className="flex flex-col gap-1.5">
        {choice.options.map(opt => {
          if (isMulti) {
            const isSel  = selectedVals.includes(opt.value)
            const atMax  = !isSel && selectedVals.length >= choice.multiSelect
            return (
              <div key={opt.value} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={atMax}
                  onClick={() => setNewChoices(prev => {
                    const vals = (prev[choice.id] ?? '').split(',').filter(Boolean)
                    const next = isSel
                      ? vals.filter(v => v !== opt.value)
                      : [...vals, opt.value]
                    return { ...prev, [choice.id]: next.join(',') }
                  })}
                  className={`flex-1 text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                    atMax
                      ? 'opacity-40 cursor-not-allowed border-gray-700 bg-gray-800 text-gray-500'
                      : isSel
                      ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                      : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded border-2 shrink-0 ${isSel ? 'border-amber-400 bg-amber-500' : 'border-gray-600'}`} />
                  <span className="font-semibold text-sm">{opt.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOptionInfo(opt)}
                  className="w-7 h-7 rounded-full bg-gray-700 hover:bg-amber-800 text-amber-400 text-xs font-bold shrink-0"
                  title="Ver descrição"
                >ℹ</button>
              </div>
            )
          }

          // Single-select (radio)
          return (
            <div key={opt.value} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setNewChoices(prev => ({ ...prev, [choice.id]: opt.value })); setBonusCantripsChosen([]) }}
                className={`flex-1 text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                  currentVal === opt.value
                    ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                    : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${currentVal === opt.value ? 'border-amber-400 bg-amber-500' : 'border-gray-600'}`} />
                <span className="font-semibold text-sm">{opt.name}</span>
                {opt.grants?.bonusCantrips > 0 && (
                  <span className="text-xs bg-blue-900/40 border border-blue-700/50 text-blue-300 px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                    +{opt.grants.bonusCantrips} truques
                  </span>
                )}
                {opt.grants?.spells?.length > 0 && (
                  <span className="text-xs bg-green-900/40 border border-green-700/50 text-green-300 px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                    +magia
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onOptionInfo(opt)}
                className="w-7 h-7 rounded-full bg-gray-700 hover:bg-amber-800 text-amber-400 text-xs font-bold shrink-0"
                title="Ver descrição"
              >ℹ</button>
            </div>
          )
        })}
      </div>
      {/* Picker de cantrips bônus (somente single-select) */}
      {!isMulti && bonusCantripsNeeded > 0 && currentVal && (
        <CantripsGrantPicker
          needed={bonusCantripsNeeded}
          chosen={bonusCantripsChosen}
          onChosenChange={setBonusCantripsChosen}
        />
      )}
    </div>
  )
}
