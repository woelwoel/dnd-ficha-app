import { useState, useEffect, useRef } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { RestActions } from '../RestActions'
import { CONDITIONS, CONDITIONS_BY_ID } from '../../../domain/conditions'
import { DamageModal } from '../DamageModal'
import { CharacterInfo } from '../CharacterInfo'
import { SourcePicker } from '../../SourcePicker'
import { LevelProgression } from '../LevelProgression'
import { safeParseCharacter } from '../../../domain/characterSchema'
import { EditDialog } from './EditDialog'

export function HeaderV2({ onBack, onExport, onPrint, onImport, onImportError, saving, saved, saveError }) {
  const { character, setCharacter, calc, readOnly, updaters, handlers, races, classes, backgrounds, fichaErrors, classData, onNavigateToSpells } = useCharacterContext()
  const { info, combat } = character
  const [hpEditOpen, setHpEditOpen] = useState(false)
  const [damageOpen, setDamageOpen] = useState(false)
  const [healOpen, setHealOpen] = useState(false)
  const [condOpen, setCondOpen] = useState(false)
  const [identityOpen, setIdentityOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [progressionOpen, setProgressionOpen] = useState(false)
  const importRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target.result)
        const parsed = safeParseCharacter(raw)
        if (!parsed.success) throw new Error('schema')
        onImport(parsed.data)
      } catch {
        onImportError('Arquivo inválido. Importe uma ficha exportada pelo app.')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

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

      {readOnly ? (
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{info.name || 'Sem nome'}</div>
          <div className="v2-mut" style={{ fontSize: 12 }}>{summary}</div>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Editar identidade"
          onClick={() => setIdentityOpen(true)}
          style={{ flex: 1, minWidth: 160, background: 'none', border: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', padding: 0 }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>{info.name || 'Sem nome'}</div>
          <div className="v2-mut" style={{ fontSize: 12 }}>{summary}</div>
        </button>
      )}

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
            {!readOnly && (
              <button
                type="button"
                aria-label={`Remover ${CONDITIONS_BY_ID[id]?.label ?? id}`}
                onClick={() => updaters.toggleCondition(id)}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', marginLeft: 4 }}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
          <button type="button" className="v2-chip" style={{ cursor: 'pointer', border: 0 }} onClick={() => setCondOpen(true)}>
            + Condição
          </button>
        )}
      </div>

      <details style={{ position: 'relative' }}>
        <summary className="v2-btn" style={{ listStyle: 'none', cursor: 'pointer' }}>Descansos</summary>
        <div style={{ position: 'absolute', right: 0, zIndex: 40, marginTop: 6, minWidth: 320 }}>
          <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0 }}>
            <RestActions character={character} onApply={setCharacter} />
          </fieldset>
        </div>
      </details>

      {!readOnly && (
        <button type="button" className="v2-btn" onClick={() => setProgressionOpen(true)}>▲ Nível</button>
      )}
      {/* Exportar/Imprimir migram pra seção "Mais" no mobile (< lg) — header compacto.
         `contents` mantém o posicionamento flex no desktop. */}
      <span className="hidden lg:contents">
        <button type="button" className="v2-btn" onClick={onExport}>Exportar</button>
        <button type="button" className="v2-btn" onClick={onPrint}>Imprimir</button>
      </span>
      <button type="button" className="v2-btn" aria-label="Configurações da ficha" onClick={() => setSettingsOpen(true)}>⚙</button>

      <div style={{ textAlign: 'right', minWidth: 130 }}>
        <div className="v2-row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          <div className="v2-title" style={{ margin: 0 }}>Pontos de vida</div>
          {!readOnly && (
            <button
              type="button"
              className="v2-btn"
              aria-label="Editar pontos de vida"
              style={{ padding: '0 6px', lineHeight: 1 }}
              onClick={() => setHpEditOpen(true)}
            >
              ✎
            </button>
          )}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>
          <span>{combat?.currentHp ?? 0}</span> <span className="v2-mut" style={{ fontSize: 13 }}>/ {combat?.maxHp ?? 0}</span>
          {(combat?.tempHp ?? 0) > 0 && (
            <span className="v2-chip" style={{ marginLeft: 6, fontSize: 11, color: 'var(--v2-accent)' }}>+{combat.tempHp} temp</span>
          )}
        </div>
        {(combat?.currentHp ?? 0) === 0 ? (
          <DeathSaves combat={combat} readOnly={readOnly} updaters={updaters} />
        ) : (
          <div style={{ height: 4, borderRadius: 2, background: 'var(--v2-surface-2)' }}>
            <div style={{ height: 4, borderRadius: 2, width: `${hpPct}%`, background: barColor }} />
          </div>
        )}
        {!readOnly && (
          <div className="v2-row" style={{ justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
            <button type="button" className="v2-btn" onClick={() => setDamageOpen(true)}>Dano</button>
            <button type="button" className="v2-btn" onClick={() => setHealOpen(true)}>Cura</button>
          </div>
        )}
        <div className="v2-mut" style={{ fontSize: 11, minHeight: 14 }} role="status">
          {saveError ? 'Erro ao salvar' : saving ? 'Salvando…' : saved ? 'Salvo' : ''}
        </div>
      </div>

      <HpEditor open={hpEditOpen} onClose={() => setHpEditOpen(false)} />
      <HealEditor open={healOpen} onClose={() => setHealOpen(false)} />
      <ConditionsPanel open={condOpen} onClose={() => setCondOpen(false)} />
      <DamageModal
        open={damageOpen}
        onClose={() => setDamageOpen(false)}
        onConfirm={(amount, opts) => updaters.applyDamage(amount, opts)}
      />
      <EditDialog open={identityOpen} onClose={() => setIdentityOpen(false)} title="Identidade" size="md">
        <CharacterInfo
          info={{ ...character.info, languages: character.proficiencies.languages ?? [] }}
          onUpdate={updaters.updateInfo}
          races={races}
          classes={classes}
          backgrounds={backgrounds}
          errors={fichaErrors}
          onRaceChange={handlers.handleRaceChange}
          onSubraceChange={handlers.handleSubraceChange}
          onBackgroundChange={handlers.handleBackgroundChange}
          onClassChange={handlers.handleClassChange}
          onToggleLanguage={updaters.toggleLanguage}
        />
      </EditDialog>
      <EditDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Configurações da ficha" size="md">
        <SourcePicker
          value={character.meta?.settings?.sources ?? ['phb']}
          onChange={readOnly ? () => {} : (next) => setCharacter({
            ...character,
            meta: { ...character.meta, settings: { ...character.meta?.settings, sources: next } },
          })}
        />
        <label className="v2-row" style={{ justifyContent: 'flex-start', gap: 8, marginTop: 12 }}>
          <input
            type="checkbox"
            aria-label="Permitir multiclasse"
            checked={character.meta?.settings?.allowMulticlass ?? true}
            disabled={readOnly}
            onChange={e => setCharacter({
              ...character,
              meta: { ...character.meta, settings: { ...character.meta?.settings, allowMulticlass: e.target.checked } },
            })}
          />
          Permitir multiclasse
        </label>
        <label className="v2-row" style={{ justifyContent: 'flex-start', gap: 8, marginTop: 8 }}>
          <input
            type="checkbox"
            aria-label="Permitir talentos"
            checked={character.meta?.settings?.allowFeats ?? false}
            disabled={readOnly}
            onChange={e => setCharacter({
              ...character,
              meta: { ...character.meta, settings: { ...character.meta?.settings, allowFeats: e.target.checked } },
            })}
          />
          Permitir talentos
        </label>
        <div style={{ marginTop: 16 }}>
          <div className="v2-title" style={{ margin: 0, marginBottom: 6 }}>Importar ficha</div>
          <input ref={importRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
          <button type="button" className="v2-btn" disabled={readOnly} onClick={() => importRef.current?.click()}>Importar JSON</button>
        </div>
      </EditDialog>
      <EditDialog open={progressionOpen} onClose={() => setProgressionOpen(false)} title="Progressão" size="full">
        <LevelProgression
          character={character}
          classData={classData}
          classes={classes}
          onLevelChange={lvl => updaters.updateInfo('level', lvl)}
          onApplyLevelUp={handlers.handleApplyLevelUp}
          onAddMulticlass={handlers.handleAddMulticlass}
          onRemoveMulticlass={handlers.handleRemoveMulticlass}
          onChosenFeaturesChange={handlers.handleChosenFeaturesChange}
          onNavigateToSpells={(spellId) => { setProgressionOpen(false); onNavigateToSpells?.(spellId) }}
          allowMulticlass={character.meta?.settings?.allowMulticlass ?? true}
          allowFeats={character.meta?.settings?.allowFeats ?? false}
        />
      </EditDialog>
    </header>
  )
}

function DeathSaves({ combat, readOnly, updaters }) {
  const successes = combat?.deathSaves?.successes ?? 0
  const failures = combat?.deathSaves?.failures ?? 0
  const dots = (count, color) => (
    Array.from({ length: 3 }, (_, i) => (
      <span
        key={i}
        aria-hidden="true"
        style={{
          display: 'inline-block', width: 10, height: 10, borderRadius: '50%', marginLeft: 2,
          background: i < count ? color : 'var(--v2-surface-2)',
          border: `1px solid ${color}`,
        }}
      />
    ))
  )
  return (
    <div style={{ marginTop: 4 }}>
      <div className="v2-mut" style={{ fontSize: 11 }}>Testes de morte</div>
      <div className="v2-row" style={{ justifyContent: 'flex-end', gap: 8, fontSize: 11 }}>
        <span className="v2-mut">Sucessos {dots(successes, 'var(--v2-success)')}</span>
        <span className="v2-mut">Falhas {dots(failures, 'var(--v2-danger)')}</span>
      </div>
      {!readOnly && (
        <div className="v2-row" style={{ justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
          <button type="button" className="v2-btn" onClick={() => updaters.rollDeathSave()}>Rolar</button>
          <button type="button" className="v2-btn" onClick={() => updaters.stabilize()}>Estabilizar</button>
        </div>
      )}
    </div>
  )
}

function ConditionsPanel({ open, onClose }) {
  const { character, updaters } = useCharacterContext()
  const { combat } = character
  const activeConditions = combat?.conditions ?? []
  const exhaustion = combat?.exhaustion ?? 0
  return (
    <EditDialog open={open} onClose={onClose} title="Condições" size="md">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {CONDITIONS.map(c => (
          <label key={c.id} className="v2-row" style={{ justifyContent: 'flex-start', gap: 8 }}>
            <input
              type="checkbox"
              checked={activeConditions.includes(c.id)}
              onChange={() => updaters.toggleCondition(c.id)}
            />
            <span>{c.label}</span>
          </label>
        ))}
      </div>
      <div className="v2-row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <span>Exaustão</span>
        <div className="v2-row" style={{ gap: 8 }}>
          <button type="button" className="v2-btn" aria-label="Diminuir exaustão" onClick={() => updaters.setExhaustion(exhaustion - 1)}>−</button>
          <span>{exhaustion}</span>
          <button type="button" className="v2-btn" aria-label="Aumentar exaustão" onClick={() => updaters.setExhaustion(exhaustion + 1)}>+</button>
        </div>
      </div>
      <label className="v2-row" style={{ justifyContent: 'flex-start', gap: 8, marginTop: 12 }}>
        <input
          type="checkbox"
          aria-label="Inspiração"
          checked={!!combat?.inspiration}
          onChange={e => updaters.setInspiration(e.target.checked)}
        />
        Inspiração
      </label>
    </EditDialog>
  )
}

function HpEditor({ open, onClose }) {
  const { character, calc, updaters } = useCharacterContext()
  const [maxHp, setMaxHp] = useState('')
  const [tempHp, setTempHp] = useState('')
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaxHp(String(character.combat?.maxHp ?? 0))
      setTempHp(String(character.combat?.tempHp ?? 0))
    }
  }, [open, character.combat?.maxHp, character.combat?.tempHp])
  const nMax = Number(maxHp)
  const nTemp = Number(tempHp)
  const maxHpValid = Number.isFinite(nMax) && nMax >= 1
  const inputStyle = { width: 90, background: 'var(--v2-surface-2)', color: 'var(--v2-text-1)', border: '1px solid var(--v2-border)', borderRadius: 8, padding: '6px 10px' }
  return (
    <EditDialog open={open} onClose={onClose} title="Pontos de vida">
      <label className="v2-row" style={{ gap: 12 }}>
        <span className="v2-mut">PV máximo</span>
        <input type="number" min="1" value={maxHp} onChange={e => setMaxHp(e.target.value)} style={inputStyle} />
      </label>
      <button type="button" className="v2-mut" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12, padding: '2px 0' }}
        onClick={() => setMaxHp(String(calc.suggestedMaxHp ?? ''))}>
        Sugerido: {calc.suggestedMaxHp}
      </button>
      <label className="v2-row" style={{ gap: 12 }}>
        <span className="v2-mut">PV temporário</span>
        <input type="number" min="0" value={tempHp} onChange={e => setTempHp(e.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button type="button" className="v2-btn" disabled={!maxHpValid} onClick={() => {
          if (maxHpValid) updaters.updateCombat('maxHp', nMax)
          if (Number.isFinite(nTemp) && nTemp >= 0) updaters.updateCombat('tempHp', nTemp)
          onClose()
        }}>Aplicar</button>
      </div>
    </EditDialog>
  )
}

function HealEditor({ open, onClose }) {
  const { updaters } = useCharacterContext()
  const [value, setValue] = useState('')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setValue('')
  }, [open])
  const n = Number(value)
  const healValid = Number.isFinite(n) && n > 0
  const inputStyle = { width: 90, background: 'var(--v2-surface-2)', color: 'var(--v2-text-1)', border: '1px solid var(--v2-border)', borderRadius: 8, padding: '6px 10px' }
  return (
    <EditDialog open={open} onClose={onClose} title="Curar">
      <label className="v2-row" style={{ gap: 12 }}>
        <span className="v2-mut">Pontos de vida a curar</span>
        <input type="number" min="0" value={value} onChange={e => setValue(e.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button type="button" className="v2-btn" disabled={!healValid} onClick={() => {
          if (healValid) updaters.applyHealing(n)
          onClose()
        }}>Aplicar cura</button>
      </div>
    </EditDialog>
  )
}
