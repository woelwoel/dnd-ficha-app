import { useMemo } from 'react'
import { SKILLS, ABILITY_SCORES, formatModifier, calculateSkillModifier, getModifier } from '../../utils/calculations'
import { Tooltip } from '../Tooltip'
import { RollButton } from '../DiceRoller/RollButton'

/* ── Linha individual de perícia ──────────────────────────── */
function SkillRow({
  skill, proficient, expert, isBackgroundSkill, isClassSkill, mod,
  notation, tooltip, limitReached, onToggle, onToggleExpertise,
}) {
  return (
    <div className={`flex items-center gap-1.5 py-0.5 ${limitReached ? 'opacity-50' : ''}`}>
      {/* Checkbox: travado se vier do antecedente */}
      {isBackgroundSkill && !isClassSkill ? (
        <span
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-[10px] text-ink-300"
          title="Proficiência do antecedente"
        >🎒</span>
      ) : (
        <input
          type="checkbox"
          checked={isClassSkill}
          disabled={limitReached}
          onChange={() => !limitReached && onToggle(skill.key)}
          className={`flex-shrink-0 ${limitReached ? 'cursor-not-allowed opacity-60' : 'accent-ink-500 cursor-pointer'}`}
        />
      )}
      {/* Botão de especialização */}
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
      <Tooltip content={tooltip} position="top">
        <span className={`w-8 text-sm font-bold text-right flex-shrink-0 cursor-help tabular-nums ${
          expert ? 'text-ink-600' : proficient ? 'text-ink-500' : 'text-ink-200'
        }`}>{formatModifier(mod)}</span>
      </Tooltip>
      <RollButton notation={notation} label={skill.name} size="xs" />
      <span className="text-sm text-ink-500 leading-tight truncate">
        {skill.name}
      </span>
    </div>
  )
}

/* ── Bloco por atributo (FOR, DES, INT...) ───────────────── */
function AbilityGroup({ ability, skills, attributes, profBonus, proficiencies, onToggle, onToggleExpertise, atLimit }) {
  const abilityInfo = ABILITY_SCORES.find(a => a.key === ability)
  const abilityMod = getModifier(attributes[ability])
  const backgroundSkills = proficiencies.backgroundSkills ?? []

  return (
    <div className="bg-parchment-50/60 border border-parchment-600/60 rounded-sm p-2.5">
      <div className="flex items-baseline gap-2 mb-1.5 pb-1 border-b border-parchment-600/40">
        <span className="text-[10px] font-display tracking-widest uppercase text-ink-500">
          {abilityInfo?.abbr}
        </span>
        <span className="text-[10px] ink-italic text-ink-300">
          {abilityInfo?.name} {formatModifier(abilityMod)}
        </span>
      </div>
      {skills.length === 0 ? (
        <p className="text-[10px] ink-italic text-ink-300 py-1">— sem perícias —</p>
      ) : (
        <div className="space-y-0.5">
          {skills.map(skill => {
            const isClassSkill      = proficiencies.skills.includes(skill.key)
            const isBackgroundSkill = backgroundSkills.includes(skill.key)
            const proficient        = isClassSkill || isBackgroundSkill
            const expert            = proficient && (proficiencies.expertiseSkills ?? []).includes(skill.key)
            const abilityModLocal   = getModifier(attributes[skill.ability])
            const mod               = calculateSkillModifier(attributes[skill.ability], profBonus, proficient, expert)
            const abbrName          = ABILITY_SCORES.find(a => a.key === skill.ability)?.abbr ?? skill.abbr

            const tooltipParts = [`${abbrName} ${formatModifier(abilityModLocal)}`]
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
      )}
    </div>
  )
}

export function SkillsList({ attributes, proficiencies, profBonus, onToggle, onToggleExpertise, classData, extraSkillBudget = 0 }) {
  const baseLimit    = classData?.skill_choices?.count ?? null
  const skillLimit   = baseLimit !== null ? baseLimit + (extraSkillBudget ?? 0) : null
  const selectedCount = proficiencies.skills.length
  const atLimit      = skillLimit !== null && selectedCount >= skillLimit
  const backgroundSkills = proficiencies.backgroundSkills ?? []

  // Agrupa perícias por atributo
  const skillsByAbility = useMemo(() => {
    const groups = {}
    for (const a of ABILITY_SCORES) groups[a.key] = []
    for (const s of SKILLS) groups[s.ability].push(s)
    return groups
  }, [])

  return (
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg p-4"
      style={{ boxShadow: 'var(--shadow-parchment-sm)' }}>
      <div className="flex items-baseline justify-between gap-3 mb-1 border-b border-parchment-600 pb-1">
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
          <span>★ = Especialização (×2 Prof)</span>
          {backgroundSkills.length > 0 && <span>🎒 = Antecedente</span>}
        </div>
      </div>

      {/* Grid de grupos: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        {ABILITY_SCORES.map(({ key }) => (
          <AbilityGroup
            key={key}
            ability={key}
            skills={skillsByAbility[key]}
            attributes={attributes}
            profBonus={profBonus}
            proficiencies={proficiencies}
            onToggle={onToggle}
            onToggleExpertise={onToggleExpertise}
            atLimit={atLimit}
          />
        ))}
      </div>
    </div>
  )
}
