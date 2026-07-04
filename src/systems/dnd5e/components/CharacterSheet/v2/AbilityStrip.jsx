import { useState, useEffect } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { effectiveSpeed } from '../../../domain/rules'
import { EditDialog } from './EditDialog'

const ABILITIES = [
  { key: 'str', abbr: 'FOR' }, { key: 'dex', abbr: 'DES' }, { key: 'con', abbr: 'CON' },
  { key: 'int', abbr: 'INT' }, { key: 'wis', abbr: 'SAB' }, { key: 'cha', abbr: 'CAR' },
]

export function AbilityStrip() {
  const { character, calc, readOnly } = useCharacterContext()
  const [editing, setEditing] = useState(null)
  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
      {ABILITIES.map(a => {
        const inner = (
          <>
            <span className="v2-title" style={{ margin: 0 }}>{a.abbr}</span>
            <span className="v2-ability-mod">{calc.fmt(calc.mods[a.key])}</span>
            <span className="v2-chip v2-acc">{calc.effectiveAttrs?.[a.key] ?? character.attributes[a.key]}</span>
          </>
        )
        if (readOnly) {
          return (
            <div key={a.key} className="v2-panel v2-ability">
              {inner}
            </div>
          )
        }
        return (
          <button
            key={a.key}
            type="button"
            className="v2-panel v2-ability"
            aria-label={`Editar ${a.abbr}`}
            style={{ cursor: 'pointer', border: '1px solid var(--v2-border)', background: 'var(--v2-surface-1)', width: '100%' }}
            onClick={() => setEditing(a.key)}
          >
            {inner}
          </button>
        )
      })}
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
      <AbilityEditor abilityKey={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function AbilityEditor({ abilityKey, onClose }) {
  const { character, updaters } = useCharacterContext()
  const [value, setValue] = useState('')
  useEffect(() => {
    if (abilityKey) setValue(String(character.attributes[abilityKey] ?? 10))
  }, [abilityKey, character.attributes])
  const abbr = ABILITIES.find(a => a.key === abilityKey)?.abbr ?? ''
  const racial = character.appliedRacialBonuses?.[abilityKey] ?? 0
  return (
    <EditDialog open={abilityKey != null} onClose={onClose} title={`Editar ${abbr}`}>
      <label className="v2-row" style={{ gap: 12 }}>
        <span className="v2-mut">Valor</span>
        <input
          type="number" min="1" max="30" value={value}
          onChange={e => setValue(e.target.value)}
          style={{ width: 90, background: 'var(--v2-surface-2)', color: 'var(--v2-text-1)', border: '1px solid var(--v2-border)', borderRadius: 8, padding: '6px 10px' }}
        />
      </label>
      {racial > 0 && (
        <p className="v2-mut" style={{ fontSize: 12, margin: '6px 0 0' }}>
          Bônus racial já aplicado: +{racial}
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button type="button" className="v2-btn" onClick={() => { updaters.updateAttribute(abilityKey, value); onClose() }}>
          Aplicar
        </button>
      </div>
    </EditDialog>
  )
}
