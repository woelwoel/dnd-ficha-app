// src/components/CharacterSheet/levelProgression/FeatPicker.jsx
// Picker de talento (modo ASI=feat) com busca, filtragem por pré-requisito
// e picker de atributo quando o talento concede attrBonus.
import { ABILITY_SCORES } from '../../../../../utils/calculations'

export function FeatPicker({
  feats, attributes,
  featSearch, setFeatSearch,
  selectedFeatIdx, setSelectedFeatIdx,
  featChosenAttr, setFeatChosenAttr,
  onFeatInfo,
}) {
  const chosenFeat        = selectedFeatIdx !== null ? feats[selectedFeatIdx] : null
  const featNeedsAttrPick = chosenFeat?.attrBonus && (chosenFeat.attrBonus.choices?.length ?? 0) > 1

  const filteredFeats = feats.filter(f => {
    if (featSearch.trim()) {
      if (!f.name.toLowerCase().includes(featSearch.toLowerCase())) return false
    }
    if (!f.prereq) return true
    if (f.prereq.type === 'ability') {
      return (attributes[f.prereq.ability] ?? 10) >= f.prereq.min
    }
    if (f.prereq.type === 'ability_or') {
      return f.prereq.abilities.some(a => (attributes[a.ability] ?? 10) >= a.min)
    }
    return true
  })

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Buscar talento..."
        value={featSearch}
        onChange={e => setFeatSearch(e.target.value)}
        className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-600"
      />
      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
        {filteredFeats.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">Nenhum talento encontrado.</p>
        )}
        {filteredFeats.map((feat) => {
          const realIdx = feats.indexOf(feat)
          const sel = selectedFeatIdx === realIdx
          return (
            <button
              key={feat.index}
              type="button"
              onClick={() => { setSelectedFeatIdx(sel ? null : realIdx); setFeatChosenAttr(null) }}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                sel
                  ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                  : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-sm">{feat.name}</span>
                  {feat.prereq && (
                    <span className="ml-2 text-xs text-gray-500">
                      {feat.prereq.type === 'spellcasting' && '(requer conjuração)'}
                      {feat.prereq.type === 'ability' && `(requer ${feat.prereq.ability.toUpperCase()} ${feat.prereq.min}+)`}
                      {feat.prereq.type === 'ability_or' && `(requer atributo ${feat.prereq.abilities[0].min}+)`}
                      {feat.prereq.type === 'proficiency' && '(requer proficiência)'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onFeatInfo(feat) }}
                  className="w-6 h-6 shrink-0 rounded-full bg-gray-700 hover:bg-amber-800 text-amber-400 text-xs font-bold"
                  title="Ver descrição"
                >ℹ</button>
              </div>
              {sel && (
                <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{feat.desc}</p>
              )}
            </button>
          )
        })}
      </div>
      {chosenFeat && (
        <p className="text-xs text-green-400 font-semibold">✓ Talento selecionado: {chosenFeat.name}</p>
      )}
      {/* Picker de atributo quando o talento oferece bônus de atributo */}
      {chosenFeat?.attrBonus && (
        <div className="p-3 bg-gray-900 border border-amber-800/40 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-amber-300">
            +{chosenFeat.attrBonus.amount} ponto de atributo{chosenFeat.attrBonus.choices.length > 1 ? ' (escolha um):' : ':'}
          </p>
          <div className="flex flex-wrap gap-2">
            {chosenFeat.attrBonus.choices.map(attrKey => {
              const score = ABILITY_SCORES.find(a => a.key === attrKey)
              const currentVal = attributes[attrKey] ?? 10
              const atMax = currentVal >= 20
              const isSel = featChosenAttr === attrKey || (chosenFeat.attrBonus.choices.length === 1 && featChosenAttr == null)
              return (
                <button
                  key={attrKey}
                  type="button"
                  disabled={atMax}
                  onClick={() => setFeatChosenAttr(attrKey)}
                  className={`px-3 py-1.5 rounded border text-sm font-semibold transition-colors ${
                    atMax
                      ? 'border-gray-700 bg-gray-800 text-gray-600 cursor-not-allowed'
                      : isSel && chosenFeat.attrBonus.choices.length > 1
                      ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                      : chosenFeat.attrBonus.choices.length === 1
                      ? 'border-green-600 bg-green-900/30 text-green-200 cursor-default'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-amber-600'
                  }`}
                >
                  {score?.abbr ?? attrKey.toUpperCase()} {currentVal} → {Math.min(20, currentVal + chosenFeat.attrBonus.amount)}
                  {atMax && <span className="ml-1 text-xs text-gray-600">(máx)</span>}
                </button>
              )
            })}
          </div>
          {featNeedsAttrPick && !featChosenAttr && (
            <p className="text-xs text-red-400">Escolha qual atributo será aumentado.</p>
          )}
        </div>
      )}
    </div>
  )
}
