import { memo, useState, useRef } from 'react'
import { formatModifier, calculateInitiative, getModifier, getExhaustionEffects } from '../../utils/calculations'
import { formatHitDicePool } from '../../utils/hitDice'
import { FormFieldError } from '../FormFieldError'
import { RollButton } from '../DiceRoller/RollButton'
import { DamageModal } from './DamageModal'
import { CONDITIONS, EXHAUSTION_EFFECTS } from '../../domain/conditions'
import { Icon } from '../ui/Icon'

/* ── Death Saves ───────────────────────────────────────────── */
function DeathSavesTracker({ deathSaves, isStable, isDead, onUpdate, onRoll, onStabilize, compact = false }) {
  const successes = deathSaves?.successes ?? 0
  const failures  = deathSaves?.failures  ?? 0

  function toggleBubble(type, index, current) {
    // Clique no já-marcado desmarca; clique no próximo marca
    const next = index < current ? current - 1 : index + 1
    onUpdate(type, Math.max(0, Math.min(3, next)))
  }

  if (isDead) {
    return (
      <div
        className={compact ? 'flex items-baseline gap-2' : 'space-y-1'}
        title={compact ? 'Personagem morreu. Reviver requer magia (Reviver os Mortos, Ressurreição).' : undefined}
      >
        <p className="text-sm text-red-700 font-display uppercase tracking-widest font-bold">
          ☠ Morto
        </p>
        {!compact && (
          <p className="text-[13px] text-ink-200 italic">
            Personagem morreu. Reviver requer magia (Reviver os Mortos, Ressurreição).
          </p>
        )}
      </div>
    )
  }

  if (isStable) {
    return (
      <div
        className={compact ? 'flex items-baseline gap-2 flex-wrap' : 'space-y-1'}
        title={compact ? 'A 0 PV, mas não faz testes de morte. Recupera 1 PV após 1d4 horas (PHB p.197).' : undefined}
      >
        <p className="text-sm text-green-700 font-display uppercase tracking-widest font-bold">
          🛡 Estabilizado
        </p>
        {!compact && (
          <p className="text-[13px] text-ink-200 italic">
            A 0 PV, mas não faz testes de morte. Recupera 1 PV após 1d4 horas (PHB p.197).
          </p>
        )}
        {compact && (
          <span className="text-xs ink-italic text-ink-300">
            0 PV · recupera 1 PV após 1d4h
          </span>
        )}
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
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-ink-500 hover:bg-ink-600 text-parchment-50 font-display tracking-wide"
            >
              <Icon name="dice" size={12} strokeWidth={2} />
              Rolar
            </button>
          )}
          {onStabilize && (
            <button
              onClick={onStabilize}
              title="Estabilizar (DC 10 Medicina ou spare-the-dying — PHB p.197)"
              className="text-xs px-2 py-0.5 rounded bg-parchment-300 hover:bg-parchment-400 border border-parchment-600 text-ink-500"
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
  const [needsValue, setNeedsValue] = useState(false)
  const inputRef = useRef(null)
  const num = Math.max(0, parseInt(value, 10) || 0)

  function handle(action) {
    if (num <= 0) {
      // UX: em vez de bloquear silenciosamente, foca o input e mostra hint.
      setNeedsValue(true)
      inputRef.current?.focus()
      return
    }
    setNeedsValue(false)
    action(num)
    setValue('')
  }

  function handleModalConfirm(amount, opts) {
    onApplyDamage(amount, opts)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-ink-200 font-semibold uppercase tracking-widest">
          Sofrer Dano / Curar
        </label>
        {needsValue && (
          <span className="text-xs text-amber-700 italic">
            ↳ Digite quanto dano/cura primeiro
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          min={0}
          value={value}
          onChange={e => { setValue(e.target.value); if (e.target.value) setNeedsValue(false) }}
          onWheel={e => e.currentTarget.blur()}
          onKeyDown={e => {
            if (e.key === 'Enter') handle(onApplyDamage)
          }}
          placeholder="quanto?"
          disabled={disabled}
          aria-label="Quantidade de dano ou cura"
          className={`w-24 text-center bg-parchment-100 border rounded px-2 py-1.5 text-ink-500 font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40 placeholder:text-xs placeholder:font-normal placeholder:italic ${
            needsValue
              ? 'border-amber-600 ring-2 ring-amber-300 focus:border-amber-700'
              : 'border-parchment-600 focus:border-ink-300'
          }`}
        />
        <button
          type="button"
          onClick={() => handle(onApplyDamage)}
          disabled={disabled}
          className="flex-1 text-xs px-2 py-1.5 rounded bg-red-700 hover:bg-red-600 text-parchment-50 font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ⚔ Dano
        </button>
        <button
          type="button"
          onClick={() => handle(onApplyHealing)}
          disabled={disabled}
          className="flex-1 text-xs px-2 py-1.5 rounded bg-green-700 hover:bg-green-600 text-parchment-50 font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
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
        <button onClick={onDismiss} className="absolute top-1 right-2 text-xs opacity-60 hover:opacity-100" aria-label="Fechar">✕</button>
        <p className="text-xs inline-flex items-center gap-1 flex-wrap">
          <Icon name="dice" size={11} strokeWidth={2} />
          1d20 ({rolled.d20}) {bonus >= 0 ? '+' : ''}{bonus} = <strong>{rolled.total}</strong>{' '}
          vs CD {dc} — {rolled.passed ? '✓ Concentração mantida' : `✗ ${spellName ?? 'Magia'} interrompida!`}
        </p>
      </div>
    )
  }

  return (
    <div className="relative border-2 border-purple-700 bg-purple-50 rounded-sm px-3 py-2">
      <button onClick={onDismiss} className="absolute top-1 right-2 text-xs opacity-60 hover:opacity-100" aria-label="Fechar">✕</button>
      <div className="flex items-center justify-between gap-2 pr-4">
        <p className="text-xs text-purple-800 inline-flex items-center gap-1 flex-wrap">
          <Icon name="target" size={11} strokeWidth={2} />
          Teste de Concentração: <strong>CON CD {dc}</strong>
          {spellName && <span className="ml-1 italic text-purple-700">({spellName})</span>}
        </p>
        <button
          onClick={rollNow}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-parchment-50 font-display tracking-wide shrink-0"
        >
          <Icon name="dice" size={11} strokeWidth={2} />
          Rolar Save
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

/* ── Botão individual de condição com expansão de regra ───── */
function ConditionButton({ condition, isActive, onToggle }) {
  const [showRule, setShowRule] = useState(false)
  return (
    <div className="flex flex-col">
      <div className={`flex items-stretch rounded overflow-hidden border ${
        isActive
          ? 'bg-ink-500 border-ink-600 text-parchment-50'
          : 'bg-parchment-100 border-parchment-600 text-ink-200 hover:border-ink-300'
      }`}>
        <button
          onClick={onToggle}
          title={isActive ? 'Remover condição' : 'Adicionar condição'}
          className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 text-xs text-left ${
            isActive ? '' : 'hover:text-ink-500'
          }`}
        >
          <span aria-hidden>{condition.icon}</span>
          <span>{condition.label}</span>
          {isActive && <span className="ml-auto text-parchment-50 text-xs" aria-hidden>✕</span>}
        </button>
        <button
          onClick={() => setShowRule(v => !v)}
          aria-label={`Ler regra de ${condition.label}`}
          aria-expanded={showRule}
          title="Ler regra (PHB)"
          className={`px-2 text-[13px] border-l ${
            isActive
              ? 'border-ink-600/40 text-parchment-50 hover:bg-ink-600'
              : 'border-parchment-600 text-ink-300 hover:text-ink-500 hover:bg-parchment-200'
          }`}
        >
          {showRule ? '▴' : 'ℹ'}
        </button>
      </div>
      {showRule && (
        <p className={`text-xs leading-relaxed px-2 py-1.5 border border-t-0 rounded-b ${
          isActive
            ? 'border-ink-600 bg-ink-500/10 text-ink-500'
            : 'border-parchment-600 bg-parchment-50 text-ink-300 italic'
        }`}>
          {condition.rule}
        </p>
      )}
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
          <span className="text-xs bg-parchment-300 border border-ink-300 text-ink-500 px-1.5 py-0.5 rounded-full">
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
              className="text-[13px] bg-parchment-300 border border-ink-300 text-ink-500
                px-2 py-0.5 rounded-full hover:bg-parchment-400 transition-colors"
            >
              {c.icon} {c.label} ×
            </button>
          ))}
        </div>
      )}

      {/* Painel expandido com todas as condições — botão "?" abre regra */}
      {expanded && (
        <div className="grid grid-cols-2 gap-1 p-2 bg-parchment-50 border border-parchment-600 rounded-lg">
          {CONDITIONS.map(c => {
            const isActive = conditions.includes(c.id)
            return (
              <ConditionButton
                key={c.id}
                condition={c}
                isActive={isActive}
                onToggle={() => onToggle(c.id)}
              />
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
  // Modo compacto: esconde CA/INIT/VEL e tracker de PV (vivem na barra
  // sticky agora). Mantém só ajustes avançados: PV Máx/Temp, Insp,
  // Exaustão, mortes, condições, eventos de dano.
  compact = false,
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
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg p-4 space-y-4 shadow-parchment-sm">
      <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest border-b border-parchment-600 pb-1">
        {compact ? 'Detalhes' : 'Combate'}
      </h3>

      {/* Linha 1: CA / Iniciativa / Velocidade (ocultos em modo compacto — barra sticky cobre) */}
      {!compact && (
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
      )}

      {/* Linha 2: Bônus de Prof / Dado de Vida / Percepção Passiva.
          Em modo compacto vira uma linha de pills (não cards grandes). */}
      {compact ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-baseline gap-1">
            <span className="text-xs font-display tracking-widest uppercase text-ink-300">Prof</span>
            <span className="font-bold text-ink-500 tabular-nums">{formatModifier(profBonus)}</span>
          </span>
          <span className="flex items-baseline gap-1">
            <span className="text-xs font-display tracking-widest uppercase text-ink-300">DV</span>
            <span className="font-bold text-ink-500 tabular-nums">{formatHitDicePool(combat.hitDice)}</span>
          </span>
          <span className="flex items-baseline gap-1">
            <span className="text-xs font-display tracking-widest uppercase text-ink-300">Perc. Passiva</span>
            <span className="font-bold text-ink-500 tabular-nums">{passivePerception ?? '—'}</span>
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatBox label="Prof. Bônus" value={formatModifier(profBonus)} />
          <StatBox label="Dado de Vida" value={formatHitDicePool(combat.hitDice)} />
          <StatBox label="Perc. Passiva" value={passivePerception ?? '—'} />
        </div>
      )}

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
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-parchment-50 font-display tracking-wide"
            >
              <Icon name="idea" size={11} strokeWidth={2} />
              Usar (vantagem)
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
                className={`w-4 h-4 rounded-sm text-xs font-bold border transition-colors ${
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
            <span className="text-xs ink-italic truncate">
              {EXHAUSTION_EFFECTS[combat.exhaustion ?? 0]}
            </span>
          )}
        </div>
      </div>

      {/* Badges de penalidades ativas por exaustão (PHB p.291) */}
      {(exh.abilityCheckDisadvantage || exh.attackDisadvantage || exh.saveDisadvantage || exh.maxHpMultiplier < 1) && (
        <div className="flex flex-wrap gap-1.5">
          {exh.abilityCheckDisadvantage && (
            <span className="text-xs bg-amber-50 border border-amber-700 text-amber-700 px-2 py-0.5 rounded-full">
              ⚠ Desv. em testes de habilidade
            </span>
          )}
          {exh.attackDisadvantage && (
            <span className="text-xs bg-red-50 border border-red-700 text-red-700 px-2 py-0.5 rounded-full">
              ⚠ Desv. em ataques
            </span>
          )}
          {exh.saveDisadvantage && (
            <span className="text-xs bg-red-50 border border-red-700 text-red-700 px-2 py-0.5 rounded-full">
              ⚠ Desv. em salvaguardas
            </span>
          )}
          {exh.maxHpMultiplier < 1 && (
            <span className="text-xs bg-red-50 border border-red-700 text-red-700 px-2 py-0.5 rounded-full">
              ⚠ PV máx. à metade
            </span>
          )}
        </div>
      )}

      {/* HP Tracker — esconde o PV current em modo compacto (barra sticky cobre);
          PV Temp e PV Máx ficam lado a lado no compact pra economizar altura. */}
      <div className={compact ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
        {!compact && (
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
              className="h-2 rounded-full transition-all bg-ink-300"
              style={{ width: `${combat.maxHp > 0 ? Math.min(100, (combat.currentHp / combat.maxHp) * 100) : 0}%` }}
            />
          </div>
        </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-ink-200" title="PHB p.198 — HP Temporário não empilha">PV Temporários</label>
            {(combat.tempHp ?? 0) > 0 && (
              <button
                onClick={() => onUpdateCombat('tempHp', 0)}
                className="text-xs text-ink-200 hover:text-red-400 underline"
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
                className="text-xs text-amber-500 hover:text-amber-300 underline"
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

      {/* Damage / Heal — esconde em modo compacto (barra sticky tem controles rápidos
          e o modal de opções avançadas é acessível via ⚙ ali) */}
      {!compact && onApplyDamage && (
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

      {/* Death Saves — visíveis quando desmaiado, estabilizado ou morto.
          Em modo compacto, padding menor; texto auxiliar fica via tooltip. */}
      {(isDowned || combat.isStable || combat.isDead) && (
        <div className={`bg-parchment-50 border border-parchment-600 rounded-lg ${compact ? 'p-2' : 'p-3'}`}>
          <DeathSavesTracker
            deathSaves={combat.deathSaves}
            isStable={!!combat.isStable}
            isDead={!!combat.isDead}
            onUpdate={(type, val) => onUpdateDeathSaves?.(type, val)}
            onRoll={onRollDeathSave && !combat.isStable && !combat.isDead ? onRollDeathSave : null}
            onStabilize={onStabilize && !combat.isStable && !combat.isDead ? onStabilize : null}
            compact={compact}
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
          className="text-[13px] text-amber-500 hover:text-amber-300 underline mt-0.5 leading-none"
        >
          {hint.label}
        </button>
      )}
      {warning && (
        <span className="text-[13px] text-red-600 mt-0.5 leading-none text-center">
          {warning}
        </span>
      )}
      {error && (
        <p id={errId} role="alert" className="text-[13px] text-red-400 mt-0.5 text-center leading-none">
          {error}
        </p>
      )}
    </div>
  )
})
