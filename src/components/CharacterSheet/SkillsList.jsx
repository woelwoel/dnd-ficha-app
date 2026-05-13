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
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg p-4"
      style={{ boxShadow: 'var(--shadow-parchment-sm)' }}>
      <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest mb-1 border-b border-parchment-600 pb-1">
        Perícias
      </h3>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-3 text-xs ink-italic mt-1">
        <span>Prof: {formatModifier(profBonus)}</span>
        {skillLimit !== null && (
          <span className={selectedCount >= skillLimit ? 'text-ink-500 font-semibold' : ''}>
            {selectedCount}/{skillLimit} selecionadas
            {selectedCount > skillLimit && <span className="text-ink-600 ml-1 font-bold">(excedido)</span>}
          </span>
        )}
        <span>★ = Especialização (×2 Prof)</span>
        {backgroundSkills.length > 0 && (
          <span>🎒 = Antecedente</span>
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
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-[10px] text-ink-300"
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
                  className={`flex-shrink-0 ${limitReached ? 'cursor-not-allowed opacity-60' : 'accent-ink-500 cursor-pointer'}`}
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
                    ? 'text-ink-500 hover:text-ink-600 cursor-pointer'
                    : proficient
                      ? 'text-ink-200 hover:text-ink-500 cursor-pointer'
                      : 'opacity-0 pointer-events-none'
                }`}
              >
                ★
              </button>
              <Tooltip content={tooltip} position="top">
                <span className={`w-8 text-sm font-bold text-right flex-shrink-0 cursor-help ${expert ? 'text-ink-600' : proficient ? 'text-ink-500' : 'text-ink-200'}`}>
                  {formatModifier(mod)}
                </span>
              </Tooltip>
              <RollButton notation={notation} label={name} size="xs" />
              <span className="text-sm text-ink-500 leading-tight">
                {name}{' '}
                <span className="text-ink-200 text-xs">({abbr})</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
