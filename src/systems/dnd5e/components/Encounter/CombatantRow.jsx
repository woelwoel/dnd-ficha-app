import { useState } from 'react'
import { CONDITIONS_BY_ID } from '../../domain/conditions'
import { HpBar } from './HpBar'

/**
 * Uma linha da ordem de iniciativa. Não sabe persistir nada: chama de volta o
 * pai, que decide se a mudança vai pro `state` do encontro (monstro) ou pra RPC
 * do Mestre (PJ).
 *
 * Fica AQUI só o que se repete a cada golpe: iniciativa, vida, CA, dano e cura.
 * HP temporário, paleta de condições e avisos moram no painel de detalhe — a
 * linha ganhou o dobro de legibilidade quando parou de carregá-los.
 *
 * @param {object} combatant
 * @param {object|null} doc — doc da ficha, obrigatório pro `pc` (HP vem dela)
 * @param {boolean} active — é o turno dele
 * @param {boolean} selected — está aberto no painel de detalhe
 * @param {string} [warning] — aviso transitório (ex.: CD de concentração).
 *   Fica na linha, e não no painel, porque uma CD de concentração é urgente:
 *   escondê-la atrás de um clique de seleção seria perdê-la.
 */
export function CombatantRow({
  combatant, doc, active, selected = false, warning,
  onSelect, onDamage, onHeal, onRemove, onInitiativeChange,
}) {
  const [amount, setAmount] = useState('')
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
    <li
      aria-current={active ? 'step' : undefined}
      className={[
        'px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-l-4',
        active ? 'bg-amber-100 border-amber-700' : 'border-transparent',
        selected && !active ? 'bg-parchment-200' : '',
      ].join(' ')}
    >
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

      <button
        type="button"
        onClick={() => onSelect(combatant.id)}
        aria-label={`Abrir detalhe de ${combatant.name}`}
        aria-pressed={selected}
        className="flex-1 min-w-[8rem] text-left"
      >
        <span className={`text-sm font-display tracking-wide text-ink-500 ${dead ? 'line-through opacity-60' : ''} ${selected ? 'underline decoration-amber-700 underline-offset-4' : ''}`}>
          {combatant.name}
        </span>
        {isPc && combatant.orphaned && (
          <span className="ml-2 text-xs ink-italic text-red-700">fora da mesa</span>
        )}
        {conditions.length > 0 && (
          <span className="ml-2 text-xs text-ink-300">
            {conditions.map(id => CONDITIONS_BY_ID[id]?.icon ?? '•').join(' ')}
          </span>
        )}
      </button>

      <HpBar current={hp.current} max={hp.max} temp={hp.temp} label={combatant.name} />

      {ac != null && (
        <span
          title="Classe de Armadura"
          className="text-xs px-2 py-0.5 border-2 border-parchment-600 rounded-sm text-ink-500"
        >
          {ac}
        </span>
      )}

      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          aria-label={`Valor de dano ou cura para ${combatant.name}`}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-14 px-2 py-1 text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
        />
        <button type="button" disabled={locked} onClick={() => onDamage(combatant.id, n())}
          className="text-xs px-2 py-1 border-2 border-red-700 text-red-700 rounded-sm disabled:opacity-40">Dano</button>
        <button type="button" disabled={locked} onClick={() => onHeal(combatant.id, n())}
          className="text-xs px-2 py-1 border-2 border-green-800 text-green-800 rounded-sm disabled:opacity-40">Cura</button>
        <button
          type="button"
          aria-label={`Remover ${combatant.name} do combate`}
          onClick={() => onRemove(combatant.id)}
          className="text-xs px-1 text-red-700 hover:underline"
        >
          ✕
        </button>
      </div>

      {warning && <p className="basis-full text-xs text-amber-800 ink-italic">{warning}</p>}
    </li>
  )
}
