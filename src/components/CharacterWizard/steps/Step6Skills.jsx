// Passo 6 — Perícias
// Escolha N perícias da lista da classe; perícias do antecedente já estão bloqueadas.
import { SKILLS, ABILITY_SCORES, getProficiencyBonus, getModifier, calculateSkillModifier, formatModifier } from '../../../utils/calculations'

export function Step6Skills({ draft, updateDraft, classData }) {
  const limit         = classData?.skill_choices?.count ?? null
  const availableList = classData?.skill_choices?.from ?? []   // nomes PT-BR das opções
  const bgSkills      = draft.backgroundSkills ?? []
  const chosen        = draft.chosenSkills ?? []
  const selectedCount = chosen.length
  const atLimit       = limit !== null && selectedCount >= limit

  // Atributos finais (base + racial) para calcular modificadores no preview
  const finalAttrs = {}
  for (const { key } of ABILITY_SCORES) {
    const base  = draft.baseAttributes[key] ?? 10
    const bonus = draft.racialBonuses?.[key] ?? 0
    finalAttrs[key] = base > 0 ? base + bonus : 10
  }
  const profBonus = getProficiencyBonus(draft.level)

  function toggle(key) {
    if (chosen.includes(key)) {
      updateDraft({ chosenSkills: chosen.filter(k => k !== key) })
    } else if (!atLimit) {
      updateDraft({ chosenSkills: [...chosen, key] })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-amber-400 mb-1">Perícias</h2>
        <p className="text-sm text-gray-400">
          {limit !== null
            ? `Escolha ${limit} perícias entre as opções da sua classe.`
            : 'Selecione as perícias de proficiência do seu personagem.'}
        </p>
      </div>

      {/* Contador */}
      {limit !== null && (
        <div className={`flex items-center justify-between px-4 py-2 rounded-lg border ${
          selectedCount >= limit ? 'border-amber-600 bg-amber-900/20' : 'border-gray-700 bg-gray-800'
        }`}>
          <span className="text-sm text-gray-400">Perícias de classe selecionadas</span>
          <span className={`text-xl font-bold ${selectedCount >= limit ? 'text-amber-400' : 'text-gray-200'}`}>
            {selectedCount}/{limit}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {SKILLS.map(({ key, name, ability, abbr }) => {
          const isClassOption  = availableList.includes(name)
          const isBgSkill      = bgSkills.includes(key)
          const isChosen       = chosen.includes(key)
          const proficient     = isChosen || isBgSkill
          const mod            = calculateSkillModifier(finalAttrs[ability], profBonus, proficient, false)
          const disabled       = !isClassOption || (atLimit && !isChosen)

          return (
            <div
              key={key}
              onClick={() => isClassOption && !isBgSkill && toggle(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isBgSkill
                  ? 'border-amber-700/50 bg-amber-900/10 cursor-default'
                  : isChosen
                  ? 'border-amber-500 bg-amber-900/20 cursor-pointer'
                  : isClassOption && !atLimit
                  ? 'border-gray-700 bg-gray-800 hover:border-gray-500 cursor-pointer'
                  : 'border-gray-800 bg-gray-900 opacity-40 cursor-not-allowed'
              }`}
            >
              {/* Indicador de fonte */}
              {isBgSkill ? (
                <span className="text-sm shrink-0" title="Proficiência do antecedente">🎒</span>
              ) : (
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  isChosen ? 'border-amber-400 bg-amber-600' : 'border-gray-600 bg-gray-700'
                }`}>
                  {isChosen && <span className="text-white text-[10px]">✓</span>}
                </div>
              )}

              {/* Nome + modificador */}
              <span className={`text-sm flex-1 ${proficient ? 'text-gray-200' : 'text-gray-500'}`}>
                {name}
                <span className="text-gray-600 text-xs ml-1">({abbr})</span>
              </span>
              <span className={`text-xs font-bold shrink-0 ${proficient ? 'text-amber-300' : 'text-gray-600'}`}>
                {formatModifier(mod)}
              </span>
            </div>
          )
        })}
      </div>

      {bgSkills.length > 0 && (
        <p className="text-xs text-gray-600">
          🎒 = Proficiência concedida pelo antecedente (não conta para o limite)
        </p>
      )}
    </div>
  )
}
