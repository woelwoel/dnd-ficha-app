import { useState } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { buildEffectInstance } from '../../../domain/activeEffects'
import { EditDialog } from './EditDialog'

/**
 * Chips de efeitos ativos (buffs de magia) + catálogo "+ Efeito" pra buffs
 * recebidos de aliados (source: manual). Spec 2026-07-07.
 * `catalog` = spellMechanics (index → entry com .effect); `spellNames` =
 * index → nome exibível (derivado das fontes SRD pelo caller).
 */
export function ActiveEffectsChips({ catalog = {}, spellNames = {} }) {
  const { character, updaters, readOnly } = useCharacterContext()
  const [pickerOpen, setPickerOpen] = useState(false)
  const effects = character.combat?.activeEffects ?? []

  const catalogEntries = Object.entries(catalog)
    .filter(([, entry]) => entry?.effect)
    .map(([index, entry]) => ({ index, name: spellNames[index] ?? index, effect: entry.effect }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      {effects.map(e => (
        <span key={e.id} className="v2-chip" style={{ color: 'var(--v2-accent)' }} title={e.summary}>
          {e.name}
          {!readOnly && (
            <button
              type="button"
              aria-label={`Remover ${e.name}`}
              onClick={() => updaters.removeActiveEffect?.(e.id)}
              style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', marginLeft: 4 }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <button type="button" className="v2-chip" style={{ cursor: 'pointer', border: 0 }} onClick={() => setPickerOpen(true)}>
          + Efeito
        </button>
      )}
      <EditDialog open={pickerOpen} onClose={() => setPickerOpen(false)} title="Efeitos de magia (recebidos de aliados)" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {catalogEntries.length === 0 && <span className="v2-mut">Nenhum efeito catalogado.</span>}
          {catalogEntries.map(({ index, name, effect }) => (
            <button
              key={index}
              type="button"
              className="v2-btn"
              style={{ textAlign: 'left' }}
              onClick={() => {
                updaters.addActiveEffect?.(buildEffectInstance({ index, name }, effect, 'manual'))
                setPickerOpen(false)
              }}
            >
              <strong>{name}</strong> <span className="v2-mut">— {effect.summary}</span>
            </button>
          ))}
        </div>
      </EditDialog>
    </>
  )
}
