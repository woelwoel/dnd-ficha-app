import { memo, useState } from 'react'
import { formatModifier, calculateInitiative } from '../../utils/calculations'
import { formatHitDicePool } from '../../utils/hitDice'
import { FormFieldError } from '../FormFieldError'
import { RollButton } from '../DiceRoller/RollButton'

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
function DeathSavesTracker({ deathSaves, onUpdate }) {
  const successes = deathSaves?.successes ?? 0
  const failures  = deathSaves?.failures  ?? 0

  function toggleBubble(type, index, current) {
    // Clique no já-marcado desmarca; clique no próximo marca
    const next = index < current ? current - 1 : index + 1
    onUpdate(type, Math.max(0, Math.min(3, next)))
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
        Testes de Morte
      </p>
      {[
        { key: 'successes', label: 'Sucesso', color: 'bg-green-500 border-green-400' },
        { key: 'failures',  label: 'Falha',   color: 'bg-red-500 border-red-400'   },
      ].map(({ key, label, color }) => {
        const count = key === 'successes' ? successes : failures
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => toggleBubble(key, i, count)}
                  title={i < count ? 'Desmarcar' : 'Marcar'}
                  className={`w-5 h-5 rounded-full border-2 transition-colors ${
                    i < count
                      ? color
                      : 'bg-gray-800 border-gray-600 hover:border-gray-400'
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
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
          Condições
        </span>
        {active.length > 0 && (
          <span className="text-[10px] bg-red-900/40 border border-red-700 text-red-300 px-1.5 py-0.5 rounded-full">
            {active.length} ativa{active.length > 1 ? 's' : ''}
          </span>
        )}
        <span className="ml-auto text-gray-600 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>

      {/* Chips das condições ativas — sempre visíveis */}
      {active.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {active.map(c => (
            <button
              key={c.id}
              onClick={() => onToggle(c.id)}
              title="Remover condição"
              className="text-[11px] bg-red-900/30 border border-red-700/60 text-red-300
                px-2 py-0.5 rounded-full hover:bg-red-900/60 transition-colors"
            >
              {c.icon} {c.label} ×
            </button>
          ))}
        </div>
      )}

      {/* Painel expandido com todas as condições */}
      {expanded && (
        <div className="grid grid-cols-2 gap-1 p-2 bg-gray-900 rounded-lg">
          {CONDITIONS.map(c => {
            const isActive = conditions.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => onToggle(c.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                  isActive
                    ? 'bg-red-900/40 border border-red-700 text-red-300'
                    : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
                {isActive && <span className="ml-auto text-red-500 text-[10px]">✕</span>}
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
  suggestedAC, suggestedMaxHp, passivePerception,
  errors = {},
  onUpdateDeathSaves, onToggleCondition, onSetInspiration, onSetExhaustion,
}) {
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
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Combate</h3>

      {/* Linha 1: CA / Iniciativa / Velocidade */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatBox label="CA" value={combat.armorClass} editable
          fieldId="field-armorClass"
          errId="err-armorClass"
          error={errors.armorClass}
          onChange={v => onUpdateCombat('armorClass', Math.max(0, parseInt(v) || 0))}
          hint={suggestedAC !== undefined && suggestedAC !== combat.armorClass
            ? { label: `Sug: ${suggestedAC}`, onApply: () => onUpdateCombat('armorClass', suggestedAC) }
            : null}
        />
        <StatBox
          label="Iniciativa"
          value={formatModifier(initiative)}
          action={<RollButton notation={initNotation} label="Iniciativa" size="xs" className="mt-0.5" />}
        />
        <StatBox label="Velocidade" value={`${combat.speed}ft`} editable
          onChange={v => onUpdateCombat('speed', Math.max(0, parseInt(v) || 0))} />
      </div>

      {/* Linha 2: Bônus de Prof / Dado de Vida / Percepção Passiva */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatBox label="Prof. Bônus" value={formatModifier(profBonus)} />
        <StatBox label="Dado de Vida" value={formatHitDicePool(combat.hitDice)} />
        <StatBox label="Perc. Passiva" value={passivePerception ?? '—'} />
      </div>

      {/* Inspiração + Exaustão */}
      <div className="flex items-center gap-4">
        {/* Inspiração */}
        <label className="flex items-center gap-2 cursor-pointer">
          <button
            onClick={() => onSetInspiration?.(!combat.inspiration)}
            title={combat.inspiration ? 'Remover Inspiração' : 'Ganhar Inspiração'}
            className={`w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center text-sm ${
              combat.inspiration
                ? 'bg-amber-500 border-amber-400 text-white'
                : 'bg-gray-800 border-gray-600 hover:border-amber-500 text-gray-600'
            }`}
          >
            {combat.inspiration ? '✦' : ''}
          </button>
          <span className="text-xs text-gray-400">Inspiração</span>
        </label>

        {/* Exaustão */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-gray-400 shrink-0">Exaustão</span>
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
                    ? lvl >= 5 ? 'bg-red-700 border-red-500 text-white'
                      : lvl >= 3 ? 'bg-orange-700 border-orange-500 text-white'
                      : 'bg-yellow-700 border-yellow-500 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-600 hover:border-gray-500'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          {(combat.exhaustion ?? 0) > 0 && (
            <span className="text-[10px] text-orange-400 truncate">
              {EXHAUSTION_EFFECTS[combat.exhaustion ?? 0]}
            </span>
          )}
        </div>
      </div>

      {/* HP Tracker */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-gray-400">Pontos de Vida</label>
            <span className="text-xs text-gray-500">Máx: {combat.maxHp}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleHpChange('currentHp', combat.currentHp - 1)}
              className="w-8 h-8 rounded bg-red-900 hover:bg-red-700 text-white font-bold text-lg flex items-center justify-center"
            >−</button>
            <input
              id="field-currentHp"
              type="number"
              value={combat.currentHp}
              onChange={e => handleHpChange('currentHp', e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              aria-describedby={errors.currentHp ? 'err-currentHp' : undefined}
              className={`flex-1 text-center bg-gray-700 border rounded px-2 py-1 text-white font-bold text-xl focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                errors.currentHp
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-gray-500 focus:border-amber-400'
              }`}
            />
            <button
              onClick={() => handleHpChange('currentHp', combat.currentHp + 1)}
              className="w-8 h-8 rounded bg-green-900 hover:bg-green-700 text-white font-bold text-lg flex items-center justify-center"
            >+</button>
          </div>
          <FormFieldError id="err-currentHp" message={errors.currentHp} />
          {/* HP Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${combat.maxHp > 0 ? Math.min(100, (combat.currentHp / combat.maxHp) * 100) : 0}%`,
                backgroundColor: combat.currentHp > combat.maxHp * 0.5 ? '#22c55e'
                  : combat.currentHp > combat.maxHp * 0.25 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400" title="PHB p.198 — HP Temporário não empilha">PV Temporários</label>
            {(combat.tempHp ?? 0) > 0 && (
              <button
                onClick={() => onUpdateCombat('tempHp', 0)}
                className="text-[10px] text-gray-500 hover:text-red-400 underline"
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
            className="w-full mt-1 text-center bg-gray-700 border border-gray-500 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400">PV Máximo</label>
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
            className="w-full text-center bg-gray-700 border border-gray-500 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Death Saves — visíveis quando desmaiado */}
      {isDowned && (
        <div className="p-3 bg-gray-900/60 border border-red-900/40 rounded-lg">
          <DeathSavesTracker
            deathSaves={combat.deathSaves}
            onUpdate={(type, val) => onUpdateDeathSaves?.(type, val)}
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

const StatBox = memo(function StatBox({ label, value, editable, onChange, hint, fieldId, errId, error, action }) {
  return (
    <div className="flex flex-col items-center bg-gray-900 rounded p-2">
      <span className="text-xs text-gray-400 text-center mb-1 leading-tight">{label}</span>
      {editable ? (
        <input
          id={fieldId}
          type="number"
          value={typeof value === 'string' ? parseInt(value) || 0 : value}
          onChange={e => onChange(e.target.value)}
          onWheel={e => e.currentTarget.blur()}
          aria-describedby={error ? errId : undefined}
          className={`w-full text-center text-xl font-bold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            error ? 'text-red-300' : 'text-white'
          }`}
        />
      ) : (
        <span className="text-xl font-bold text-white">{value}</span>
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
      {error && (
        <p id={errId} role="alert" className="text-[9px] text-red-400 mt-0.5 text-center leading-none">
          {error}
        </p>
      )}
    </div>
  )
})
