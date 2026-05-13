import { useState } from 'react'
import { RollButton } from '../DiceRoller/RollButton'
import { getModifier, formatModifier } from '../../utils/calculations'
import { getSpellSlots } from '../../utils/spellcasting'
import { useDiceRoller } from '../../context/useDiceRoller'

/* ── Helpers ───────────────────────────────────────────────────── */

/**
 * Retorna o nível do personagem na classe dada, somando primária + multi.
 * 0 se não tem a classe.
 */
function levelInClass(character, classIndex) {
  const info = character.info ?? {}
  let total = 0
  if (info.class === classIndex) total += info.level ?? 0
  for (const mc of info.multiclasses ?? []) {
    if (mc.class === classIndex) total += mc.level ?? 0
  }
  return total
}

/** Dados de Ataque Furtivo do Ladino por nível (PHB p.96): ⌈lvl/2⌉ d6. */
function sneakAttackDice(rogueLevel) {
  if (rogueLevel < 1) return 0
  return Math.ceil(rogueLevel / 2)
}

/** Bônus de dano de Fúria do Bárbaro (PHB p.48): +2 (1-8), +3 (9-15), +4 (16+). */
function rageDamageBonus(barbLevel) {
  if (barbLevel < 1) return 0
  if (barbLevel >= 16) return 4
  if (barbLevel >= 9)  return 3
  return 2
}

/* ── Painel de Ataque Furtivo (Ladino) ─────────────────────────── */

function SneakAttackPanel({ rogueLevel }) {
  const dice = sneakAttackDice(rogueLevel)
  if (dice <= 0) return null
  const notation = `${dice}d6`
  return (
    <div className="bg-ink-700/10 border border-ink-300 rounded-lg p-3 flex items-center gap-3">
      <span className="text-xl shrink-0" aria-hidden>🗡️</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-display text-ink-500 tracking-wide">Ataque Furtivo</p>
        <p className="text-[11px] ink-italic">
          1×/turno. Condição: vantagem no ataque OU aliado adjacente ao alvo (e você sem desvantagem). Requer arma de acuidade ou à distância.
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-base font-bold text-ink-500 font-mono">{notation}</span>
        <RollButton notation={notation} label="Ataque Furtivo" />
      </div>
    </div>
  )
}

/**
 * Dados de Golpe Divino do Paladino (PHB p.86): 2d8 ao usar espaço de 1°,
 * +1d8 por nível adicional, até 5d8 (espaço de 4° ou superior). +1d8 extra
 * vs mortos-vivos/celestiais demoníacos — UI deixa o jogador adicionar
 * manualmente (não há flag de tipo do alvo).
 */
function smiteDice(slotLevel) {
  return Math.min(5, slotLevel + 1)
}

/* ── Painel de Golpe Divino (Paladino) ─────────────────────────── */

function SmitePanel({ paladinoLevel, slotsAvailable, onConsumeSlot }) {
  const { roll, openPanel } = useDiceRoller()
  const [open, setOpen] = useState(false)
  const slotLevels = Object.keys(slotsAvailable).map(Number).sort((a, b) => a - b)
  const hasAnySlot = slotLevels.some(sl => slotsAvailable[sl] > 0)

  function applySmite(slotLevel, undead = false) {
    const dice = smiteDice(slotLevel) + (undead ? 1 : 0)
    const notation = `${dice}d8`
    roll(notation, `Golpe Divino — espaço de Nv ${slotLevel}${undead ? ' (morto-vivo/fora)' : ''}`)
    onConsumeSlot?.(slotLevel)
    openPanel()
    setOpen(false)
  }

  if (paladinoLevel < 2) return null

  return (
    <div className="bg-ink-700/10 border border-ink-300 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <span className="text-xl shrink-0" aria-hidden>✨</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-display text-ink-500 tracking-wide">Golpe Divino</p>
          <p className="text-[11px] ink-italic">
            Ao acertar um ataque c/c, gaste um espaço para causar dano radiante extra (2d8 a 5d8 + 1d8 vs morto-vivo/fora).
          </p>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          disabled={!hasAnySlot}
          className={`shrink-0 text-xs px-3 py-1.5 rounded border-2 font-display tracking-wide transition-all ${
            hasAnySlot
              ? 'border-ink-300 bg-parchment-100 text-ink-500 hover:bg-parchment-200'
              : 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
          }`}
        >
          {hasAnySlot ? (open ? 'Cancelar' : 'Aplicar') : 'Sem espaços'}
        </button>
      </div>

      {open && hasAnySlot && (
        <div className="mt-2 pt-2 border-t border-ink-300/40 space-y-1.5">
          <p className="text-[10px] text-ink-500 uppercase tracking-widest font-bold">Escolher espaço:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {slotLevels.filter(sl => slotsAvailable[sl] > 0).map(sl => (
              <div key={sl} className="border border-parchment-600 rounded bg-parchment-50 px-2 py-1.5">
                <div className="text-[10px] text-ink-500 font-bold">
                  Nv {sl} ({slotsAvailable[sl]}) → {smiteDice(sl)}d8
                </div>
                <div className="flex gap-1 mt-0.5">
                  <button
                    onClick={() => applySmite(sl, false)}
                    className="flex-1 text-[10px] px-1 py-0.5 rounded bg-amber-700 hover:bg-amber-800 text-white font-bold transition-colors"
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => applySmite(sl, true)}
                    title="+1d8 contra morto-vivo ou celestial demoníaco"
                    className="flex-1 text-[10px] px-1 py-0.5 rounded bg-rose-700 hover:bg-rose-800 text-white font-bold transition-colors"
                  >
                    +1d8
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!hasAnySlot && (
        <p className="mt-1 text-[10px] text-ink-200 italic">Recupere espaços com descanso longo para usar Golpe Divino.</p>
      )}
    </div>
  )
}

/**
 * Dado de Inspiração de Bardo por nível (PHB p.53):
 *  1-4 = d6, 5-9 = d8, 10-14 = d10, 15+ = d12.
 */
function bardicInspirationDie(bardLevel) {
  if (bardLevel < 1)  return null
  if (bardLevel >= 15) return 12
  if (bardLevel >= 10) return 10
  if (bardLevel >= 5)  return 8
  return 6
}

/* ── Painel de Inspiração de Bardo ─────────────────────────────── */

function BardicInspirationPanel({ bardLevel, usesRemaining, onSpend }) {
  const { roll, openPanel } = useDiceRoller()
  const [recipient, setRecipient] = useState('')
  const dieSize = bardicInspirationDie(bardLevel)
  const notation = `1d${dieSize}`

  function inspire() {
    const label = recipient.trim()
      ? `Inspiração de Bardo → ${recipient.trim()}`
      : 'Inspiração de Bardo'
    roll(notation, label)
    onSpend?.()
    openPanel()
    setRecipient('')
  }

  return (
    <div className="bg-ink-700/10 border border-ink-300 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <span className="text-xl shrink-0" aria-hidden>🎵</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-display text-ink-500 tracking-wide">
            Inspiração de Bardo <span className="text-ink-200 font-mono">({notation})</span>
          </p>
          <p className="text-[11px] ink-italic">
            Aliado a 18m soma o dado a um teste/save/ataque (ação bônus do bardo, dura 10 min).
          </p>
        </div>
        <button
          onClick={inspire}
          disabled={usesRemaining != null && usesRemaining <= 0}
          className={`shrink-0 text-xs px-3 py-1.5 rounded border-2 font-display tracking-wide transition-all ${
            usesRemaining != null && usesRemaining <= 0
              ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
              : 'border-ink-300 bg-parchment-100 text-ink-500 hover:bg-parchment-200'
          }`}
        >
          Conceder
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          placeholder="Nome do aliado (opcional)"
          className="flex-1 bg-parchment-50 border border-parchment-600 rounded px-2 py-1 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
        />
        <span className="text-[10px] ink-italic">
          Restantes: <strong className="text-ink-500">{usesRemaining ?? '—'}</strong>
        </span>
      </div>
    </div>
  )
}

/* ── Metamagias (PHB p.102) ─────────────────────────────────────── */
const METAMAGIC_OPTIONS = [
  { id: 'cuidadosa',  name: 'Cuidadosa',  cost: 1, desc: 'Aliados ignoram a magia (CHA mod alvos).' },
  { id: 'distante',   name: 'Distante',   cost: 1, desc: 'Dobra alcance (ou 9m se for toque).' },
  { id: 'empoderada', name: 'Empoderada', cost: 1, desc: 'Rerola até CHA mod dados de dano.' },
  { id: 'estendida',  name: 'Estendida',  cost: 1, desc: 'Dobra duração (até 24h máx).' },
  { id: 'sutil',      name: 'Sutil',      cost: 1, desc: 'Sem componente Verbal ou Somático.' },
  { id: 'geminada',   name: 'Geminada',   cost: null, desc: 'Custa = nível da magia (mín 1). Atinge 1 alvo extra.' },
  { id: 'pungente',   name: 'Pungente',   cost: 2, desc: 'Alvo do save tem desvantagem na 1ª resistência.' },
  { id: 'acelerada',  name: 'Acelerada',  cost: 2, desc: 'Conjura como ação bônus (não como ação).' },
]

/* Tabela de conversão flexível (PHB p.101): pontos → slot */
const FLEX_CASTING = [
  { cost: 2, slot: 1 },
  { cost: 3, slot: 2 },
  { cost: 5, slot: 3 },
  { cost: 6, slot: 4 },
  { cost: 7, slot: 5 },
]

/* ── Painel de Metamagia + Conversão Flexível (Feiticeiro) ─────── */

function SorceryPanel({ feiticeiroLevel, sorceryUse, onSpendPoints, onRegainPoints, slotsAvailable, slotsMax, usedSlots, onConsumeSlot, onReturnSlot }) {
  const [tab, setTab] = useState('meta') // 'meta' | 'flex'
  const remaining = sorceryUse ? sorceryUse.max - (sorceryUse.used ?? 0) : 0

  function spend(n) {
    if (!sorceryUse || remaining < n) return
    // spendFeatureUse aceita só 1 por chamada; loop
    for (let i = 0; i < n; i++) onSpendPoints(sorceryUse.id)
  }

  function regain(n) {
    if (!sorceryUse) return
    for (let i = 0; i < n; i++) onRegainPoints(sorceryUse.id)
  }

  function applyMetamagic(opt) {
    if (opt.cost == null) return // Geminada: depende do nível da magia, manual
    spend(opt.cost)
  }

  function convertPointsToSlot(cost, slotLvl) {
    if (remaining < cost) return
    // verifica se o slot pode ser "devolvido" (used > 0)
    const used = usedSlots[slotLvl] ?? 0
    if (used <= 0) return
    spend(cost)
    onReturnSlot?.(slotLvl)
  }

  function convertSlotToPoints(slotLvl) {
    if ((slotsAvailable[slotLvl] ?? 0) <= 0) return
    if (remaining + slotLvl > (sorceryUse?.max ?? 0)) return
    onConsumeSlot?.(slotLvl)
    regain(slotLvl)
  }

  if (feiticeiroLevel < 2) return null

  return (
    <div className="bg-ink-700/10 border border-ink-300 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <span className="text-xl shrink-0" aria-hidden>🌀</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-display text-ink-500 tracking-wide">
            Feitiçaria · Pontos: <span className="font-mono">{remaining}/{sorceryUse?.max ?? 0}</span>
          </p>
          <p className="text-[11px] ink-italic">Metamagia (lvl 3+) e Conversão Flexível (lvl 2+).</p>
        </div>
      </div>

      <div className="mt-2 flex gap-1">
        <button
          onClick={() => setTab('meta')}
          className={`flex-1 text-[11px] py-1 rounded border-2 font-display tracking-wide transition-all ${
            tab === 'meta'
              ? 'border-ink-500 bg-parchment-200 text-ink-500'
              : 'border-parchment-600 bg-parchment-50 text-ink-200 hover:text-ink-500'
          }`}
        >
          Metamagia
        </button>
        <button
          onClick={() => setTab('flex')}
          className={`flex-1 text-[11px] py-1 rounded border-2 font-display tracking-wide transition-all ${
            tab === 'flex'
              ? 'border-ink-500 bg-parchment-200 text-ink-500'
              : 'border-parchment-600 bg-parchment-50 text-ink-200 hover:text-ink-500'
          }`}
        >
          Conversão Flexível
        </button>
      </div>

      {tab === 'meta' && (
        <div className="mt-2 space-y-1">
          {feiticeiroLevel < 3 && (
            <p className="text-[10px] ink-italic">Metamagia disponível a partir do nível 3.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {METAMAGIC_OPTIONS.map(opt => {
              const cost = opt.cost ?? 1
              const disabled = feiticeiroLevel < 3 || remaining < cost
              return (
                <button
                  key={opt.id}
                  onClick={() => applyMetamagic(opt)}
                  disabled={disabled}
                  title={opt.desc}
                  className={`text-left text-[10px] px-2 py-1 rounded border transition-colors ${
                    disabled
                      ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                      : 'border-ink-300 bg-parchment-50 text-ink-500 hover:bg-parchment-200'
                  }`}
                >
                  <span className="font-bold">{opt.name}</span>
                  <span className="ml-1 font-mono text-[9px]">({opt.cost == null ? '=nv' : `${opt.cost}pt`})</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'flex' && (
        <div className="mt-2 space-y-2">
          <div>
            <p className="text-[10px] text-ink-500 uppercase tracking-widest font-bold mb-1">
              Gastar pontos → criar espaço de magia
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
              {FLEX_CASTING.map(({ cost, slot }) => {
                const slotMax = slotsMax[slot] ?? 0
                const slotUsed = usedSlots[slot] ?? 0
                const canRecover = slotUsed > 0 && slotMax > 0
                const disabled = remaining < cost || !canRecover
                return (
                  <button
                    key={slot}
                    onClick={() => convertPointsToSlot(cost, slot)}
                    disabled={disabled}
                    className={`text-[10px] py-1 rounded border font-mono transition-colors ${
                      disabled
                        ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                        : 'border-ink-300 bg-parchment-50 text-ink-500 hover:bg-parchment-200'
                    }`}
                  >
                    {cost}pt → Nv {slot}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-ink-500 uppercase tracking-widest font-bold mb-1">
              Gastar espaço → ganhar pontos (= nível do espaço)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map(slot => {
                const avail = slotsAvailable[slot] ?? 0
                const wouldExceed = remaining + slot > (sorceryUse?.max ?? 0)
                const disabled = avail <= 0 || wouldExceed
                return (
                  <button
                    key={slot}
                    onClick={() => convertSlotToPoints(slot)}
                    disabled={disabled}
                    className={`text-[10px] py-1 rounded border font-mono transition-colors ${
                      disabled
                        ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                        : 'border-ink-300 bg-parchment-50 text-ink-500 hover:bg-parchment-200'
                    }`}
                  >
                    Nv {slot} → +{slot}pt
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-[10px] ink-italic">
            Conversão consome ação bônus. Máx de pontos = nível de Feiticeiro.
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Limites de CR de Forma Selvagem (PHB p.66) ──────────────── */
function wildShapeCRDesc(druidaLevel) {
  if (druidaLevel < 2) return null
  if (druidaLevel >= 8) return 'CR ≤ 1'
  if (druidaLevel >= 4) return 'CR ≤ 1/2 · sem voo'
  return 'CR ≤ 1/4 · sem voo nem natação'
}

/* ── Painel de Forma Selvagem (Druida) ──────────────────────── */

function WildShapePanel({ druidaLevel, wsUse, usesRemaining, onSpend, character, onSetWildShape }) {
  const ws = character.combat?.wildShape ?? { active: false, beastName: '', currentHp: 0, maxHp: 0 }
  const [draft, setDraft] = useState({ beastName: '', maxHp: '' })
  const [showForm, setShowForm] = useState(false)
  const crDesc = wildShapeCRDesc(druidaLevel)

  function activate() {
    const max = parseInt(draft.maxHp, 10) || 0
    if (!draft.beastName.trim() || max <= 0) return
    onSetWildShape({
      active:    true,
      beastName: draft.beastName.trim(),
      currentHp: max,
      maxHp:     max,
    })
    if (wsUse) onSpend?.(wsUse.id)
    setDraft({ beastName: '', maxHp: '' })
    setShowForm(false)
  }

  function revert() {
    onSetWildShape(null)
  }

  function adjustBeastHp(delta) {
    const next = Math.max(0, Math.min(ws.maxHp, ws.currentHp + delta))
    onSetWildShape({ ...ws, currentHp: next })
  }

  if (druidaLevel < 2) return null

  return (
    <div className={`rounded-lg border-2 p-3 transition-colors ${
      ws.active ? 'border-emerald-700 bg-emerald-50' : 'border-parchment-600 bg-parchment-50'
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl shrink-0" aria-hidden>{ws.active ? '🐺' : '🌿'}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-display tracking-wide ${ws.active ? 'text-emerald-800' : 'text-ink-500'}`}>
            {ws.active ? `EM FORMA SELVAGEM — ${ws.beastName}` : 'Forma Selvagem'}
          </p>
          <p className="text-[11px] ink-italic">
            {ws.active
              ? 'Não conjura magias. Mantém concentração. Dano excessivo passa para forma humanoide.'
              : `Bestas com ${crDesc}. Duração: ½ nível em horas. 2 usos por descanso curto.`}
          </p>
        </div>
        {!ws.active && (
          <button
            onClick={() => setShowForm(v => !v)}
            disabled={usesRemaining != null && usesRemaining <= 0 && druidaLevel < 20}
            className={`shrink-0 text-xs px-3 py-1.5 rounded border-2 font-display tracking-wide transition-all ${
              (usesRemaining != null && usesRemaining <= 0 && druidaLevel < 20)
                ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                : 'border-ink-300 bg-parchment-100 text-ink-500 hover:bg-parchment-200'
            }`}
          >
            {showForm ? 'Cancelar' : 'Transformar'}
          </button>
        )}
        {ws.active && (
          <button
            onClick={revert}
            className="shrink-0 text-xs px-3 py-1.5 rounded border-2 border-emerald-700 bg-emerald-700 text-white font-display tracking-wide hover:bg-emerald-800 transition-all"
          >
            Reverter
          </button>
        )}
      </div>

      {ws.active && (
        <div className="mt-2 pt-2 border-t border-emerald-700/30 flex items-center gap-2">
          <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wide shrink-0">HP da Besta:</span>
          <button
            onClick={() => adjustBeastHp(-1)}
            className="w-7 h-7 rounded bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-bold"
          >−</button>
          <span className="font-mono text-sm text-emerald-900 min-w-[4ch] text-center font-bold">
            {ws.currentHp}/{ws.maxHp}
          </span>
          <button
            onClick={() => adjustBeastHp(+1)}
            className="w-7 h-7 rounded bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-bold"
          >+</button>
        </div>
      )}

      {!ws.active && showForm && (
        <div className="mt-2 pt-2 border-t border-parchment-600 space-y-2">
          <input
            type="text"
            value={draft.beastName}
            onChange={e => setDraft(d => ({ ...d, beastName: e.target.value }))}
            placeholder="Nome da besta (ex: Lobo, Águia, Urso)"
            className="w-full bg-parchment-50 border border-parchment-600 rounded px-2 py-1 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
          />
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={draft.maxHp}
              onChange={e => setDraft(d => ({ ...d, maxHp: e.target.value }))}
              placeholder="HP máx da besta"
              className="flex-1 bg-parchment-50 border border-parchment-600 rounded px-2 py-1 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
            />
            <button
              onClick={activate}
              disabled={!draft.beastName.trim() || !(parseInt(draft.maxHp, 10) > 0)}
              className="text-xs px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 disabled:bg-parchment-200 disabled:text-ink-200 text-white font-bold transition-colors"
            >
              Transformar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Painel de Fúria (Bárbaro) ────────────────────────────────── */

function RagePanel({ character, barbLevel, attributes, onToggleRage, ragesRemaining }) {
  const active = !!character.combat?.rageActive
  const bonus = rageDamageBonus(barbLevel)
  const strMod = getModifier(attributes?.str ?? 10)

  function handleToggle() {
    if (!onToggleRage) return
    onToggleRage(!active)
  }

  return (
    <div className={`rounded-lg border-2 p-3 transition-colors ${
      active
        ? 'border-rose-700 bg-rose-100'
        : 'border-parchment-600 bg-parchment-50'
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl shrink-0" aria-hidden>{active ? '🔥' : '💢'}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-display tracking-wide ${active ? 'text-rose-800' : 'text-ink-500'}`}>
            {active ? 'EM FÚRIA' : 'Fúria'}
          </p>
          <p className="text-[11px] ink-italic">
            Bônus de dano: <strong className={active ? 'text-rose-800' : 'text-ink-500'}>+{bonus}</strong> em ataques c/c com FOR
            · Resistência a B/P/S
            · Vantagem em testes/saves de FOR
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={!active && ragesRemaining != null && ragesRemaining <= 0}
          className={`shrink-0 text-xs px-3 py-1.5 rounded border-2 font-display tracking-wide transition-all ${
            active
              ? 'border-rose-700 bg-rose-700 text-white hover:bg-rose-800'
              : ragesRemaining != null && ragesRemaining <= 0
                ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                : 'border-ink-300 bg-parchment-100 text-ink-500 hover:bg-parchment-200'
          }`}
        >
          {active ? 'Encerrar' : 'Entrar em Fúria'}
        </button>
      </div>
      {active && (
        <div className="mt-2 pt-2 border-t border-rose-700/30 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wide">Rolagens rápidas:</span>
          <RollButton
            notation={`1d20${formatModifier(strMod)}`}
            label="Teste de FOR (Fúria — vantagem)"
          />
          <span className="text-[10px] ink-italic">FOR (use Shift+click para vantagem)</span>
        </div>
      )}
      {!active && ragesRemaining != null && ragesRemaining <= 0 && (
        <p className="mt-1 text-[10px] text-rose-700 italic">Sem usos de Fúria restantes — descanso longo para recuperar.</p>
      )}
    </div>
  )
}

/* ── Componente principal ──────────────────────────────────────── */

/**
 * Renderiza ações de combate específicas das classes do personagem.
 *
 * Hoje: Ataque Furtivo (Ladino), Fúria (Bárbaro).
 * Futuro: Bardic Inspiration (Bardo), Channel Divinity, Wild Shape, etc.
 */
export function CombatClassActions({ character, onToggleRage, onSpendFeatureUse, onRegainFeatureUse, onToggleSlot, onSetWildShape }) {
  const attrs = character.attributes ?? {}
  const rogueLevel    = levelInClass(character, 'ladino')
  const barbLevel     = levelInClass(character, 'barbaro')
  const paladinoLevel = levelInClass(character, 'paladino')
  const bardLevel       = levelInClass(character, 'bardo')
  const feiticeiroLevel = levelInClass(character, 'feiticeiro')
  const druidaLevel     = levelInClass(character, 'druida')

  // Recurso de Fúria (já gerado por defaultClassFeatureUses)
  const rageUse = (character.combat?.classFeatureUses ?? []).find(u => u.id === 'barbaro-rage')
  const ragesRemaining = rageUse ? rageUse.max - (rageUse.used ?? 0) : null

  // Recurso de Inspiração de Bardo
  const bardicUse = (character.combat?.classFeatureUses ?? []).find(u => u.id === 'bardo-bardic-inspiration')
  const bardicRemaining = bardicUse ? bardicUse.max - (bardicUse.used ?? 0) : null

  // Recurso de Pontos de Feitiçaria
  const sorceryUse = (character.combat?.classFeatureUses ?? []).find(u => u.id === 'feiticeiro-sorcery-points')

  // Recurso de Forma Selvagem
  const wsUse = (character.combat?.classFeatureUses ?? []).find(u => u.id === 'druida-wild-shape')
  const wsRemaining = wsUse ? wsUse.max - (wsUse.used ?? 0) : null

  // Slots disponíveis para Golpe Divino — sem importar a classe primária
  const slotsMax = getSpellSlots(
    character.info?.class,
    character.info?.level ?? 0,
    character.info?.multiclasses ?? []
  ) ?? {}
  const usedSlots = character.spellcasting?.usedSlots ?? {}
  const slotsAvailable = Object.fromEntries(
    Object.entries(slotsMax).map(([lvl, max]) => [lvl, Math.max(0, max - (usedSlots[lvl] ?? 0))])
  )

  function handleToggleRage(next) {
    onToggleRage?.(next)
    // Ao ENTRAR em fúria, consome um uso
    if (next && rageUse && onSpendFeatureUse) onSpendFeatureUse(rageUse.id)
    void onRegainFeatureUse
  }

  function handleConsumeSlot(slotLevel) {
    onToggleSlot?.(slotLevel, (usedSlots[slotLevel] ?? 0) + 1)
  }

  function handleReturnSlot(slotLevel) {
    onToggleSlot?.(slotLevel, Math.max(0, (usedSlots[slotLevel] ?? 0) - 1))
  }

  // Não renderiza nada se não há nenhuma ação relevante
  if (rogueLevel < 1 && barbLevel < 1 && paladinoLevel < 2 && bardLevel < 1 && feiticeiroLevel < 2 && druidaLevel < 2) return null

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-ink-500 uppercase tracking-widest font-display">
        Recursos de Classe em Combate
      </h3>
      {rogueLevel >= 1 && <SneakAttackPanel rogueLevel={rogueLevel} />}
      {paladinoLevel >= 2 && (
        <SmitePanel
          paladinoLevel={paladinoLevel}
          slotsAvailable={slotsAvailable}
          onConsumeSlot={handleConsumeSlot}
        />
      )}
      {bardLevel >= 1 && bardicUse && (
        <BardicInspirationPanel
          bardLevel={bardLevel}
          usesRemaining={bardicRemaining}
          onSpend={() => onSpendFeatureUse?.(bardicUse.id)}
        />
      )}
      {feiticeiroLevel >= 2 && sorceryUse && (
        <SorceryPanel
          feiticeiroLevel={feiticeiroLevel}
          sorceryUse={sorceryUse}
          onSpendPoints={onSpendFeatureUse}
          onRegainPoints={onRegainFeatureUse}
          slotsMax={slotsMax}
          slotsAvailable={slotsAvailable}
          usedSlots={usedSlots}
          onConsumeSlot={handleConsumeSlot}
          onReturnSlot={handleReturnSlot}
        />
      )}
      {druidaLevel >= 2 && (
        <WildShapePanel
          druidaLevel={druidaLevel}
          wsUse={wsUse}
          usesRemaining={wsRemaining}
          onSpend={onSpendFeatureUse}
          character={character}
          onSetWildShape={onSetWildShape}
        />
      )}
      {barbLevel >= 1 && (
        <RagePanel
          character={character}
          barbLevel={barbLevel}
          attributes={attrs}
          ragesRemaining={ragesRemaining}
          onToggleRage={handleToggleRage}
        />
      )}
    </div>
  )
}
