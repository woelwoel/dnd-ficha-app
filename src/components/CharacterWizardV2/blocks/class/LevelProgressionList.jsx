import { ASIOrFeatPicker } from './ASIOrFeatPicker'
import { ChosenFeaturePicker } from './ChosenFeaturePicker'
import { isASIChoiceComplete, isChoiceDone, resolveMultiSelect, currentAttributesForASI } from '../class-helpers'

export function LevelProgressionList({
  level, progressionLevels, leveledChoices,
  draft, onFeatureChoice, onASIChoice, allowFeats, feats,
  attributesReady = true,
}) {
  return (
    <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
      {Array.from({ length: level }, (_, i) => i + 1).map(lvl => {
        const lvlData = progressionLevels.find(l => l.level === lvl)
        const features = lvlData?.features ?? []
        const lvlChoices = leveledChoices.filter(c => c.level === lvl)
        const hasASI = features.some(f => f.name === 'Aumento de Atributo')
        const asiChoice = draft.asiChoices?.[lvl]
        const asiDone = hasASI && isASIChoiceComplete(asiChoice)
        const asiPending = hasASI && !asiDone
        const hasContent = features.length > 0 || lvlChoices.length > 0
        const lvlChoicesDone = lvlChoices.length > 0 && lvlChoices.every(c => isChoiceDone(c, draft.chosenFeatures?.[c.id], level))
        const lvlChoicesPending = lvlChoices.length > 0 && !lvlChoicesDone
        const lvlPending = lvlChoicesPending || asiPending
        const lvlDone = (lvlChoices.length === 0 || lvlChoicesDone) && (!hasASI || asiDone) && (lvlChoices.length > 0 || hasASI)

        if (!hasContent) {
          return (
            <div key={lvl} className="flex items-center gap-2 px-3 py-1 rounded-sm bg-parchment-50/50 border border-parchment-600/40">
              <span className="text-xs font-display text-ink-200 w-10 shrink-0">Nv.{lvl}</span>
              <span className="text-xs italic text-ink-200">
                {lvlData ? 'Evolução de slots / habilidades' : 'Sem novas características'}
              </span>
            </div>
          )
        }

        return (
          <div
            key={lvl}
            className={[
              'rounded-sm border-2 p-3 flex flex-col gap-2 transition-colors',
              lvlPending ? 'border-amber-700 bg-amber-50' :
              lvlDone    ? 'border-emerald-700 bg-emerald-50' :
                           'border-parchment-600 bg-parchment-50',
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-display tracking-widest uppercase text-ink-500">Nível {lvl}</span>
              {lvlPending && <span className="text-xs text-amber-700 font-display">⚠ Escolha</span>}
              {lvlDone && <span className="text-xs text-emerald-700 font-display">✓ Feito</span>}
            </div>

            {features.filter(f => f.name !== 'Aumento de Atributo' && !lvlChoices.some(c => c.featureName === f.name)).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {features.filter(f => f.name !== 'Aumento de Atributo' && !lvlChoices.some(c => c.featureName === f.name)).map((f, fi) => (
                  <span key={fi} className="text-xs bg-parchment-100 border-2 border-parchment-600 px-2 py-0.5 rounded-sm text-ink-300">
                    {f.name}
                  </span>
                ))}
              </div>
            )}

            {hasASI && (
              attributesReady ? (
                <ASIOrFeatPicker
                  currentChoice={asiChoice}
                  currentAttrs={currentAttributesForASI(draft, lvl)}
                  allowFeats={allowFeats}
                  feats={feats}
                  onChoose={choice => onASIChoice(lvl, choice)}
                />
              ) : (
                <div className="pt-2 border-t-2 border-parchment-600/50">
                  <p className="text-xs ink-italic text-ink-300 leading-relaxed">
                    🔒 Aumento de Atributo disponível após definir os{' '}
                    <span className="font-semibold">Atributos</span>.
                  </p>
                </div>
              )
            )}

            {lvlChoices.map(choice => (
              <ChosenFeaturePicker
                key={choice.id}
                choice={choice}
                value={draft.chosenFeatures?.[choice.id]}
                effectiveMultiSelect={resolveMultiSelect(choice, level)}
                onChange={newValue => onFeatureChoice(choice.id, newValue, choice.multiSelect)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
