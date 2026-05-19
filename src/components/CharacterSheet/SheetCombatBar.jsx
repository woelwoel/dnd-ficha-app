import { useState, useRef } from 'react'
import { useCharacterContext } from './CharacterContext'
import { CONDITIONS_BY_ID } from '../../domain/conditions'

/* Pequeno controle inline de dano/cura ──────────────────────── */
function HpQuickControls({ onDamage, onHeal, disabled }) {
  const [value, setValue] = useState('')
  const ref = useRef(null)
  const num = Math.max(0, parseInt(value, 10) || 0)

  function fire(fn) {
    if (num <= 0) { ref.current?.focus(); return }
    fn(num)
    setValue('')
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={ref}
        type="number"
        min={0}
        value={value}
        onChange={e => setValue(e.target.value)}
        onWheel={e => e.currentTarget.blur()}
        onKeyDown={e => { if (e.key === 'Enter') fire(onDamage) }}
        placeholder="—"
        disabled={disabled}
        aria-label="Quantidade de dano ou cura"
        className="w-12 text-center bg-parchment-50 border-2 border-parchment-600 rounded-sm px-1 py-0.5 text-ink-500 text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40 placeholder:text-ink-300 placeholder:font-normal"
      />
      <button
        type="button"
        onClick={() => fire(onDamage)}
        disabled={disabled}
        aria-label="Aplicar dano"
        title="Aplicar dano"
        className="px-2 py-0.5 rounded-sm bg-red-700/90 hover:bg-red-700 text-parchment-50 text-xs font-display tracking-wide disabled:opacity-40"
      >−</button>
      <button
        type="button"
        onClick={() => fire(onHeal)}
        disabled={disabled}
        aria-label="Aplicar cura"
        title="Aplicar cura"
        className="px-2 py-0.5 rounded-sm bg-green-700/90 hover:bg-green-700 text-parchment-50 text-xs font-display tracking-wide disabled:opacity-40"
      >+</button>
    </div>
  )
}

/* Chip de stat numérico (CA / INIT / VEL) ──────────────────────
 * Quando `editable` + `onChange` são passados, o valor vira input.
 */
function StatChip({ icon, label, value, title, editable = false, onChange }) {
  return (
    <div
      title={title}
      className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-parchment-50/80 border border-parchment-600 text-ink-500"
    >
      <span aria-hidden className="text-sm leading-none">{icon}</span>
      <span className="text-[10px] font-display tracking-widest uppercase text-ink-300 leading-none">{label}</span>
      {editable && onChange ? (
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(e.target.value)}
          onWheel={e => e.currentTarget.blur()}
          aria-label={label}
          className="w-10 text-center text-sm font-bold leading-none bg-transparent focus:outline-none focus:bg-parchment-100 rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <span className="text-sm font-bold leading-none">{value}</span>
      )}
    </div>
  )
}

/* Chip de condição ativa (clicável remove + tooltip de regra) ─ */
function ConditionChip({ id, onToggle }) {
  const c = CONDITIONS_BY_ID[id]
  if (!c) return null
  return (
    <button
      type="button"
      onClick={() => onToggle(id, false)}
      title={`${c.label} — ${c.rule}\n\n(clique pra remover)`}
      className="flex items-center gap-1 px-2 py-0.5 rounded-sm bg-amber-100 border border-amber-600 text-ink-500 text-xs hover:bg-amber-200 transition-colors"
    >
      <span aria-hidden>{c.icon}</span>
      <span className="font-semibold">{c.label}</span>
      <span aria-hidden className="text-ink-300 ml-0.5">×</span>
    </button>
  )
}

/* Componente principal ───────────────────────────────────────── */
export function SheetCombatBar() {
  const { character, calc, updaters } = useCharacterContext()
  const combat = character.combat ?? {}
  const info = character.info ?? {}

  const currentHp = combat.currentHp ?? 0
  const maxHp = combat.maxHp ?? 1
  const tempHp = combat.temporaryHp ?? 0
  const hpPct = Math.max(0, Math.min(100, (currentHp / Math.max(1, maxHp)) * 100))

  const ac = combat.armorClass ?? calc?.suggestedAC ?? 10
  // Iniciativa: usa o cálculo (mod de DES + feats como Alert) em vez do override
  // armazenado em combat.initiative — esse só vale como display histórico/fallback.
  const init = calc?.initiative ?? combat.initiative ?? 0
  const speed = combat.speed ?? 30

  // Stats de conjuração — só aparecem se o personagem é caster (tem ability key).
  const spellAbilityKey = calc?.spellAbilityKey ?? null
  const spellSaveDC = calc?.spellSaveDC ?? null
  const spellAttackBonus = calc?.spellAttackBonus ?? null
  const isCaster = !!spellAbilityKey && spellSaveDC != null
  const SPELL_ABILITY_ABBR = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' }
  const spellAbilityAbbr = spellAbilityKey ? (SPELL_ABILITY_ABBR[spellAbilityKey] ?? spellAbilityKey.toUpperCase()) : null

  const activeConditions = combat.conditions ?? []
  const exhaustion = combat.exhaustion ?? 0

  const isBarbarian = (info.class === 'barbarian' || info.class === 'Barbarian')
  const rageActive = !!character.rageActive

  // Cor da barra de HP por % restante — gradient pra dar volume visual.
  // Quando cheio vira esmeralda vibrante; vai cedendo pra âmbar e vermelho.
  const hpColor = hpPct >= 100
      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
    : hpPct > 50
      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
    : hpPct > 25
      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
    : hpPct > 0
      ? 'bg-gradient-to-r from-red-500 to-red-600'
    : 'bg-ink-600'

  const hpLabel = currentHp <= 0
    ? '☠ inconsciente'
    : `${currentHp}/${maxHp}${tempHp > 0 ? ` (+${tempHp})` : ''}`

  return (
    <div
      className="border-t border-parchment-600/60 bg-parchment-200/60"
      aria-label="Barra de combate"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">

        {/* HP — bloco compacto (largura reduzida pra dar espaço aos chips) */}
        <div className="flex items-center gap-2 min-w-[180px] max-w-[280px] flex-1">
          <span aria-hidden className="text-base text-red-700">❤</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-display tracking-widest uppercase text-ink-300">PV</span>
              <span className="text-xs font-bold text-ink-500 tabular-nums">{hpLabel}</span>
            </div>
            <div className="h-2 mt-0.5 rounded-full bg-ink-700/30 overflow-hidden border border-parchment-600 shadow-inner">
              <div
                className={`h-full ${hpColor} transition-all duration-500 shadow-sm`}
                style={{ width: `${hpPct}%` }}
                aria-hidden
              />
            </div>
          </div>
          <HpQuickControls
            onDamage={amount => updaters.applyDamage?.(amount)}
            onHeal={amount => updaters.applyHealing?.(amount)}
          />
        </div>

        {/* Stats inline */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatChip
            icon="⛨"
            label="CA"
            value={ac}
            title="Classe de Armadura (clique pra editar)"
            editable
            onChange={v => updaters.updateCombat?.('armorClass', Math.max(0, parseInt(v, 10) || 0))}
          />
          <StatChip
            icon="⚡"
            label="INIT"
            value={init >= 0 ? `+${init}` : init}
            title="Iniciativa (mod DES + feats como Alerta)"
          />
          <StatChip icon="👣" label="VEL" value={speed} title="Velocidade (em pés)" />

          {/* Stats de conjuração — só pra casters (mago, clérigo, paladino N2+, etc) */}
          {isCaster && (
            <>
              <StatChip
                icon="🔮"
                label="ATK MG"
                value={spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus}
                title={`Bônus de ataque mágico (${spellAbilityAbbr}: prof + mod do atributo)`}
              />
              <StatChip
                icon="✦"
                label="CD"
                value={spellSaveDC}
                title={`CD de salva das suas magias (8 + prof + mod ${spellAbilityAbbr})`}
              />
              <StatChip
                icon="✎"
                label="ATR"
                value={spellAbilityAbbr}
                title="Atributo de conjuração"
              />
            </>
          )}
        </div>

        {/* Recurso de classe — barbaro */}
        {isBarbarian && (
          <button
            type="button"
            onClick={() => updaters.setRageActive?.(!rageActive)}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-sm border-2 text-xs font-display tracking-wide transition-colors',
              rageActive
                ? 'bg-red-700 border-red-800 text-parchment-50 shadow-[var(--shadow-parchment-sm)]'
                : 'bg-parchment-50 border-parchment-600 text-ink-500 hover:border-red-600',
            ].join(' ')}
            title={rageActive ? 'Fúria ativa — clique pra desativar' : 'Entrar em Fúria'}
          >
            <span aria-hidden>{rageActive ? '🔥' : '⚡'}</span>
            <span>{rageActive ? 'Em Fúria' : 'Fúria'}</span>
          </button>
        )}

        {/* Condições ativas (ou rótulo se vazio) */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {activeConditions.length === 0 && exhaustion === 0 ? (
            <span className="text-[10px] ink-italic text-ink-300">sem condições</span>
          ) : (
            <>
              {activeConditions.map(id => (
                <ConditionChip key={id} id={id} onToggle={updaters.toggleCondition} />
              ))}
              {exhaustion > 0 && (
                <span
                  title={`Nível ${exhaustion} de exaustão (PHB p.291)`}
                  className="px-2 py-0.5 rounded-sm bg-red-100 border border-red-600 text-red-800 text-xs font-semibold"
                >
                  💀 Exaustão {exhaustion}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
