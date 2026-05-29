import { SKILLS, ABILITY_SCORES, formatModifier, calculateSkillModifier, getModifier } from '../../utils/calculations'
import { Tooltip } from '../Tooltip'
import { RollButton } from '../DiceRoller/RollButton'

/* ── Linha individual de perícia ──────────────────────────────────
 * Layout flat: checkbox prof / ★ esp / +mod / 🎲 rolar / nome + (ATR).
 * Toda perícia é sempre rollável (em D&D qualquer um pode tentar
 * qualquer perícia, só não soma a proficiência). Não-proficientes
 * ficam visualmente atenuadas mas mantém o botão de rolar ativo.
 */
function SkillRow({
  skill, proficient, expert, isBackgroundSkill, isClassSkill, mod,
  notation, tooltip, limitReached, onToggle, onToggleExpertise,
}) {
  return (
    <div className={`flex items-center gap-2 py-1 ${limitReached && !proficient ? 'opacity-60' : ''}`}>
      {/* Checkbox de proficiência — travado quando vem do antecedente */}
      {isBackgroundSkill && !isClassSkill ? (
        <span
          className="w-4 h-4 flex items-center justify-center text-[10px] text-ink-300 shrink-0"
          title="Proficiência do antecedente"
        >🎒</span>
      ) : (
        <input
          type="checkbox"
          checked={isClassSkill}
          disabled={limitReached}
          onChange={() => !limitReached && onToggle(skill.key)}
          className={`shrink-0 ${limitReached ? 'cursor-not-allowed' : 'accent-ink-500 cursor-pointer'}`}
        />
      )}
      {/* Botão de especialização (★) — invisível quando não proficiente */}
      <button
        onClick={() => onToggleExpertise?.(skill.key)}
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
      >★</button>
      {/* Modificador */}
      <Tooltip content={tooltip} position="top">
        <span className={`w-8 text-sm font-bold text-right shrink-0 cursor-help tabular-nums ${
          expert ? 'text-ink-600' : proficient ? 'text-ink-500' : 'text-ink-300'
        }`}>{formatModifier(mod)}</span>
      </Tooltip>
      {/* Botão de rolar — sempre ativo (qualquer perícia é rollável) */}
      <RollButton notation={notation} label={skill.name} size="xs" />
      {/* Nome + atributo */}
      <span className={`text-sm leading-tight ${proficient ? 'text-ink-500' : 'text-ink-300'}`}>
        {skill.name}
        <span className="text-ink-200 text-[10px] ml-1 font-display tracking-widest">
          {skill.abbr}
        </span>
      </span>
    </div>
  )
}

export function SkillsList({ attributes, proficiencies, profBonus, onToggle, onToggleExpertise, classData, extraSkillBudget = 0 }) {
  const baseLimit    = classData?.skill_choices?.count ?? null
  const skillLimit   = baseLimit !== null ? baseLimit + (extraSkillBudget ?? 0) : null
  const selectedCount = proficiencies.skills.length
  const atLimit      = skillLimit !== null && selectedCount >= skillLimit
  const backgroundSkills = proficiencies.backgroundSkills ?? []

  // Lista ordenada alfabeticamente — flat, sem agrupar por atributo
  const orderedSkills = [...SKILLS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return (
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg p-4 shadow-parchment-sm">
      <div className="flex items-baseline justify-between gap-3 mb-2 border-b border-parchment-600 pb-1">
        <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest">
          Perícias
        </h3>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] ink-italic justify-end">
          <span>Prof: {formatModifier(profBonus)}</span>
          {skillLimit !== null && (
            <span className={selectedCount >= skillLimit ? 'text-ink-500 font-semibold not-italic' : ''}>
              {selectedCount}/{skillLimit} selecionadas
              {selectedCount > skillLimit && <span className="text-ink-600 ml-1 font-bold">(excedido)</span>}
            </span>
          )}
          <span>★ = Esp.</span>
          {backgroundSkills.length > 0 && <span>🎒 = Antecedente</span>}
        </div>
      </div>

      {/* Grid flat: 1 col mobile, 2 cols a partir de sm, 3 cols em lg.
          Continuação alfabética entre colunas; nada de cards por atributo. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0">
        {orderedSkills.map(skill => {
          const isClassSkill      = proficiencies.skills.includes(skill.key)
          const isBackgroundSkill = backgroundSkills.includes(skill.key)
          const proficient        = isClassSkill || isBackgroundSkill
          const expert            = proficient && (proficiencies.expertiseSkills ?? []).includes(skill.key)
          const abilityMod        = getModifier(attributes[skill.ability])
          const mod               = calculateSkillModifier(attributes[skill.ability], profBonus, proficient, expert)
          const abbrName          = ABILITY_SCORES.find(a => a.key === skill.ability)?.abbr ?? skill.abbr
          const tooltipParts      = [`${abbrName} ${formatModifier(abilityMod)}`]
          if (proficient) tooltipParts.push(`Prof ${formatModifier(profBonus)}`)
          if (expert)     tooltipParts.push(`Esp ${formatModifier(profBonus)}`)
          tooltipParts.push(`= ${formatModifier(mod)}`)
          const tooltip = tooltipParts.join(' + ').replace('+ =', '=')

          const limitReached = atLimit && !isClassSkill && !isBackgroundSkill
          const notation = `1d20${formatModifier(mod)}`
          return (
            <SkillRow
              key={skill.key}
              skill={skill}
              proficient={proficient}
              expert={expert}
              isBackgroundSkill={isBackgroundSkill}
              isClassSkill={isClassSkill}
              mod={mod}
              notation={notation}
              tooltip={tooltip}
              limitReached={limitReached}
              onToggle={onToggle}
              onToggleExpertise={onToggleExpertise}
            />
          )
        })}
      </div>
    </div>
  )
}
