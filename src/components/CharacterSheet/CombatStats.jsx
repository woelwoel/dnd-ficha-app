import { memo, useState } from 'react'
import { formatModifier, calculateInitiative, getModifier, getExhaustionEffects } from '../../utils/calculations'
import { formatHitDicePool } from '../../utils/hitDice'
import { FormFieldError } from '../FormFieldError'
import { RollButton } from '../DiceRoller/RollButton'
import { DamageModal } from './DamageModal'

/* ── Condições D&D 5e (PHB p.290–296) ─────────────────────── */
const CONDITIONS = [
  { id: 'blinded',       label: 'Cego',          icon: '👁️‍🗨️' },
  { id: 'charmed',       label: 'Enfeitiçado',   icon: '💜' },
  { id: 'deafened',      label: 'Surdo',          icon: '🔇' },
  { id: 'frightened',    label: 'Amedrontado',   icon: '😱' },
  { id: 'grappled',      label: 'Agarrado',       icon: '🤜' },
  { id: 'incapacitated', label: 'Incapacitado',  icon: '💢' },
  { id: 'invisible',     label: 'Invisível',     icon: '👻' },
  { id: 'paralyzed',     label: 'Paralisado',    icon: '⚡' },
  { id: 'petrified',     label: 'Petrificado',   icon: '🪨' },
  { id: 'poisoned',      label: 'Envenenado',    icon: '🟢' },
  { id: 'prone',         label: 'Prostrado',     icon: '⬇️' },
  { id: 'restrained',    label: 'Imobilizado',   icon: '🔗' },
  { id: 'stunned',       label: 'Atordoado',     icon: '💫' },
  { id: 'unconscious',   label: 'Inconsciente',  icon: '💤' },
]

/* Descrições de exaustão (PHB p.291) */
const EXHAUSTION_EFFECTS = [
  'Sem efeito',
  'Desvantagem em testes de habilidade',
  'Velocidade reduzida à metade',
  'Desv. em ataques e testes de resistência',
  'Máximo de PV reduzido à metade',
  'Velocidade reduzida a 0',
  'Morte',
]

/* ── Death Saves ───────────────────────────────────────────── */
function DeathSavesTracker({ deathSaves, isStable, isDead, onUpdate, onRoll, onStabilize }) {
  const successes = deathSaves?.successes ?? 0
  const failures  = deathSaves?.failures  ?? 0

  function toggleBubble(type, index, current) {
    // Clique no já-marcado desmarca; clique no próximo marca
    const next = index < current ? current - 1 : index + 1
    onUpdate(type, Math.max(0, Math.min(3, next)))
  }

  if (isDead) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-red-700 font-display uppercase tracking-widest font-bold">
          ☠ Morto
        </p>
        <p className="text-[11px] text-ink-200 italic">
          Personagem morreu. Reviver requer magia (Reviver os Mortos, Ressurreição).
        </p>
      </div>
    )
  }

  if (isStable) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-green-700 font-display uppercase tracking-widest font-bold">
          🛡 Estabilizado
        </p>
        <p className="text-[11px] text-ink-200 italic">
          A 0 PV, mas não faz testes de morte. Recupera 1 PV após 1d4 horas (PHB p.197).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-200 font-semibold uppercase tracking-widest">
          Testes de Morte
        </p>
        <div className="flex gap-1.5">
          {onRoll && (
            <button
              onClick={onRoll}
              title="Rolar 1d20 (PHB p.197): ≤9 falha, ≥10 sucesso, Nat 1 = 2 falhas, Nat 20 recupera com 1 PV"
              className="text-[10px] px-2 py-0.5 rounded bg-ink-500 hover:bg-ink-600 text-parchment-50 font-display tracking-wide"
            >
              🎲 Rolar
            </button>
          )}
          {onStabilize && (
            <button
              onClick={onStabilize}
              title="Estabilizar (DC 10 Medicina ou spare-the-dying — PHB p.197)"
              className="text-[10px] px-2 py-0.5 rounded bg-parchment-300 hover:bg-parchment-400 border border-parchment-600 text-ink-500"
            >
              Estabilizar
            </button>
          )}
        </div>
      </div>
      {[
        { key: 'successes', label: 'Sucesso', color: 'bg-ink-300 border-ink-500' },
        { key: 'failures',  label: 'Falha',   color: 'bg-ink-600 border-ink-700'   },
      ].map(({ key, label, color }) => {
        const count = key === 'successes' ? successes : failures
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-ink-200 w-14 shrink-0">{label}</span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => toggleBubble(key, i, count)}
                  title={i < count ? 'Desmarcar' : 'Marcar'}
                  className={`w-5 h-5 rounded-full border-2 transition-colors ${
                    i < count
                      ? color
                      : 'bg-parchment-50 border-parchment-600 hover:border-ink-300'
                  }`}
                  aria-label={`${label} ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Damage / Heal input ───────────────────────────────────── */
function DamageHealControls({ onApplyDamage, onApplyHealing, disabled }) {
  const [value, setValue] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const num = Math.max(0, parseInt(value, 10) || 0)

  function handle(action) {
    if (num <= 0) return
    action(num)
    setValue('')
  }

  function handleModalConfirm(amount, opts) {
    onApplyDamage(amount, opts)
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-ink-200 font-semibold uppercase tracking-widest">
        Sofrer Dano / Curar
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => setValue(e.target.value)}
          onWheel={e => e.currentTarget.blur()}
          onKeyDown={e => {
            if (e.key === 'Enter' && num > 0) handle(onApplyDamage)
          }}
          placeholder="0"
          disabled={disabled}
          className="w-16 text-center bg-parchment-100 border border-parchment-600 rounded px-2 py-1 text-ink-500 font-bold focus:outline-none focus:border-ink-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40"
        />
        <button
          type="button"
          onClick={() => handle(onApplyDamage)}
          disabled={disabled || num <= 0}
          className="flex-1 text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-parchment-50 font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ⚔ Dano
        </button>
        <button
          type="button"
          onClick={() => handle(onApplyHealing)}
          disabled={disabled || num <= 0}
          className="flex-1 text-xs px-2 py-1 rounded bg-green-700 hover:bg-green-600 text-parchment-50 font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✚ Cura
        </button>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={disabled}
          title="Mais opções (crítico, tipo de dano)"
          className="w-8 h-8 rounded bg-parchment-300 hover:bg-parchment-400 border border-parchment-600 text-ink-500 text-sm flex items-center justify-center disabled:opacity-40"
        >
          ⚙
        </button>
      </div>
      <DamageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
      />
    </div>
  )
}

/* ── Concentration Check prompt ────────────────────────────── */
function ConcentrationCheckPrompt({ dc, conMod, spellName, onPass, onFail, onDismiss }) {
  const [rolled, setRolled] = useState(null)
  const bonus = conMod ?? 0

  function rollNow() {
    const d20 = Math.ceil(Math.random() * 20)
    const total = d20 + bonus
    setRolled({ d20, total, passed: total >= dc })
    if (total >= dc) onPass?.()
    else onFail?.()
  }

  if (rolled) {
    return (
      <div className={`relative border-2 rounded-sm px-3 py-2 ${
        rolled.passed
          ? 'border-green-700 bg-green-50 text-green-700'
          : 'border-red-700 bg-red-50 text-red-700'
      }`}>
        <button onClick={onDismiss} className="absolute top-1 right-2 text-xs opacity-60 hover:opacity-100">✕</button>
        <p className="text-xs">
          🎲 1d20 ({rolled.d20}) {bonus >= 0 ? '+' : ''}{bonus} = <strong>{rolled.total}</strong>{' '}
          vs CD {dc} — {rolled.passed ? '✓ Concentração mantida' : `✗ ${spellName ?? 'Magia'} interrompida!`}
        </p>
      </div>
    )
  }

  return (
    <div className="relative border-2 border-purple-700 bg-purple-50 rounded-sm px-3 py-2">
      <button onClick={onDismiss} className="absolute top-1 right-2 text-xs opacity-60 hover:opacity-100">✕</button>
      <div className="flex items-center justify-between gap-2 pr-4">
        <p className="text-xs text-purple-800">
          🔮 Teste de Concentração: <strong>CON CD {dc}</strong>
          {spellName && <span className="ml-1 italic text-purple-700">({spellName})</span>}
        </p>
        <button
          onClick={rollNow}
          className="text-[10px] px-2 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-parchment-50 font-display tracking-wide shrink-0"
        >
          🎲 Rolar Save
        </button>
      </div>
    </div>
  )
}

/* ── Banner do último evento de dano/cura ────────────────── */
function DamageEventBanner({ event, onDismiss }) {
  if (!event) return null
  const { kind, damageDealt, healed, droppedTo0, instakill, died, revived,
          deathSaveFailuresApplied, concentrationCheckDC,
          roll, success, failure, twoFails, recovered, stabilized } = event

  const lines = []
  if (kind === 'damage') {
    if (damageDealt > 0) lines.push(`-${damageDealt} PV`)
    if (instakill) lines.push('☠ Morte instantânea (dano massivo, PHB p.197)')
    else if (died)  lines.push('☠ Morreu (3 falhas)')
    else if (droppedTo0) lines.push('💀 Caiu para 0 PV — comece os testes de morte!')
    if (deathSaveFailuresApplied > 0) lines.push(`+${deathSaveFailuresApplied} falha(s) de morte (dano enquanto a 0 PV)`)
    if (concentrationCheckDC != null) lines.push(`🔮 Faça um teste de CON CD ${concentrationCheckDC} ou perca a concentração`)
  } else if (kind === 'heal') {
    if (healed > 0) lines.push(`+${healed} PV`)
    if (revived) lines.push('✨ Recuperou a consciência — testes de morte zerados')
  } else if (kind === 'deathSave') {
    if (roll != null) lines.push(`🎲 Rolou ${roll}`)
    if (recovered)  lines.push('✨ Nat 20! Recuperou a consciência com 1 PV')
    else if (died)  lines.push('☠ Morreu (3 falhas)')
    else if (stabilized) lines.push('🛡 Estabilizado (3 sucessos)')
    else if (twoFails)   lines.push('💀 Nat 1: 2 falhas')
    else if (success)    lines.push('✓ Sucesso')
    else if (failure)    lines.push('✗ Falha')
  }
  if (lines.length === 0) return null

  const isBad  = instakill || died || (kind === 'deathSave' && (twoFails || failure))
  const isGood = revived || recovered || stabilized || (kind === 'heal')
  const tone = isBad
    ? 'border-red-700 bg-red-50 text-red-700'
    : isGood
    ? 'border-green-700 bg-green-50 text-green-700'
    : 'border-amber-700 bg-amber-50 text-amber-700'

  return (
    <div className={`relative border-2 rounded-sm px-3 py-2 ${tone}`}>
      <button
        onClick={onDismiss}
        className="absolute top-1 right-2 text-xs opacity-60 hover:opacity-100"
        title="Fechar"
      >✕</button>
      <ul className="text-xs space-y-0.5 pr-4">
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
    </div>
  )
}

/* ── Condições ─────────────────────────────────────────────── */
function ConditionsTracker({ conditions = [], onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const active = CONDITIONS.filter(c => conditions.includes(c.id))

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <span className="text-xs font-display text-ink-500 uppercase tracking-widest">
          Condições
        </span>
        {active.length > 0 && (
          <span className="text-[10px] bg-parchment-300 border border-ink-300 text-ink-500 px-1.5 py-0.5 rounded-full">
            {active.length} ativa{active.length > 1 ? 's' : ''}
          </span>
        )}
        <span className="ml-auto text-ink-200 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>

      {/* Chips das condições ativas — sempre visíveis */}
      {active.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {active.map(c => (
            <button
              key={c.id}
              onClick={() => onToggle(c.id)}
              title="Remover condição"
              className="text-[11px] bg-parchment-300 border border-ink-300 text-ink-500
                px-2 py-0.5 rounded-full hover:bg-parchment-400 transition-colors"
            >
              {c.icon} {c.label} ×
            </button>
          ))}
        </div>
      )}

      {/* Painel expandido com todas as condições */}
      {expanded && (
        <div className="grid grid-cols-2 gap-1 p-2 bg-parchment-50 border border-parchment-600 rounded-lg">
          {CONDITIONS.map(c => {
            const isActive = conditions.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => onToggle(c.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                  isActive
                    ? 'bg-ink-500 border border-ink-600 text-parchment-50'
                    : 'bg-parchment-100 border border-parchment-600 text-ink-200 hover:border-ink-300 hover:text-ink-500'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
                {isActive && <span className="ml-auto text-parchment-50 text-[10px]">✕</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Componente principal ──────────────────────────────────── */
function CombatStatsBase({
  combat, attributes, profBonus, onUpdateCombat,
  suggestedAC, suggestedMaxHp, passivePerception, featSpeedBonus = 0,
  errors = {},
  onUpdateDeathSaves, onToggleCondition, onSetInspiration, onSetExhaustion,
  // Sistema de dano/cura/testes de morte (PR 2 do damage-system).
  onApplyDamage, onApplyHealing, onRollDeathSave, onStabilize,
  lastDamageEvent, onClearDamageEvent,
  // Concentração (PR 3). Quando lastDamageEvent.concentrationCheckDC vem
  // preenchido, mostramos o prompt; ao falhar, chama onBreakConcentration.
  onBreakConcentration,
  // PR 4 — Inspiração consumível como vantagem.
  onConsumeInspiration,
}) {
  const conMod = getModifier(attributes?.con ?? 10)
  const exh = getExhaustionEffects(combat?.exhaustion ?? 0)
  const effectiveSpeed = Math.floor((combat?.speed ?? 0) * exh.speedMultiplier)
  const initiative = calculateInitiative(attributes.dex)
  const initNotation = `1d20${formatModifier(initiative)}`

  function handleHpChange(field, value) {
    const num = parseInt(value, 10)
    if (!isNaN(num)) onUpdateCombat(field, Math.max(0, num))
  }

  function handleTempHpChange(value) {
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    const next = Math.max(0, num)
    onUpdateCombat('tempHp', Math.max(combat.tempHp ?? 0, next))
  }

  const isDowned = (combat.currentHp ?? 0) <= 0

  return (
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg p-4 space-y-4"
      style={{ boxShadow: 'var(--shadow-parchment-sm)' }}>
      <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest border-b border-parchment-600 pb-1">Combate</h3>

      {/* Linha 1: CA / Iniciativa / Velocidade */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatBox label="CA" value={combat.armorClass} editable
          fieldId="field-armorClass"
          errId="err-armorClass"
          error={errors.armorClass}
          onChange={v => onUpdateCombat('armorClass', parseInt(v) || 0)}
          hint={suggestedAC !== undefined && suggestedAC !== combat.armorClass
            ? { label: `Sug: ${suggestedAC}`, onApply: () => onUpdateCombat('armorClass', suggestedAC) }
            : null}
        />
        <StatBox
          label="Iniciativa"
          value={formatModifier(initiative)}
          action={<RollButton notation={initNotation} label="Iniciativa" size="xs" className="mt-0.5" />}
        />
        <StatBox label="Velocidade"
          value={exh.speedMultiplier < 1 ? `${effectiveSpeed}ft` : `${combat.speed}ft`}
          editable={exh.speedMultiplier >= 1}
          onChange={v => onUpdateCombat('speed', Math.max(0, parseInt(v) || 0))}
          warning={
            exh.speedMultiplier === 0 ? '⚠ Imóvel (Exaustão 5)'
            : exh.speedMultiplier < 1 ? '⚠ Metade (Exaustão 2+)'
            : null
          }
          hint={exh.speedMultiplier >= 1 && featSpeedBonus > 0 && combat.speed < (30 + featSpeedBonus)
            ? { label: `Mob: +${featSpeedBonus}ft`, onApply: () => onUpdateCombat('speed', combat.speed + featSpeedBonus) }
            : null}
        />
      </div>

      {/* Linha 2: Bônus de Prof / Dado de Vida / Percepção Passiva */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatBox label="Prof. Bônus" value={formatModifier(profBonus)} />
        <StatBox label="Dado de Vida" value={formatHitDicePool(combat.hitDice)} />
        <StatBox label="Perc. Passiva" value={passivePerception ?? '—'} />
      </div>

      {/* Inspiração + Exaustão */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Inspiração */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSetInspiration?.(!combat.inspiration)}
            title={combat.inspiration ? 'Remover Inspiração' : 'Ganhar Inspiração'}
            className={`w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center text-sm ${
              combat.inspiration
                ? 'bg-ink-500 border-ink-600 text-parchment-50'
                : 'bg-parchment-50 border-parchment-600 hover:border-ink-300 text-ink-200'
            }`}
          >
            {combat.inspiration ? '✦' : ''}
          </button>
          <span className="text-xs text-ink-200">Inspiração</span>
          {combat.inspiration && onConsumeInspiration && (
            <button
              onClick={onConsumeInspiration}
              title="Consumir Inspiração para ganhar vantagem em uma rolagem (PHB p.125)"
              className="text-[10px] px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-parchment-50 font-display tracking-wide"
            >
              💡 Usar (vantagem)
            </button>
          )}
        </div>

        {/* Exaustão */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-ink-200 shrink-0">Exaustão</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map(lvl => (
              <button
                key={lvl}
                onClick={() => onSetExhaustion?.(
                  (combat.exhaustion ?? 0) >= lvl ? lvl - 1 : lvl
                )}
                title={`Nível ${lvl}: ${EXHAUSTION_EFFECTS[lvl]}`}
                className={`w-4 h-4 rounded-sm text-[10px] font-bold border transition-colors ${
                  (combat.exhaustion ?? 0) >= lvl
                    ? 'bg-ink-500 border-ink-600 text-parchment-50'
                    : 'bg-parchment-50 border-parchment-600 text-ink-200 hover:border-ink-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          {(combat.exhaustion ?? 0) > 0 && (
            <span className="text-[10px] ink-italic truncate">
              {EXHAUSTION_EFFECTS[combat.exhaustion ?? 0]}
            </span>
          )}
        </div>
      </div>

      {/* Badges de penalidades ativas por exaustão (PHB p.291) */}
      {(exh.abilityCheckDisadvantage || exh.attackDisadvantage || exh.saveDisadvantage || exh.maxHpMultiplier < 1) && (
        <div className="flex flex-wrap gap-1.5">
          {exh.abilityCheckDisadvantage && (
            <span className="text-[10px] bg-amber-50 border border-amber-700 text-amber-700 px-2 py-0.5 rounded-full">
              ⚠ Desv. em testes de habilidade
            </span>
          )}
          {exh.attackDisadvantage && (
            <span className="text-[10px] bg-red-50 border border-red-700 text-red-700 px-2 py-0.5 rounded-full">
              ⚠ Desv. em ataques
            </span>
          )}
          {exh.saveDisadvantage && (
            <span className="text-[10px] bg-red-50 border border-red-700 text-red-700 px-2 py-0.5 rounded-full">
              ⚠ Desv. em salvaguardas
            </span>
          )}
          {exh.maxHpMultiplier < 1 && (
            <span className="text-[10px] bg-red-50 border border-red-700 text-red-700 px-2 py-0.5 rounded-full">
              ⚠ PV máx. à metade
            </span>
          )}
        </div>
      )}

      {/* HP Tracker */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-ink-200">Pontos de Vida</label>
            <span className="text-xs text-ink-200">Máx: {combat.maxHp}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleHpChange('currentHp', combat.currentHp - 1)}
              className="w-8 h-8 rounded bg-parchment-300 hover:bg-parchment-400 border border-parchment-600 text-ink-500 font-bold text-lg flex items-center justify-center"
            >−</button>
            <input
              id="field-currentHp"
              type="number"
              value={combat.currentHp}
              onChange={e => handleHpChange('currentHp', e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              aria-describedby={errors.currentHp ? 'err-currentHp' : undefined}
              className={`flex-1 text-center bg-parchment-100 border rounded px-2 py-1 text-ink-500 font-bold text-xl focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                errors.currentHp
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-parchment-600 focus:border-ink-300'
              }`}
            />
            <button
              onClick={() => handleHpChange('currentHp', combat.currentHp + 1)}
              className="w-8 h-8 rounded bg-parchment-300 hover:bg-parchment-400 border border-parchment-600 text-ink-500 font-bold text-lg flex items-center justify-center"
            >+</button>
          </div>
          <FormFieldError id="err-currentHp" message={errors.currentHp} />
          {/* HP Bar */}
          <div className="w-full bg-parchment-300 rounded-full h-2 mt-2 border border-parchment-600">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${combat.maxHp > 0 ? Math.min(100, (combat.currentHp / combat.maxHp) * 100) : 0}%`,
                backgroundColor: 'var(--color-ink-300)',
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-ink-200" title="PHB p.198 — HP Temporário não empilha">PV Temporários</label>
            {(combat.tempHp ?? 0) > 0 && (
              <button
                onClick={() => onUpdateCombat('tempHp', 0)}
                className="text-[10px] text-ink-200 hover:text-red-400 underline"
                title="Zerar PV temporários"
              >
                zerar
              </button>
            )}
          </div>
          <input
            type="number"
            min={0}
            value={combat.tempHp}
            onChange={e => handleTempHpChange(e.target.value)}
            onWheel={e => e.currentTarget.blur()}
            title="Nova fonte de PV temporário apenas substitui se for maior (PHB p.198)"
            className="w-full mt-1 text-center bg-parchment-100 border border-parchment-600 rounded px-2 py-1 text-ink-500 focus:outline-none focus:border-ink-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-ink-200">PV Máximo</label>
            {suggestedMaxHp != null && suggestedMaxHp !== combat.maxHp && (
              <button
                onClick={() => onUpdateCombat('maxHp', suggestedMaxHp)}
                className="text-[10px] text-amber-500 hover:text-amber-300 underline"
                title="Aplica o PV calculado pela classe e CON"
              >
                Sugerido: {suggestedMaxHp}
              </button>
            )}
          </div>
          <input
            type="number"
            min={1}
            value={combat.maxHp}
            onChange={e => onUpdateCombat('maxHp', Math.max(1, parseInt(e.target.value) || 1))}
            onWheel={e => e.currentTarget.blur()}
            className="w-full text-center bg-parchment-100 border border-parchment-600 rounded px-2 py-1 text-ink-500 focus:outline-none focus:border-ink-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Damage / Heal — sempre visíveis (substitui o ajuste manual de PV pra
          fluxo RAW PHB: tempHp drain, drop to 0, instakill, etc.) */}
      {onApplyDamage && (
        <DamageHealControls
          onApplyDamage={onApplyDamage}
          onApplyHealing={onApplyHealing}
          disabled={!!combat.isDead}
        />
      )}

      {/* Banner do último evento (auto-dismissable) */}
      {lastDamageEvent && (
        <DamageEventBanner event={lastDamageEvent} onDismiss={onClearDamageEvent} />
      )}

      {/* Prompt de teste de concentração — só aparece se há DC no último evento */}
      {lastDamageEvent?.concentrationCheckDC != null && combat.concentrating?.spellIndex && (
        <ConcentrationCheckPrompt
          dc={lastDamageEvent.concentrationCheckDC}
          conMod={conMod}
          spellName={combat.concentrating?.spellName}
          onPass={() => { /* mantém concentração — apenas limpa o DC visualmente */ }}
          onFail={() => onBreakConcentration?.()}
          onDismiss={onClearDamageEvent}
        />
      )}

      {/* Death Saves — visíveis quando desmaiado, estabilizado ou morto */}
      {(isDowned || combat.isStable || combat.isDead) && (
        <div className="p-3 bg-parchment-50 border border-parchment-600 rounded-lg">
          <DeathSavesTracker
            deathSaves={combat.deathSaves}
            isStable={!!combat.isStable}
            isDead={!!combat.isDead}
            onUpdate={(type, val) => onUpdateDeathSaves?.(type, val)}
            onRoll={onRollDeathSave && !combat.isStable && !combat.isDead ? onRollDeathSave : null}
            onStabilize={onStabilize && !combat.isStable && !combat.isDead ? onStabilize : null}
          />
        </div>
      )}

      {/* Condições */}
      <ConditionsTracker
        conditions={combat.conditions ?? []}
        onToggle={onToggleCondition}
      />
    </div>
  )
}

export const CombatStats = memo(CombatStatsBase)

const StatBox = memo(function StatBox({ label, value, editable, onChange, hint, fieldId, errId, error, action, warning }) {
  return (
    <div className="flex flex-col items-center bg-parchment-50 border border-parchment-600 rounded p-2">
      <span className="text-xs font-display text-ink-500 text-center mb-1 leading-tight uppercase tracking-wide">{label}</span>
      {editable ? (
        <input
          id={fieldId}
          type="number"
          value={typeof value === 'string' ? parseInt(value) || 0 : value}
          onChange={e => onChange(e.target.value)}
          onWheel={e => e.currentTarget.blur()}
          aria-describedby={error ? errId : undefined}
          className={`w-full text-center text-xl font-bold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            error ? 'text-red-300' : 'text-ink-500'
          }`}
        />
      ) : (
        <span className="text-xl font-bold text-ink-500">{value}</span>
      )}
      {action && <div className="mt-0.5">{action}</div>}
      {hint && (
        <button
          onClick={hint.onApply}
          className="text-[9px] text-amber-500 hover:text-amber-300 underline mt-0.5 leading-none"
        >
          {hint.label}
        </button>
      )}
      {warning && (
        <span className="text-[9px] text-red-600 mt-0.5 leading-none text-center">
          {warning}
        </span>
      )}
      {error && (
        <p id={errId} role="alert" className="text-[9px] text-red-400 mt-0.5 text-center leading-none">
          {error}
        </p>
      )}
    </div>
  )
})
