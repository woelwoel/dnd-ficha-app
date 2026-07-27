import { useState } from 'react'
import { CONDITIONS, CONDITIONS_BY_ID } from '../../domain/conditions'

/**
 * Uma linha do combate. Não sabe persistir nada: chama de volta o pai, que
 * decide se a mudança vai pro `state` do encontro (monstro) ou pra RPC do
 * Mestre (PJ).
 *
 * @param {object} combatant
 * @param {object|null} doc — doc da ficha, obrigatório pro `pc` (HP vem dela)
 * @param {boolean} active — é o turno dele
 * @param {string} [warning] — aviso transitório (ex.: CD de concentração)
 */
export function CombatantRow({
  combatant, doc, active, warning,
  onDamage, onHeal, onTempHp, onToggleCondition, onRemove, onInitiativeChange,
}) {
  const [amount, setAmount] = useState('')
  const [condOpen, setCondOpen] = useState(false)
  const [initiativeInput, setInitiativeInput] = useState(String(combatant.initiative ?? ''))

  // Sincroniza durante a renderização quando o pai muda a iniciativa por
  // fora (ex.: outro cliente, desempate automático) — sem useEffect, pra não
  // disparar um segundo render encadeado. Não interfere na digitação local:
  // só "reseta" quando o próprio combatant muda de identidade ou valor.
  const [syncedKey, setSyncedKey] = useState(`${combatant.id}:${combatant.initiative}`)
  const currentKey = `${combatant.id}:${combatant.initiative}`
  if (currentKey !== syncedKey) {
    setSyncedKey(currentKey)
    setInitiativeInput(String(combatant.initiative ?? ''))
  }

  const isPc = combatant.kind === 'pc'
  const locked = isPc && (combatant.orphaned || !doc)
  const hp = isPc
    ? { current: doc?.combat?.currentHp ?? 0, max: doc?.combat?.maxHp ?? 0, temp: doc?.combat?.tempHp ?? 0 }
    : { current: combatant.currentHp ?? 0, max: combatant.maxHp ?? 0, temp: combatant.tempHp ?? 0 }
  const conditions = isPc ? (doc?.combat?.conditions ?? []) : (combatant.conditions ?? [])
  const ac = isPc ? doc?.combat?.armorClass : combatant.ac
  const dead = isPc ? !!doc?.combat?.isDead : !!combatant.defeated

  const n = () => Math.max(0, Math.floor(Number(amount) || 0))

  return (
    <li className={`px-3 py-2 flex flex-col gap-2 ${active ? 'bg-amber-100 border-l-4 border-amber-700' : 'border-l-4 border-transparent'}`}>
      <div className="flex items-center gap-3">
        <input
          type="number"
          aria-label={`Iniciativa de ${combatant.name}`}
          value={initiativeInput}
          onChange={e => {
            setInitiativeInput(e.target.value)
            onInitiativeChange(combatant.id, e.target.value)
          }}
          className="w-14 px-1 py-0.5 text-center text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
        />
        <span className={`flex-1 text-sm font-display tracking-wide text-ink-500 ${dead ? 'line-through opacity-60' : ''}`}>
          {combatant.name}
          {isPc && combatant.orphaned && (
            <span className="ml-2 text-xs ink-italic text-red-700">fora da mesa</span>
          )}
        </span>
        <span className="text-sm text-ink-500">
          {hp.current}/{hp.max}
          {hp.temp > 0 && <span className="text-xs ink-italic text-ink-300"> (+{hp.temp})</span>}
        </span>
        {ac != null && (
          <span className="text-xs px-2 py-0.5 border-2 border-parchment-600 rounded-sm text-ink-500">{ac}</span>
        )}
        <button
          type="button"
          aria-label={`Remover ${combatant.name} do combate`}
          onClick={() => onRemove(combatant.id)}
          className="text-xs text-red-700 hover:underline"
        >
          ✕
        </button>
      </div>

      {conditions.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {conditions.map(id => (
            <li key={id} className="text-xs px-2 py-0.5 rounded-sm border border-parchment-600 bg-parchment-100 text-ink-500">
              {CONDITIONS_BY_ID[id]?.icon} {CONDITIONS_BY_ID[id]?.label ?? id}
            </li>
          ))}
        </ul>
      )}

      {warning && <p className="text-xs text-amber-800 ink-italic">{warning}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min="0"
          aria-label={`Valor de dano ou cura para ${combatant.name}`}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-16 px-2 py-1 text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
        />
        <button type="button" disabled={locked} onClick={() => onDamage(combatant.id, n())}
          className="text-xs px-2 py-1 border-2 border-red-700 text-red-700 rounded-sm disabled:opacity-40">Dano</button>
        <button type="button" disabled={locked} onClick={() => onHeal(combatant.id, n())}
          className="text-xs px-2 py-1 border-2 border-green-800 text-green-800 rounded-sm disabled:opacity-40">Cura</button>
        <button type="button" disabled={locked} onClick={() => onTempHp(combatant.id, n())}
          className="text-xs px-2 py-1 border-2 border-parchment-600 text-ink-500 rounded-sm disabled:opacity-40">Temporário</button>
        <button type="button" disabled={locked} onClick={() => setCondOpen(o => !o)}
          className="text-xs px-2 py-1 border-2 border-parchment-600 text-ink-500 rounded-sm disabled:opacity-40">Condição</button>
      </div>

      {condOpen && (
        <ul className="flex flex-wrap gap-1">
          {CONDITIONS.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onToggleCondition(combatant.id, c.id)}
                title={c.rule}
                className={`text-xs px-2 py-1 rounded-sm border-2 ${
                  conditions.includes(c.id)
                    ? 'border-ink-600 bg-ink-500 text-parchment-50'
                    : 'border-parchment-600 text-ink-500 hover:bg-parchment-200'
                }`}
              >
                {c.icon} {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
