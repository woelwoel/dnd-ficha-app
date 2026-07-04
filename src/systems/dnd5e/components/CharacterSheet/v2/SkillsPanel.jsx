import { useState } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { SKILLS } from '../../../utils/calculations'
import { skillBonus, skillProficiencyState } from './skillBonus'
import { EditDialog } from './EditDialog'
import { SkillsList } from '../SkillsList'

export function SkillsPanel() {
  const { character, calc, updaters, classData, readOnly } = useCharacterContext()
  const [editOpen, setEditOpen] = useState(false)
  return (
    <section className="v2-panel" aria-label="Perícias">
      <div className="v2-row">
        <h3 className="v2-title">Perícias</h3>
        {!readOnly && (
          <button type="button" className="v2-btn" aria-label="Editar perícias" onClick={() => setEditOpen(true)}>⚙</button>
        )}
      </div>
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
      <EditDialog open={editOpen} onClose={() => setEditOpen(false)} title="Perícias" size="md">
        <SkillsList
          attributes={character.attributes}
          proficiencies={character.proficiencies}
          profBonus={calc.profBonus}
          onToggle={updaters.toggleSkillProficiency}
          onToggleExpertise={updaters.toggleExpertiseSkill}
          classData={classData}
        />
      </EditDialog>
    </section>
  )
}
