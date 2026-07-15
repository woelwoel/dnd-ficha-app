import { useState } from 'react'
import { SKILLS, ABILITY_SCORES } from '../../../utils/calculations'
import { useCharacterContext } from '../CharacterContext'
import { useLazySrdDataset } from '../../../data/SrdProvider'
import { skillBudget } from '../../../domain/skillBudget'
import { skillBonus, skillProficiencyState } from './skillBonus'

/* Editor de perícias do v2 — vive dentro de um EditDialog, que já fornece a
 * moldura (.v2-panel) e o título. Por isso este componente não desenha card
 * nem <h3> próprios: fazê-lo produziria caixa dentro de caixa.
 *
 * O grid usa auto-fill/minmax em vez de breakpoints do Tailwind de propósito:
 * as colunas precisam sair da largura do DIALOG, não do viewport. Com
 * breakpoints (o que o SkillsList v1 faz) um desktop abre 3 colunas dentro de
 * 560px e os nomes viram "A.".
 */

const ordered = [...SKILLS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

function SkillEditorRow({ skill, prof, expert, fromBackground, bonus, locked, onToggle, onToggleExpertise }) {
  const dim = !prof && locked
  return (
    <div className="v2-row" style={{ gap: 8, minHeight: 30 }}>
      {fromBackground ? (
        <span
          title="Proficiência do antecedente"
          style={{ width: 14, flex: '0 0 auto', textAlign: 'center', fontSize: 11 }}
        >🎒</span>
      ) : (
        <input
          type="checkbox"
          checked={prof}
          disabled={locked && !prof}
          onChange={() => onToggle(skill.key)}
          aria-label={`Proficiência em ${skill.name}`}
          style={{ width: 14, height: 14, flex: '0 0 auto', accentColor: 'var(--v2-accent)' }}
        />
      )}
      <button
        type="button"
        onClick={() => onToggleExpertise(skill.key)}
        disabled={!prof}
        aria-label={`Especialização em ${skill.name}`}
        title={prof ? 'Especialização (dobra a proficiência)' : 'Requer proficiência'}
        style={{
          width: 14, flex: '0 0 auto', padding: 0, border: 0, background: 'transparent',
          fontSize: 12, lineHeight: 1, cursor: prof ? 'pointer' : 'default',
          color: expert ? 'var(--v2-accent)' : prof ? 'var(--v2-text-3)' : 'var(--v2-border-strong)',
        }}
      >★</button>
      <span
        style={{
          flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          color: dim ? 'var(--v2-text-3)' : prof ? 'var(--v2-text-1)' : 'var(--v2-text-2)',
        }}
      >
        {skill.name}{' '}
        <span style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--v2-text-3)' }}>{skill.abbr}</span>
      </span>
      <span style={{ fontWeight: 500, color: prof ? 'var(--v2-accent)' : 'var(--v2-text-3)' }}>
        {bonus >= 0 ? `+${bonus}` : `${bonus}`}
      </span>
    </div>
  )
}

export function SkillsEditor() {
  const { character, calc, classData, updaters } = useCharacterContext()
  const multiclassData = useLazySrdDataset('multiclass')
  const [filter, setFilter] = useState(null)

  const { proficiencies } = character
  // O limite NÃO é só o da classe: raça (Humano Variante/Meio-Elfo) e
  // multiclasse também concedem perícias, e todas caem no mesmo array.
  const skillLimit    = skillBudget({ classData, info: character.info, multiclassData })
  const selectedCount = proficiencies.skills?.length ?? 0
  const excess        = skillLimit !== null ? selectedCount - skillLimit : 0
  const atLimit       = skillLimit !== null && selectedCount >= skillLimit
  const hasBackground = (proficiencies.backgroundSkills?.length ?? 0) > 0

  const visible = filter ? ordered.filter(s => s.ability === filter) : ordered

  return (
    <div>
      <div
        className="v2-row"
        style={{ alignItems: 'baseline', fontSize: 12, color: 'var(--v2-text-2)', paddingBottom: 8, borderBottom: '1px solid var(--v2-border)' }}
      >
        {skillLimit !== null ? (
          <span>
            <span style={{ color: excess > 0 ? 'var(--v2-warning)' : 'var(--v2-text-1)', fontWeight: 500 }}>
              {`${selectedCount} de ${skillLimit} escolhidas`}
            </span>
            {excess > 0 && ' · '}
            {excess > 0 && (
              <span style={{ color: 'var(--v2-warning)' }}>
                {`${excess} excedida${excess > 1 ? 's' : ''}`}
              </span>
            )}
          </span>
        ) : <span />}
        <span>
          {`prof ${calc.fmt(calc.profBonus)} · ★ especialização`}{hasBackground && ' · 🎒 antecedente'}
        </span>
      </div>

      <div role="group" aria-label="Filtrar perícias por atributo" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--v2-text-3)', marginRight: 2 }}>Filtrar</span>
        <FilterChip label="Tudo" ariaLabel="Mostrar todas" active={filter === null} onClick={() => setFilter(null)} />
        {ABILITY_SCORES.map(({ key, abbr }) => (
          <FilterChip
            key={key}
            label={abbr}
            ariaLabel={`Filtrar por ${abbr}`}
            active={filter === key}
            onClick={() => setFilter(key)}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 16px' }}>
        {visible.map(skill => {
          const { prof, expert } = skillProficiencyState(proficiencies, skill.key)
          return (
            <SkillEditorRow
              key={skill.key}
              skill={skill}
              prof={prof}
              expert={expert}
              fromBackground={proficiencies.backgroundSkills?.includes(skill.key) ?? false}
              bonus={skillBonus(character, calc, skill.key)}
              locked={atLimit}
              onToggle={updaters.toggleSkillProficiency}
              onToggleExpertise={updaters.toggleExpertiseSkill}
            />
          )
        })}
      </div>
    </div>
  )
}

function FilterChip({ label, ariaLabel, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      style={{
        border: 0, borderRadius: 999, padding: '3px 11px', fontSize: 12, cursor: 'pointer',
        background: active ? 'var(--v2-surface-2)' : 'transparent',
        color: active ? 'var(--v2-text-1)' : 'var(--v2-text-2)',
        fontWeight: active ? 500 : 400,
      }}
    >{label}</button>
  )
}
