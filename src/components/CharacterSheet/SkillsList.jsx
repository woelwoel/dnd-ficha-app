import { SKILLS, ABILITY_SCORES, formatModifier, calculateSkillModifier, getModifier } from '../../utils/calculations'
import { Tooltip } from '../Tooltip'
import { RollButton } from '../DiceRoller/RollButton'

export function SkillsList({ attributes, proficiencies, profBonus, onToggle, onToggleExpertise, classData, extraSkillBudget = 0 }) {
  // O limite exibido soma o budget da classe primária + quaisquer perícias
  // concedidas por multiclasse/feats (`extraSkillBudget`, default 0).
  // Assim MC que concede perícias não faz o contador aparecer como "excedido".
  const baseLimit       = classData?.skill_choices?.count ?? null
  const skillLimit      = baseLimit !== null ? baseLimit + (extraSkillBudget ?? 0) : null
  // Apenas perícias escolhidas pela classe contam para o limite.
  // backgroundSkills estão em campo próprio (não entram em `proficiencies.skills`).
  const selectedCount   = proficiencies.skills.length
  const atLimit         = skillLimit !== null && selectedCount >= skillLimit
  const backgroundSkills = proficiencies.backgroundSkills ?? []

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-1">
        Perícias
      </h3>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-3 text-xs text-gray-500">
        <span>Prof: {formatModifier(profBonus)}</span>
        {skillLimit !== null && (
          <span className={selectedCount >= skillLimit ? 'text-amber-500' : ''}>
            {selectedCount}/{skillLimit} selecionadas
            {selectedCount > skillLimit && <span className="text-red-400 ml-1">(excedido)</span>}
          </span>
        )}
        <span className="text-gray-600">★ = Especialização (×2 Prof)</span>
        {backgroundSkills.length > 0 && (
          <span className="text-gray-600">🎒 = Antecedente</span>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
        {SKILLS.map(({ key, name, ability, abbr }) => {
          const isClassSkill      = proficiencies.skills.includes(key)
          const isBackgroundSkill = backgroundSkills.includes(key)
          const proficient        = isClassSkill || isBackgroundSkill
          const expert            = proficient && (proficiencies.expertiseSkills ?? []).includes(key)
          const abilityMod        = getModifier(attributes[ability])
          const mod               = calculateSkillModifier(attributes[ability], profBonus, proficient, expert)
          const abbrName          = ABILITY_SCORES.find(a => a.key === ability)?.abbr ?? abbr
          const tooltipParts      = [`${abbrName} ${formatModifier(abilityMod)}`]
          if (proficient) tooltipParts.push(`Prof ${formatModifier(profBonus)}`)
          if (expert)     tooltipParts.push(`Esp ${formatModifier(profBonus)}`)
          tooltipParts.push(`= ${formatModifier(mod)}`)
          const tooltip = tooltipParts.join(' + ').replace('+ =', '=')

          // Limite só se aplica a perícias de classe — antecedente nunca bloqueia
          const limitReached = atLimit && !isClassSkill && !isBackgroundSkill

          const notation = `1d20${formatModifier(mod)}`
          return (
            <div key={key} className={`flex items-center gap-1.5 py-0.5 ${limitReached ? 'opacity-50' : ''}`}>
              {/* Checkbox: travado para perícias do antecedente */}
              {isBackgroundSkill && !isClassSkill ? (
                <span
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-[10px] text-amber-600"
                  title="Proficiência do antecedente"
                >
                  🎒
                </span>
              ) : (
                <input
                  type="checkbox"
                  checked={isClassSkill}
                  disabled={limitReached}
                  onChange={() => !limitReached && onToggle(key)}
                  className={`flex-shrink-0 ${limitReached ? 'cursor-not-allowed opacity-60' : 'accent-amber-400 cursor-pointer'}`}
                />
              )}
              {/* Botão de especialização — invisível quando não proficiente para manter alinhamento */}
              <button
                onClick={() => onToggleExpertise?.(key)}
                disabled={!proficient}
                tabIndex={proficient ? 0 : -1}
                title={expert ? 'Remover Especialização' : 'Adicionar Especialização (requer proficiência)'}
                className={`w-4 h-4 flex items-center justify-center rounded shrink-0 text-[11px] leading-none transition-colors ${
                  expert
                    ? 'text-amber-400 hover:text-amber-300 cursor-pointer'
                    : proficient
                      ? 'text-gray-600 hover:text-gray-400 cursor-pointer'
                      : 'opacity-0 pointer-events-none'
                }`}
              >
                ★
              </button>
              <Tooltip content={tooltip} position="top">
                <span className={`w-8 text-sm font-bold text-right flex-shrink-0 cursor-help ${expert ? 'text-amber-200' : proficient ? 'text-amber-300' : 'text-gray-400'}`}>
                  {formatModifier(mod)}
                </span>
              </Tooltip>
              <RollButton notation={notation} label={name} size="xs" />
              <span className="text-sm text-gray-300 leading-tight">
                {name}{' '}
                <span className="text-gray-500 text-xs">({abbr})</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
