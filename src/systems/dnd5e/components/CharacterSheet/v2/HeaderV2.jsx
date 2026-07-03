import { useCharacterContext } from '../CharacterContext'
import { RestActions } from '../RestActions'
import { CONDITIONS_BY_ID } from '../../../domain/conditions'

export function HeaderV2({ onBack, onExport, onPrint, saving, saved, saveError }) {
  const { character, setCharacter, calc, readOnly } = useCharacterContext()
  const { info, combat } = character
  const summary = [
    info.race || null,
    info.class ? `${info.class} N${info.level ?? 1}` : null,
    info.background || null,
  ].filter(Boolean).join(' · ')
  const hpPct = Math.max(0, Math.min(100, calc.hpPercent ?? 0))
  const barColor = hpPct > 50 ? 'var(--v2-success)' : hpPct > 25 ? 'var(--v2-warning)' : 'var(--v2-danger)'
  const conditions = combat?.conditions ?? []

  return (
    <header className="v2-panel" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      <button type="button" className="v2-btn" onClick={onBack}>← Personagens</button>

      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{info.name || 'Sem nome'}</div>
        <div className="v2-mut" style={{ fontSize: 12 }}>{summary}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {combat?.inspiration && (
          <span className="v2-chip" style={{ color: 'var(--v2-warning)' }}>Inspiração</span>
        )}
        {(combat?.exhaustion ?? 0) > 0 && (
          <span className="v2-chip" style={{ color: 'var(--v2-warning)' }}>Exaustão {combat.exhaustion}</span>
        )}
        {conditions.map(id => (
          <span key={id} className="v2-chip" style={{ color: 'var(--v2-danger)' }}>
            {CONDITIONS_BY_ID[id]?.label ?? id}
          </span>
        ))}
      </div>

      <details style={{ position: 'relative' }}>
        <summary className="v2-btn" style={{ listStyle: 'none', cursor: 'pointer' }}>Descansos</summary>
        <div style={{ position: 'absolute', right: 0, zIndex: 40, marginTop: 6, minWidth: 320 }}>
          <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0 }}>
            <RestActions character={character} onApply={setCharacter} />
          </fieldset>
        </div>
      </details>

      <button type="button" className="v2-btn" onClick={onExport}>Exportar</button>
      <button type="button" className="v2-btn" onClick={onPrint}>Imprimir</button>

      <div style={{ textAlign: 'right', minWidth: 130 }}>
        <div className="v2-title" style={{ margin: 0 }}>Pontos de vida</div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>
          <span>{combat?.currentHp ?? 0}</span> <span className="v2-mut" style={{ fontSize: 13 }}>/ {combat?.maxHp ?? 0}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--v2-surface-2)' }}>
          <div style={{ height: 4, borderRadius: 2, width: `${hpPct}%`, background: barColor }} />
        </div>
        <div className="v2-mut" style={{ fontSize: 11, minHeight: 14 }} role="status">
          {saveError ? 'Erro ao salvar' : saving ? 'Salvando…' : saved ? 'Salvo' : ''}
        </div>
      </div>
    </header>
  )
}
