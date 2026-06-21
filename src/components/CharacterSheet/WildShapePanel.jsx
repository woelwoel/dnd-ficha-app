import { useEffect, useMemo, useState } from 'react'
import { AttackRollButton } from './AttackRollButton'
import { useDiceRoller } from '../../hooks/useDiceRoller'

/**
 * Painel de Forma Selvagem (Druida, PHB p.66).
 *
 * Funcionalidades:
 *  - Catálogo de bestas SRD filtrado por CR/movimento permitido pelo nível
 *  - Suporte ao Círculo da Lua (CR ≤ nível ÷ 3; transformação como ação bônus)
 *  - Stat block ativo: AC, velocidades, sentidos, atributos, ataques (RollButton)
 *  - Tracker de HP da besta com overflow indo pro humanoide via onApplyDamage
 *  - Duração: ½ nível em horas (badge informativo)
 *  - Cura com slot (Círculo da Lua nv 6+): 1d8 por nível do slot
 */

// PHB p.66 — limites CR/movimento por nível para druidas SEM Círculo da Lua
function standardCRLimit(level) {
  if (level < 2)  return null
  if (level >= 8) return 1
  if (level >= 4) return 0.5
  return 0.25
}

// PHB p.69 — Círculo da Lua: CR = max(1, nível ÷ 3)
function moonCRLimit(level) {
  if (level < 2) return null
  return Math.max(1, Math.floor(level / 3))
}

// Movimento permitido por nível (PHB p.66)
function allowedMovement(level, isMoon) {
  if (isMoon) return { fly: true, swim: true } // Círculo da Lua remove a restrição
  return {
    fly:  level >= 8,
    swim: level >= 4,
  }
}

/** Carrega o catálogo de bestas sob demanda. */
function useBeasts() {
  const [data, setData] = useState(null)
  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/srd-data/wild-shape-beasts-pt.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setData(d.beasts ?? []))
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Falha ao carregar bestas:', err)
      })
    return () => ctrl.abort()
  }, [])
  return data
}

function formatSpeed(speedObj) {
  if (!speedObj) return '—'
  return Object.entries(speedObj)
    .map(([k, v]) => {
      const label = v.label ?? k
      return `${label} ${v.m ?? Math.round((v.ft ?? 0) * 0.3)}m`
    })
    .join(' · ')
}

function formatBonus(n) {
  return n >= 0 ? `+${n}` : `${n}`
}

/* ── Catálogo de bestas (modal/dropdown inline) ──────────────── */
function BeastPicker({ beasts, crLimit, allowFly, allowSwim, isMoon, knownSet, onSelect, onMarkSeen, onCancel }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!beasts) return []
    return beasts.filter(b => {
      if (b.cr > crLimit) return false
      if (!allowFly && b.speed?.fly)  return false
      if (!allowSwim && b.speed?.swim) return false
      if (query) {
        const q = query.toLowerCase()
        if (!b.name.toLowerCase().includes(q) && !b.nameEn.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [beasts, crLimit, allowFly, allowSwim, query])

  // Agrupa por CR
  const grouped = useMemo(() => {
    const map = new Map()
    for (const b of filtered) {
      if (!map.has(b.cr)) map.set(b.cr, [])
      map.get(b.cr).push(b)
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]) // CR alto primeiro
  }, [filtered])

  if (!beasts) {
    return <p className="text-xs italic text-ink-300 p-2">Carregando catálogo…</p>
  }

  return (
    <div className="mt-2 pt-2 border-t border-parchment-600 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar besta…"
          className="flex-1 bg-parchment-50 border border-parchment-600 rounded px-2 py-1 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
        />
        <button
          onClick={onCancel}
          className="text-xs px-2 py-1 rounded border border-parchment-600 bg-parchment-100 text-ink-300 hover:bg-parchment-200"
        >
          Cancelar
        </button>
      </div>
      <p className="text-xs ink-italic text-ink-300">
        Filtro: CR ≤ <strong>{filtered[0]?.crLabel ?? '—'}</strong>
        {!allowFly  && <> · sem voo</>}
        {!allowSwim && <> · sem natação</>}
        {isMoon && <> · <span className="text-emerald-700 font-bold">Círculo da Lua</span></>}
        · {filtered.length} disponível{filtered.length !== 1 ? 'is' : ''}
      </p>
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {grouped.length === 0 && (
          <p className="text-xs italic text-ink-300">Nenhuma besta corresponde ao filtro.</p>
        )}
        {grouped.map(([cr, list]) => (
          <div key={cr}>
            <p className="text-xs uppercase tracking-widest font-bold text-ink-300 mb-1">
              CR {list[0].crLabel} <span className="font-normal">({list.length})</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {list.map(b => {
                const known = knownSet.has(b.index)
                if (known) {
                  return (
                    <button
                      key={b.index}
                      onClick={() => onSelect(b)}
                      title={`${b.name} (${b.nameEn}) — HP ${b.hp} · AC ${b.ac} · ${formatSpeed(b.speed)}`}
                      className="text-left text-[13px] px-2 py-1.5 rounded border border-parchment-600 bg-parchment-50 hover:bg-emerald-50 hover:border-emerald-500 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink-500 truncate flex-1">{b.name}</span>
                        <span className="text-[13px] text-ink-300 font-mono shrink-0">HP{b.hp}</span>
                        <span className="text-[13px] text-ink-300 font-mono shrink-0">AC{b.ac}</span>
                      </div>
                      <div className="text-[13px] text-ink-300 italic truncate">{formatSpeed(b.speed)}</div>
                    </button>
                  )
                }
                return (
                  <div
                    key={b.index}
                    title={`${b.name} (${b.nameEn}) — ainda não vista`}
                    className="text-left text-[13px] px-2 py-1.5 rounded border border-dashed border-parchment-600 bg-parchment-100/50 opacity-70"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-ink-300 truncate flex-1"><span aria-hidden>🔒</span> {b.name}</span>
                      <button
                        onClick={() => onMarkSeen(b.index)}
                        aria-label={`já vi essa — ${b.name}`}
                        className="text-[11px] px-1.5 py-0.5 rounded border border-emerald-700 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 font-bold shrink-0"
                      >
                        já vi essa
                      </button>
                    </div>
                    <div className="text-[13px] text-ink-300 italic truncate">{formatSpeed(b.speed)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Stat block ativo + ataques ──────────────────────────────── */
function ActiveBeastStatBlock({ ws, druidaLevel }) {
  if (!ws.beastData) return null
  const b = ws.beastData
  // Lista de ataques com botões de rolagem
  return (
    <div className="mt-2 pt-2 border-t border-emerald-700/30 space-y-2">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-emerald-100 rounded px-2 py-1 border border-emerald-700/30">
          <div className="text-emerald-900/70 uppercase tracking-wider font-bold">AC</div>
          <div className="text-emerald-900 font-bold font-mono text-base">{b.ac}</div>
        </div>
        <div className="bg-emerald-100 rounded px-2 py-1 border border-emerald-700/30">
          <div className="text-emerald-900/70 uppercase tracking-wider font-bold">Tamanho</div>
          <div className="text-emerald-900 font-bold text-xs">{b.size}</div>
        </div>
        <div className="bg-emerald-100 rounded px-2 py-1 border border-emerald-700/30">
          <div className="text-emerald-900/70 uppercase tracking-wider font-bold">Duração</div>
          <div className="text-emerald-900 font-bold text-xs">{Math.max(1, Math.floor(druidaLevel / 2))}h</div>
        </div>
      </div>

      <div className="text-xs text-emerald-900 bg-emerald-50 rounded px-2 py-1 border border-emerald-700/30">
        <span className="font-bold">Velocidade:</span> {formatSpeed(b.speed)}
      </div>

      <div className="grid grid-cols-6 gap-1 text-xs text-center">
        {[
          ['FOR', b.str], ['DES', b.dex], ['CON', b.con],
          ['INT', b.int], ['SAB', b.wis], ['CAR', b.cha],
        ].map(([k, v]) => {
          const mod = Math.floor((v - 10) / 2)
          // INT/SAB/CAR ficam do druida; FOR/DES/CON viram da besta
          const fromBeast = ['FOR', 'DES', 'CON'].includes(k)
          return (
            <div key={k} className={`rounded px-1 py-1 border ${
              fromBeast
                ? 'bg-emerald-100 border-emerald-700/40'
                : 'bg-parchment-100 border-parchment-600/50 opacity-60'
            }`}>
              <div className="font-bold text-[13px] text-emerald-900/70">{k}</div>
              <div className="font-mono text-xs text-emerald-900 font-bold">{v}</div>
              <div className="font-mono text-[13px] text-emerald-900/80">{formatBonus(mod)}</div>
            </div>
          )
        })}
      </div>
      <p className="text-[13px] ink-italic text-emerald-900/70 text-center -mt-1">
        Você usa FOR/DES/CON da besta. INT/SAB/CAR continuam suas.
      </p>

      {b.attacks?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest font-bold text-emerald-900">Ataques</p>
          {b.attacks.map((atk, i) => {
            const atkRoll = `1d20${formatBonus(atk.attackBonus)}`
            const weaponName = `${ws.beastName} — ${atk.name}`
            return (
              <div key={i} className="flex items-center gap-2 bg-emerald-100/60 rounded px-2 py-1 border border-emerald-700/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-emerald-900 truncate">{atk.name}</p>
                  <p className="text-xs text-emerald-900/80 font-mono">
                    {atkRoll} · {atk.damageDice} <span className="italic">{atk.damageType}</span>
                  </p>
                  {atk.desc && (
                    <p className="text-xs text-emerald-900/70 italic leading-snug mt-0.5">
                      {atk.desc}
                    </p>
                  )}
                </div>
                <AttackRollButton
                  attackNotation={atkRoll}
                  damageNotation={atk.damageDice}
                  weaponName={weaponName}
                />
              </div>
            )
          })}
        </div>
      )}

      {b.traits?.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-emerald-900 font-bold uppercase tracking-widest">
            Traços ({b.traits.length})
          </summary>
          <div className="mt-1 space-y-1 pl-2">
            {b.traits.map((t, i) => (
              <div key={i}>
                <span className="font-bold text-emerald-900">{t.name}.</span>{' '}
                <span className="text-emerald-900/80 italic">{t.desc}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {(b.damageResistances?.length > 0 || b.damageImmunities?.length > 0) && (
        <div className="text-xs text-emerald-900/80">
          {b.damageResistances?.length > 0 && (
            <div><span className="font-bold">Resistências:</span> {b.damageResistances.join(', ')}</div>
          )}
          {b.damageImmunities?.length > 0 && (
            <div><span className="font-bold">Imunidades:</span> {b.damageImmunities.join(', ')}</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Cura com slot (Círculo da Lua nv 6+) ────────────────────── */
function MoonHealPanel({ slotsAvailable, onConsumeSlot, ws, onSetWildShape }) {
  const { roll, openPanel } = useDiceRoller()
  const availableLevels = Object.entries(slotsAvailable)
    .map(([sl, n]) => [Number(sl), n])
    .filter(([, n]) => n > 0)
    .sort((a, b) => a[0] - b[0])

  function castHeal(slotLevel) {
    // 1d8 por nível do slot — média aplicada direto na besta + roll visual
    const notation = `${slotLevel}d8`
    // Cálculo de cura: rola de fato seria ideal, mas pra UX rápida aplicamos média + abrimos painel pra ver
    const avgHeal = slotLevel * 4 // média 4.5 ~ 4
    onConsumeSlot(slotLevel)
    onSetWildShape({ ...ws, currentHp: Math.min(ws.maxHp, ws.currentHp + avgHeal) })
    roll(notation, `Cura Primal (slot Nv ${slotLevel})`)
    openPanel()
  }

  if (availableLevels.length === 0) {
    return (
      <p className="text-xs italic text-emerald-900/70 mt-1">
        Sem slots de magia para cura primal.
      </p>
    )
  }

  return (
    <div className="mt-2 pt-2 border-t border-emerald-700/30">
      <p className="text-xs uppercase tracking-widest font-bold text-emerald-900 mb-1">
        🌙 Cura Primal — gastar slot
      </p>
      <div className="flex flex-wrap gap-1">
        {availableLevels.map(([sl, n]) => (
          <button
            key={sl}
            onClick={() => castHeal(sl)}
            title={`Gasta 1 slot Nv ${sl} (${n} disponíveis) → cura ${sl}d8 PV à besta`}
            className="text-xs px-2 py-1 rounded border border-emerald-700 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 font-bold transition-colors"
          >
            Nv {sl} <span className="text-emerald-700">×{n}</span> · +{sl}d8
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Componente principal ────────────────────────────────────── */
export function WildShapePanel({
  druidaLevel,
  wsUse,
  usesRemaining,
  onSpend,
  character,
  onSetWildShape,
  onApplyDamage,
  slotsAvailable = {},
  onConsumeSlot,
  onToggleKnownBeast,
}) {
  const beasts = useBeasts()
  const [showPicker, setShowPicker] = useState(false)
  const [damageInput, setDamageInput] = useState('')

  // Estado da Forma Selvagem
  const ws = character.combat?.wildShape && typeof character.combat.wildShape === 'object'
    ? character.combat.wildShape
    : { active: false, beastName: '', currentHp: 0, maxHp: 0 }

  // Detecta Círculo da Lua via chosenFeatures
  const druidCircle = character.info?.chosenFeatures?.druid_circle
  const isMoon = druidCircle === 'lua'
  const crLimit = isMoon ? moonCRLimit(druidaLevel) : standardCRLimit(druidaLevel)
  const movement = allowedMovement(druidaLevel, isMoon)
  const moonHeal = isMoon && druidaLevel >= 6
  const knownSet = useMemo(
    () => new Set(character.combat?.knownBeasts ?? []),
    [character.combat?.knownBeasts]
  )

  if (druidaLevel < 2) return null

  function selectBeast(beast) {
    if (!knownSet.has(beast.index)) return
    onSetWildShape({
      active:    true,
      beastIndex: beast.index,
      beastName: beast.name,
      currentHp: beast.hp,
      maxHp:     beast.hp,
      beastData: beast,
      activatedAt: Date.now(),
    })
    if (wsUse) onSpend?.(wsUse.id)
    setShowPicker(false)
  }

  function revert() {
    onSetWildShape(null)
  }

  function adjustBeastHp(delta) {
    const next = Math.max(0, Math.min(ws.maxHp, ws.currentHp + delta))
    onSetWildShape({ ...ws, currentHp: next })
  }

  function applyBeastDamage() {
    const n = parseInt(damageInput, 10) || 0
    if (n <= 0) return
    const remaining = Math.max(0, ws.currentHp - n)
    const overflow = Math.max(0, n - ws.currentHp)
    if (remaining === 0 && overflow > 0 && onApplyDamage) {
      // Besta desfeita — overflow vai pro humanoide
      onApplyDamage(overflow)
      onSetWildShape(null)
    } else if (remaining === 0) {
      // Besta desfeita sem overflow
      onSetWildShape(null)
    } else {
      onSetWildShape({ ...ws, currentHp: remaining })
    }
    setDamageInput('')
  }

  const noUses = usesRemaining != null && usesRemaining <= 0 && druidaLevel < 20
  const actionLabel = isMoon ? 'ação bônus' : 'ação'

  return (
    <div className={`rounded-lg border-2 p-3 transition-colors ${
      ws.active ? 'border-emerald-700 bg-emerald-50' : 'border-parchment-600 bg-parchment-50'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl shrink-0" aria-hidden>{ws.active ? '🐺' : '🌿'}</span>
        <div className="min-w-0 flex-1">
          {/* Título + badge em FLEX, não inline — antes o chip "Círculo
              da Lua" quebrava no meio (📷 print do usuário). Flex-wrap
              permite o chip cair na linha de baixo INTEIRO. */}
          <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-display tracking-wide ${ws.active ? 'text-emerald-800' : 'text-ink-500'}`}>
            <span>{ws.active ? `EM FORMA SELVAGEM — ${ws.beastName}` : 'Forma Selvagem'}</span>
            {isMoon && !ws.active && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-emerald-700 bg-emerald-100 text-emerald-800 font-bold normal-case tracking-normal whitespace-nowrap">
                🌙 Círculo da Lua
              </span>
            )}
          </div>
          <p className="text-[13px] ink-italic">
            {ws.active
              ? `Não conjura magias${isMoon ? ' (exceto Círculo da Lua nv 18)' : ''}. Mantém concentração. Reverter como ação bônus.`
              : `CR ≤ ${crLimit === 0.5 ? '1/2' : crLimit === 0.25 ? '1/4' : crLimit}${!movement.fly ? ' · sem voo' : ''}${!movement.swim ? ' · sem natação' : ''}. Duração: ${Math.max(1, Math.floor(druidaLevel / 2))}h. ${usesRemaining ?? '—'}/${wsUse?.max ?? '—'} usos. Transformar como ${actionLabel}.`}
          </p>
        </div>
        {!ws.active && (
          <button
            onClick={() => setShowPicker(v => !v)}
            disabled={noUses}
            className={`shrink-0 text-xs px-3 py-1.5 rounded border-2 font-display tracking-wide transition-all ${
              noUses
                ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                : 'border-ink-300 bg-parchment-100 text-ink-500 hover:bg-parchment-200'
            }`}
          >
            {showPicker ? 'Cancelar' : 'Transformar'}
          </button>
        )}
        {ws.active && (
          <button
            onClick={revert}
            title="Reverter à forma humanoide (ação bônus)"
            className="shrink-0 text-xs px-3 py-1.5 rounded border-2 border-emerald-700 bg-emerald-700 text-white font-display tracking-wide hover:bg-emerald-800 transition-all"
          >
            Reverter
          </button>
        )}
      </div>

      {/* Picker de bestas */}
      {!ws.active && showPicker && (
        <BeastPicker
          beasts={beasts}
          crLimit={crLimit}
          allowFly={movement.fly}
          allowSwim={movement.swim}
          isMoon={isMoon}
          knownSet={knownSet}
          onSelect={selectBeast}
          onMarkSeen={onToggleKnownBeast}
          onCancel={() => setShowPicker(false)}
        />
      )}

      {/* Estado ativo: HP tracker + dano + stat block */}
      {ws.active && (
        <>
          <div className="mt-2 pt-2 border-t border-emerald-700/30 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-emerald-800 font-bold uppercase tracking-wide shrink-0">HP da Besta:</span>
            <button
              onClick={() => adjustBeastHp(-1)}
              className="w-7 h-7 rounded bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-bold"
            >−</button>
            <span className="font-mono text-sm text-emerald-900 min-w-[5ch] text-center font-bold">
              {ws.currentHp}/{ws.maxHp}
            </span>
            <button
              onClick={() => adjustBeastHp(+1)}
              className="w-7 h-7 rounded bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-bold"
            >+</button>

            <span className="text-xs text-emerald-800 font-bold uppercase tracking-wide shrink-0 ml-2">Dano:</span>
            <input
              type="number"
              value={damageInput}
              onChange={e => setDamageInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyBeastDamage()}
              placeholder="N"
              className="w-14 bg-parchment-50 border border-parchment-600 rounded px-2 py-0.5 text-[13px] text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={applyBeastDamage}
              disabled={!damageInput || (parseInt(damageInput, 10) || 0) <= 0}
              className="text-xs px-2 py-1 rounded border border-emerald-700 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 disabled:border-parchment-600 disabled:bg-parchment-100 disabled:text-ink-200 disabled:cursor-not-allowed font-bold transition-colors"
              title="Aplica dano à besta. Excedente passa pro humanoide e desfaz a forma."
            >
              Aplicar
            </button>
          </div>

          {ws.currentHp === 0 && (
            <p className="mt-1 text-xs text-rose-700 font-bold italic">
              ⚠ Forma desfeita ao chegar a 0 PV.
            </p>
          )}

          {/* Stat block da besta */}
          <ActiveBeastStatBlock ws={ws} druidaLevel={druidaLevel} />

          {/* Cura primal — Círculo da Lua nv 6+ */}
          {moonHeal && (
            <MoonHealPanel
              slotsAvailable={slotsAvailable}
              onConsumeSlot={onConsumeSlot}
              ws={ws}
              onSetWildShape={onSetWildShape}
            />
          )}
        </>
      )}
    </div>
  )
}
