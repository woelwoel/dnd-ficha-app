import { useDiceRoller } from '../../hooks/useDiceRoller'

/**
 * Botão único "⚔ Atacar" que dispara ataque + dano em sequência.
 *
 * Fluxo (PHB p.194):
 *   1. Rola 1d20 + bônus de ataque
 *   2. Se natural 20 → rola dano CRÍTICO (dados dobrados)
 *   3. Se natural 1  → para (errou automaticamente, sem dano)
 *   4. Caso contrário → rola dano normal
 *
 * Modificadores via teclado (desktop):
 *   - Shift+Click → vantagem no d20 de ataque
 *   - Alt+Click   → desvantagem
 *
 * As entradas vão para o histórico do DiceRoller com labels relacionados
 * ("Ataque · Espada longa" e "Dano · Espada longa") para o jogador
 * conseguir narrar a rolagem ao mestre em sequência.
 */
export function AttackRollButton({ attackNotation, damageNotation, weaponName, size = 'sm', className = '' }) {
  const { roll, openPanel } = useDiceRoller()

  function handleClick(e) {
    e.stopPropagation()
    e.preventDefault()

    const opts = {}
    if (e.shiftKey) opts.mode = 'adv'
    else if (e.altKey) opts.mode = 'dis'

    const attackLabel = `Ataque · ${weaponName}`
    const attack = roll(attackNotation, attackLabel, opts)
    openPanel()

    if (!attack) return

    // `rolls[0]` é o d20 mantido (vantagem/desvantagem já resolveu o keep).
    const d20 = attack.sides === 20 ? attack.rolls[0] : null
    const isNat1  = d20 === 1
    const isNat20 = d20 === 20

    if (isNat1) return  // Erro automático — sem dano (PHB p.194)

    const damageLabel = isNat20 ? `Dano CRÍTICO · ${weaponName}` : `Dano · ${weaponName}`
    roll(damageNotation, damageLabel, { crit: isNat20 })
  }

  const title =
    `Atacar — ${weaponName}: ${attackNotation} → ${damageNotation}\n` +
    'Shift+click: vantagem · Alt+click: desvantagem\n' +
    'Natural 20: dano crítico automático · Natural 1: para no ataque'

  return (
    <button
      onClick={handleClick}
      title={title}
      aria-label={`Atacar com ${weaponName}: rola ${attackNotation} e ${damageNotation}`}
      className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded
        bg-amber-700/30 hover:bg-amber-600/50 active:scale-95
        text-amber-300 hover:text-amber-200
        border border-amber-600/40 hover:border-amber-400
        transition-all select-none leading-none font-semibold
        ${size === 'xs' ? 'text-[11px]' : 'text-xs'}
        ${className}`}
    >
      ⚔ Atacar
    </button>
  )
}
