import { useCharacterContext } from '../CharacterContext'
import { getEffectiveSaveProficiencies } from '../../../domain/rules'
import { skillBonus } from './skillBonus'
import { RollableRow } from './RollableRow'

const SAVE_LABELS = [
  ['str', 'FOR'], ['dex', 'DES'], ['con', 'CON'],
  ['int', 'INT'], ['wis', 'SAB'], ['cha', 'CAR'],
]

export function SavesPanel() {
  const { character, calc } = useCharacterContext()
  const profs = getEffectiveSaveProficiencies(character) ?? []
  return (
    <section className="v2-panel" aria-label="Salvaguardas">
      <h3 className="v2-title">Salvaguardas</h3>
      {SAVE_LABELS.map(([key, label]) => {
        const isProf = profs.includes(key)
        const bonus = calc.savingThrows[key]
        return (
          <RollableRow
            key={key}
            notation={`1d20${calc.fmt(bonus)}`}
            label={`Salvaguarda — ${label}`}
            ariaLabel={`Rolar salvaguarda de ${label}, bônus ${calc.fmt(bonus)}`}
          >
            <span className={isProf ? '' : 'v2-mut'}>
              <span aria-hidden className={isProf ? 'v2-acc' : 'v2-mut'}>{isProf ? '●' : '○'}</span> {label}
            </span>
            <span className={isProf ? 'v2-acc' : ''}>{calc.fmt(bonus)}</span>
          </RollableRow>
        )
      })}
    </section>
  )
}

export function SensesPanel() {
  const { character, calc } = useCharacterContext()
  const senses = [
    ['Percepção passiva', calc.passivePerception],
    ['Investigação passiva', 10 + skillBonus(character, calc, 'investigation')],
    ['Intuição passiva', 10 + skillBonus(character, calc, 'insight')],
  ]
  return (
    <section className="v2-panel" aria-label="Sentidos">
      <h3 className="v2-title">Sentidos</h3>
      {senses.map(([label, value]) => (
        <div key={label} className="v2-row">
          <span className="v2-mut">{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </section>
  )
}

export function ProficienciesPanel() {
  const { character, calc } = useCharacterContext()
  const languages = character.proficiencies?.languages ?? []
  return (
    <section className="v2-panel" aria-label="Proficiências">
      <h3 className="v2-title">Proficiências</h3>
      <div style={{ fontSize: 13 }}>{languages.length ? languages.join(', ') : '—'}</div>
      <div className="v2-row" style={{ marginTop: 6 }}>
        <span className="v2-mut">Bônus de proficiência</span>
        <span className="v2-acc">{calc.fmt(calc.profBonus)}</span>
      </div>
    </section>
  )
}
