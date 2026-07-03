import { useCharacterContext } from '../CharacterContext'
import { effectiveSpeed } from '../../../domain/rules'

const ABILITIES = [
  { key: 'str', abbr: 'FOR' }, { key: 'dex', abbr: 'DES' }, { key: 'con', abbr: 'CON' },
  { key: 'int', abbr: 'INT' }, { key: 'wis', abbr: 'SAB' }, { key: 'cha', abbr: 'CAR' },
]

export function AbilityStrip() {
  const { character, calc } = useCharacterContext()
  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
      {ABILITIES.map(a => (
        <div key={a.key} className="v2-panel v2-ability">
          <span className="v2-title" style={{ margin: 0 }}>{a.abbr}</span>
          <span className="v2-ability-mod">{calc.fmt(calc.mods[a.key])}</span>
          <span className="v2-chip v2-acc">{calc.effectiveAttrs?.[a.key] ?? character.attributes[a.key]}</span>
        </div>
      ))}
      <div className="v2-panel v2-ability" style={{ background: 'var(--v2-surface-2)' }}>
        <span className="v2-title" style={{ margin: 0 }}>CA</span>
        <span className="v2-ability-mod">{character.combat?.armorClass ?? 10}</span>
        <span className="v2-mut" style={{ fontSize: 11 }}>armadura</span>
      </div>
      <div className="v2-panel v2-ability" style={{ background: 'var(--v2-surface-2)' }}>
        <span className="v2-title" style={{ margin: 0 }}>INIT</span>
        <span className="v2-ability-mod">{calc.fmt(calc.initiative)}</span>
        <span className="v2-mut" style={{ fontSize: 11 }}>VEL {effectiveSpeed(character)}m</span>
      </div>
    </div>
  )
}
