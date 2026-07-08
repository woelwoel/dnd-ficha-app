import { useState, useEffect } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { effectiveSpeed, baseSpeedMeters } from '../../../domain/rules'
import { EditDialog } from './EditDialog'
import { useRollInteraction } from '../../../../../hooks/useRollInteraction'

const ABILITIES = [
  { key: 'str', abbr: 'FOR', label: 'FOR', name: 'Força' },
  { key: 'dex', abbr: 'DES', label: 'DES', name: 'Destreza' },
  { key: 'con', abbr: 'CON', label: 'CON', name: 'Constituição' },
  { key: 'int', abbr: 'INT', label: 'INT', name: 'Inteligência' },
  { key: 'wis', abbr: 'SAB', label: 'SAB', name: 'Sabedoria' },
  { key: 'cha', abbr: 'CAR', label: 'Carisma', name: 'Carisma' },
]

export function AbilityStrip() {
  const { character, calc, readOnly } = useCharacterContext()
  const [editing, setEditing] = useState(null)
  const [caOpen, setCaOpen] = useState(false)
  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
      {ABILITIES.map(a => (
        <AbilityCard
          key={a.key}
          a={a}
          mod={calc.mods[a.key]}
          score={calc.effectiveAttrs?.[a.key] ?? character.attributes[a.key]}
          fmt={calc.fmt}
          readOnly={readOnly}
          onEdit={() => setEditing(a.key)}
        />
      ))}
      {readOnly ? (
        <div className="v2-panel v2-ability" style={{ background: 'var(--v2-surface-2)' }}>
          <span className="v2-title" style={{ margin: 0 }}>CA</span>
          <span className="v2-ability-mod">{character.combat?.armorClass ?? 10}</span>
          <span className="v2-mut" style={{ fontSize: 11 }}>armadura</span>
        </div>
      ) : (
        <button
          type="button"
          className="v2-panel v2-ability"
          aria-label="Editar CA"
          style={{ cursor: 'pointer', border: '1px solid var(--v2-border)', background: 'var(--v2-surface-2)', width: '100%' }}
          onClick={() => setCaOpen(true)}
        >
          <span className="v2-title" style={{ margin: 0 }}>CA</span>
          <span className="v2-ability-mod">{character.combat?.armorClass ?? 10}</span>
          <span className="v2-mut" style={{ fontSize: 11 }}>armadura</span>
        </button>
      )}
      <InitiativeCard />
      <AbilityEditor abilityKey={editing} onClose={() => setEditing(null)} />
      <CaEditor open={caOpen} onClose={() => setCaOpen(false)} />
    </div>
  )
}

function AbilityCard({ a, mod, score, fmt, readOnly, onEdit }) {
  const { handlers, longPressActive, title } = useRollInteraction({
    notation: `1d20${fmt(mod)}`,
    label: `Teste de ${a.name}`,
    category: 'check',
    ability: a.key,
  })
  return (
    <div className="v2-panel v2-ability" style={{ position: 'relative', padding: 0 }}>
      <button
        type="button"
        {...handlers}
        title={title}
        aria-label={`Rolar teste de ${a.name}, modificador ${fmt(mod)}`}
        className={`v2-ability-roll${longPressActive ? ' v2-rollable-armed' : ''}`}
      >
        <span className="v2-title" style={{ margin: 0 }}>{a.abbr}</span>
        <span className="v2-ability-mod">{fmt(mod)}</span>
        <span className="v2-chip v2-acc">{score}</span>
      </button>
      {!readOnly && (
        <button type="button" className="v2-ability-edit" aria-label={`Editar ${a.label}`} onClick={onEdit}>✎</button>
      )}
    </div>
  )
}

function InitiativeCard() {
  const { character, calc } = useCharacterContext()
  const { handlers, longPressActive, title } = useRollInteraction({
    notation: `1d20${calc.fmt(calc.initiative)}`,
    label: 'Iniciativa',
    category: 'check',
    ability: 'dex',
  })
  return (
    <button
      type="button"
      {...handlers}
      title={title}
      aria-label={`Rolar iniciativa, bônus ${calc.fmt(calc.initiative)}`}
      className={`v2-panel v2-ability${longPressActive ? ' v2-rollable-armed' : ''}`}
      style={{ background: 'var(--v2-surface-2)', border: '1px solid var(--v2-border)', width: '100%', cursor: 'pointer' }}
    >
      <span className="v2-title" style={{ margin: 0 }}>INIT</span>
      <span className="v2-ability-mod">{calc.fmt(calc.initiative)}</span>
      <span className="v2-mut" style={{ fontSize: 11 }}>VEL {effectiveSpeed(character)}m</span>
    </button>
  )
}

function AbilityEditor({ abilityKey, onClose }) {
  const { character, updaters } = useCharacterContext()
  const [value, setValue] = useState('')
  useEffect(() => {
    if (abilityKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(String(character.attributes[abilityKey] ?? 10))
    }
  }, [abilityKey, character.attributes])
  const abbr = ABILITIES.find(a => a.key === abilityKey)?.abbr ?? ''
  const racial = character.appliedRacialBonuses?.[abilityKey] ?? 0
  const n = Number(value)
  const valid = Number.isFinite(n) && n >= 1 && n <= 30
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
        <button type="button" className="v2-btn" disabled={!valid} onClick={() => { updaters.updateAttribute(abilityKey, value); onClose() }}>
          Aplicar
        </button>
      </div>
    </EditDialog>
  )
}

function CaEditor({ open, onClose }) {
  const { character, calc, races, updaters } = useCharacterContext()
  const [ca, setCa] = useState('')
  const [vel, setVel] = useState('')
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCa(String(character.combat?.armorClass ?? 10))
      setVel(String(character.combat?.speed ?? 9))
    }
  }, [open, character.combat?.armorClass, character.combat?.speed])
  const suggestedSpeed = baseSpeedMeters(character, races.find(r => r.index === character.info?.race)?.speed) + (calc.featSpeedBonus ?? 0)
  const inputStyle = { width: 90, background: 'var(--v2-surface-2)', color: 'var(--v2-text-1)', border: '1px solid var(--v2-border)', borderRadius: 8, padding: '6px 10px' }
  const nCa = Number(ca), nVel = Number(vel)
  const caValid = Number.isFinite(nCa) && nCa >= 0
  return (
    <EditDialog open={open} onClose={onClose} title="Defesa">
      <label className="v2-row" style={{ gap: 12 }}>
        <span className="v2-mut">Classe de Armadura</span>
        <input type="number" min="0" value={ca} onChange={e => setCa(e.target.value)} style={inputStyle} />
      </label>
      <button type="button" className="v2-mut" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12, padding: '2px 0' }}
        onClick={() => setCa(String(calc.suggestedAC ?? ''))}>
        Sugerido: {calc.suggestedAC}
      </button>
      <label className="v2-row" style={{ gap: 12 }}>
        <span className="v2-mut">Velocidade (m)</span>
        <input type="number" min="0" value={vel} onChange={e => setVel(e.target.value)} style={inputStyle} />
      </label>
      <button type="button" className="v2-mut" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12, padding: '2px 0' }}
        onClick={() => setVel(String(suggestedSpeed))}>
        Sugerido: {suggestedSpeed}
      </button>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button type="button" className="v2-btn" disabled={!caValid} onClick={() => {
          if (caValid) updaters.updateCombat('armorClass', nCa)
          if (Number.isFinite(nVel) && nVel >= 0) updaters.updateCombat('speed', nVel)
          onClose()
        }}>Aplicar</button>
      </div>
    </EditDialog>
  )
}
