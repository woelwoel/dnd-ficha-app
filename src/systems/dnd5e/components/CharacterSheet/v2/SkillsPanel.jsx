import { useCharacterContext } from '../CharacterContext'
import { SKILLS } from '../../../utils/calculations'
import { skillBonus, skillProficiencyState } from './skillBonus'

export function SkillsPanel() {
  const { character, calc } = useCharacterContext()
  return (
    <section className="v2-panel" aria-label="Perícias">
      <h3 className="v2-title">Perícias</h3>
      {SKILLS.map(s => {
        const { prof, expert } = skillProficiencyState(character.proficiencies, s.key)
        return (
          <div key={s.key} className="v2-row">
            <span className={prof ? '' : 'v2-mut'} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span aria-hidden className={prof ? 'v2-acc' : 'v2-mut'}>{expert ? '◆' : prof ? '●' : '○'}</span>{' '}
              {s.name} <span className="v2-mut" style={{ fontSize: 11 }}>{s.abbr}</span>
            </span>
            <span className={prof ? 'v2-acc' : ''}>{calc.fmt(skillBonus(character, calc, s.key))}</span>
          </div>
        )
      })}
    </section>
  )
}
