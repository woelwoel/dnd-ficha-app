import { useState, useRef } from 'react'
import { useCharacterContext } from './CharacterContext'
import { CONDITIONS_BY_ID } from '../../domain/conditions'
import { Icon } from '../ui/Icon'

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
      <span className="text-xs font-display tracking-widest uppercase text-ink-300 leading-none">{label}</span>
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

/* Tracker de Economia de Ação (PHB p.189-193) ─────────────────
 * Quatro chips toggle: Ação · Bônus · Reação · Movimento (pés gastos).
 * Cada chip clicado marca/desmarca o uso. Movimento mostra "X/30 ft"
 * (gasto/máximo) e abre input ao clicar pra ajustar.
 * Botão "↻" reseta tudo (geralmente clicado no início de cada turno).
 * Reset automático: descanso curto/longo também limpa o estado.
 */
function ActionEconomy({ turnState, speed, onToggle, onResetTurn, onSetMovement }) {
  const t = turnState ?? {}
  const moveTotal = Math.max(0, speed ?? 9)
  const moveUsed  = Math.max(0, t.movementUsed ?? 0)
  const moveLeft  = Math.max(0, moveTotal - moveUsed)
  const moveExceeded = moveUsed > moveTotal

  const chips = [
    { key: 'actionUsed',   label: 'Ação',   short: 'A' },
    { key: 'bonusUsed',    label: 'Bônus',  short: 'B' },
    { key: 'reactionUsed', label: 'Reação', short: 'R' },
  ]

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {chips.map(c => {
        const used = !!t[c.key]
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onToggle?.(c.key)}
            title={used
              ? `${c.label} já gasta neste turno — clique pra desmarcar`
              : `Marcar ${c.label} como gasta`}
            aria-pressed={used}
            className={[
              // Mais compacto: padding-x reduzido pra caber mais coisa
              // numa linha; em ≥md o label completo volta a aparecer
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-display tracking-widest uppercase border transition-colors',
              used
                ? 'bg-ink-500 border-ink-600 text-parchment-50 line-through'
                : 'bg-parchment-50 border-parchment-600 text-ink-500 hover:border-ink-300',
            ].join(' ')}
          >
            <span aria-hidden className="font-bold not-italic">{c.short}</span>
            <span className="hidden md:inline">{c.label}</span>
          </button>
        )
      })}

      {/* Movimento: input + label "X/Y ft" */}
      <div
        title={`Movimento gasto neste turno: ${moveUsed} de ${moveTotal} metros`}
        className={[
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-xs shrink-0',
          moveExceeded
            ? 'bg-red-100 border-red-600 text-red-800'
            : moveUsed === 0
              ? 'bg-parchment-50 border-parchment-600 text-ink-500'
              : 'bg-amber-100 border-amber-600 text-ink-500',
        ].join(' ')}
      >
        <span className="font-display tracking-widest uppercase text-ink-300 leading-none">Mov</span>
        <input
          type="number"
          min={0}
          value={moveUsed}
          onChange={e => onSetMovement?.(e.target.value)}
          onWheel={e => e.currentTarget.blur()}
          aria-label="Metros de movimento gastos no turno"
          className="w-8 text-center bg-transparent text-xs font-bold leading-none focus:outline-none focus:bg-parchment-50 rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="font-mono leading-none text-[11px]">/{moveTotal}</span>
      </div>

      <button
        type="button"
        onClick={onResetTurn}
        title="Iniciar novo turno — reseta Ação, Bônus, Reação e Movimento"
        aria-label="Resetar turno"
        className="inline-flex items-center justify-center w-6 h-6 rounded-sm border border-parchment-600 text-ink-300 hover:text-ink-500 hover:border-ink-300 hover:bg-parchment-200 transition-colors text-xs leading-none shrink-0"
      >
        ↻
      </button>
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
  const speed = combat.speed ?? 9

  // Stats de conjuração — só aparecem se o personagem é caster (tem ability key).
  const spellAbilityKey = calc?.spellAbilityKey ?? null
  const spellSaveDC = calc?.spellSaveDC ?? null
  const spellAttackBonus = calc?.spellAttackBonus ?? null
  const isCaster = !!spellAbilityKey && spellSaveDC != null
  const SPELL_ABILITY_ABBR = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' }
  const spellAbilityAbbr = spellAbilityKey ? (SPELL_ABILITY_ABBR[spellAbilityKey] ?? spellAbilityKey.toUpperCase()) : null

  const activeConditions = combat.conditions ?? []
  const exhaustion = combat.exhaustion ?? 0
  const turnState = combat.turnState ?? {}
  const concentrating = combat.concentrating ?? null
  const isConcentrating = !!concentrating?.spellIndex

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
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-2">

        {/* HP — bloco compacto. flex-shrink-0 garante que ele NÃO encolha
            (PV é o número mais importante em combate, nunca espreme). */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[240px] sm:max-w-[280px] flex-shrink-0">
          <span aria-hidden className="text-red-700">
            <Icon name="heart" size={18} strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-display tracking-widest uppercase text-ink-300">PV</span>
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
            icon={<Icon name="shield" size={14} strokeWidth={1.75} />}
            label="CA"
            value={ac}
            title="Classe de Armadura (clique pra editar)"
            editable
            onChange={v => updaters.updateCombat?.('armorClass', Math.max(0, parseInt(v, 10) || 0))}
          />
          <StatChip
            icon={<Icon name="bolt" size={14} strokeWidth={1.75} />}
            label="INIT"
            value={init >= 0 ? `+${init}` : init}
            title="Iniciativa (mod DES + feats como Alerta)"
          />
          <StatChip
            icon={<Icon name="move" size={14} strokeWidth={1.75} />}
            label="VEL"
            value={`${String(speed).replace('.', ',')}m`}
            title="Velocidade (em metros)"
          />

          {/* Stats de conjuração — só pra casters (mago, clérigo, paladino N2+, etc) */}
          {isCaster && (
            <>
              <StatChip
                icon={<Icon name="magic" size={14} strokeWidth={1.75} />}
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
                icon={<Icon name="sparkle" size={14} strokeWidth={1.75} />}
                label="ATR"
                value={spellAbilityAbbr}
                title="Atributo de conjuração"
              />
            </>
          )}
        </div>

        {/* Economia de ação (A / B / R / Mov + reset de turno) */}
        <ActionEconomy
          turnState={turnState}
          speed={speed}
          onToggle={key => updaters.toggleTurnFlag?.(key)}
          onSetMovement={feet => updaters.setMovementUsed?.(feet)}
          onResetTurn={() => updaters.resetTurn?.()}
        />

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
            <Icon name={rageActive ? 'fire' : 'bolt'} size={14} strokeWidth={1.75} />
            <span>{rageActive ? 'Em Fúria' : 'Fúria'}</span>
          </button>
        )}

        {/* Concentração ativa — chip persistente quando há magia em conc.
            PHB p.203: sofrer dano força CON save; só uma concentração por vez.
            Click no × rompe (não pede confirmação porque é toggle natural). */}
        {isConcentrating && (
          <button
            type="button"
            onClick={() => updaters.setConcentration?.(null)}
            title={`Concentrando em "${concentrating.spellName}" — clique pra romper`}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-blue-100 border border-blue-600 text-blue-800 text-xs font-semibold hover:bg-blue-200 transition-colors"
          >
            <Icon name="target" size={12} strokeWidth={2} />
            <span className="font-display tracking-wide normal-case">
              Concentrando: <span className="font-bold not-italic">{concentrating.spellName}</span>
            </span>
            <span aria-hidden className="text-blue-600 ml-0.5">×</span>
          </button>
        )}

        {/* Condições ativas (ou rótulo se vazio) */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {activeConditions.length === 0 && exhaustion === 0 ? (
            <span className="text-xs ink-italic text-ink-300">sem condições</span>
          ) : (
            <>
              {activeConditions.map(id => (
                <ConditionChip key={id} id={id} onToggle={updaters.toggleCondition} />
              ))}
              {exhaustion > 0 && (
                <span
                  title={`Nível ${exhaustion} de exaustão (PHB p.291)`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-red-100 border border-red-600 text-red-800 text-xs font-semibold"
                >
                  <Icon name="skull" size={12} strokeWidth={2} />
                  Exaustão {exhaustion}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
