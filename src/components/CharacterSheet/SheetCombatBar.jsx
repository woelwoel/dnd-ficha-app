import { useState, useRef } from 'react'
import { useCharacterContext } from './CharacterContext'

/* ── Condições D&D 5e (PHB p.290–296) ─────────────────────────
 * Mantém o mesmo conjunto que CombatStats — duplicação intencional
 * pra a barra ser autocontida. Quando a tooltip de regras virar
 * um dataset compartilhado (PR seguinte), centraliza num arquivo só.
 */
const CONDITIONS = {
  blinded:       { label: 'Cego',          icon: '👁️‍🗨️', rule: 'Não enxerga: falha em testes que dependem da visão. Ataques contra você têm vantagem; seus ataques têm desvantagem. (PHB p.290)' },
  charmed:       { label: 'Enfeitiçado',   icon: '💜',    rule: 'Não pode atacar quem o enfeitiçou nem mirar nele com habilidades danosas. O encantador tem vantagem em testes sociais. (PHB p.290)' },
  deafened:      { label: 'Surdo',          icon: '🔇',    rule: 'Não escuta: falha em testes que dependem da audição. (PHB p.290)' },
  frightened:    { label: 'Amedrontado',   icon: '😱',    rule: 'Desvantagem em testes/ataques enquanto a fonte do medo estiver à vista. Não pode se aproximar dela voluntariamente. (PHB p.290)' },
  grappled:      { label: 'Agarrado',       icon: '🤜',    rule: 'Velocidade = 0; bônus de velocidade não se aplicam. Termina se o agarrador for incapacitado ou afastado. (PHB p.290)' },
  incapacitated: { label: 'Incapacitado',  icon: '💢',    rule: 'Não pode tomar ações nem reações. (PHB p.290)' },
  invisible:     { label: 'Invisível',     icon: '👻',    rule: 'Não pode ser visto sem magia ou sentido especial. Ataques contra você têm desvantagem; seus ataques têm vantagem. (PHB p.291)' },
  paralyzed:     { label: 'Paralisado',    icon: '⚡',    rule: 'Incapacitado, não fala, falha autom. em salvas de FOR e DES. Ataques têm vantagem; acertos a até 1,5 m são críticos. (PHB p.291)' },
  petrified:     { label: 'Petrificado',   icon: '🪨',    rule: 'Transformado em pedra. Incapacitado, falha em salvas de FOR/DES, resistência a todo dano, imune a veneno e doença. (PHB p.291)' },
  poisoned:      { label: 'Envenenado',    icon: '🟢',    rule: 'Desvantagem em ataques e testes de habilidade. (PHB p.292)' },
  prone:         { label: 'Prostrado',     icon: '⬇️',    rule: 'Move-se só se rastejando. Desvantagem em ataques. Ataques contra você têm vantagem a 1,5 m, desvantagem à distância. (PHB p.292)' },
  restrained:    { label: 'Imobilizado',   icon: '🔗',    rule: 'Velocidade = 0. Ataques contra você têm vantagem; seus ataques e salvas de DES têm desvantagem. (PHB p.292)' },
  stunned:       { label: 'Atordoado',     icon: '💫',    rule: 'Incapacitado, não se move, fala balbuciante. Falha em salvas de FOR/DES; ataques contra você têm vantagem. (PHB p.292)' },
  unconscious:   { label: 'Inconsciente',  icon: '💤',    rule: 'Incapacitado, cai prostrado, larga o que segura. Falha em salvas de FOR/DES; ataques têm vantagem; acertos a 1,5 m são críticos. (PHB p.292)' },
}

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

/* Chip de stat numérico (CA / INIT / VEL) ──────────────────── */
function StatChip({ icon, label, value, title }) {
  return (
    <div
      title={title}
      className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-parchment-50/80 border border-parchment-600 text-ink-500"
    >
      <span aria-hidden className="text-sm leading-none">{icon}</span>
      <span className="text-[9px] font-display tracking-widest uppercase text-ink-300 leading-none">{label}</span>
      <span className="text-sm font-bold leading-none">{value}</span>
    </div>
  )
}

/* Chip de condição ativa (clicável remove + tooltip de regra) ─ */
function ConditionChip({ id, onToggle }) {
  const c = CONDITIONS[id]
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
  const init = combat.initiative ?? 0
  const speed = combat.speed ?? 30

  const activeConditions = combat.conditions ?? []
  const exhaustion = combat.exhaustion ?? 0

  const isBarbarian = (info.class === 'barbarian' || info.class === 'Barbarian')
  const rageActive = !!character.rageActive

  // Cor da barra de HP por % restante
  const hpColor = hpPct > 50 ? 'bg-green-600'
    : hpPct > 25 ? 'bg-amber-500'
    : hpPct > 0 ? 'bg-red-600'
    : 'bg-ink-600'

  const hpLabel = currentHp <= 0
    ? '☠ inconsciente'
    : `${currentHp}/${maxHp}${tempHp > 0 ? ` (+${tempHp})` : ''}`

  return (
    <div
      className="border-b border-parchment-600 bg-parchment-200/90 backdrop-blur-sm"
      aria-label="Barra de combate"
    >
      <div className="max-w-6xl mx-auto px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">

        {/* HP — bloco principal */}
        <div className="flex items-center gap-2 min-w-[260px] flex-1">
          <span aria-hidden className="text-base text-red-700">❤</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-display tracking-widest uppercase text-ink-300">PV</span>
              <span className="text-xs font-bold text-ink-500 tabular-nums">{hpLabel}</span>
            </div>
            <div className="h-2 mt-0.5 rounded-full bg-parchment-400 overflow-hidden border border-parchment-600">
              <div
                className={`h-full ${hpColor} transition-all duration-300`}
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
          <StatChip icon="⛨" label="CA" value={ac} title="Classe de Armadura" />
          <StatChip
            icon="⚡"
            label="INIT"
            value={init >= 0 ? `+${init}` : init}
            title="Iniciativa"
          />
          <StatChip icon="👣" label="VEL" value={speed} title="Velocidade (em pés)" />
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
