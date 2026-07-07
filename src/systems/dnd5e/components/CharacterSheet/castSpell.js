/**
 * Executa um plano de spellRollPlan chamando roll() em ordem.
 *
 * Máquina de crítico POR RAIO (PHB p.194/196): passo de ataque guarda
 * nat 20/nat 1 do d20 mantido; o passo de dano `critable` seguinte rola
 * com crit (dados dobrados) no nat 20 e é PULADO no nat 1. `mode`
 * ('adv'|'dis' — Shift/Alt no clique) vale só pros ataques.
 *
 * Retorna { healTotal } — soma dos passos de cura, pro botão
 * "Aplicar N PV" do SpellRow.
 */
export function executeCastPlan(steps, roll, { mode } = {}) {
  let pendingAttack = null
  let healTotal = 0

  for (const step of steps) {
    if (step.kind === 'attack') {
      const r = roll(step.notation, step.label, mode ? { mode } : {})
      const d20 = r && r.sides === 20 ? r.rolls?.[0] : null
      pendingAttack = { nat20: d20 === 20, nat1: d20 === 1 }
    } else if (step.kind === 'damage') {
      if (step.critable && pendingAttack?.nat1) { pendingAttack = null; continue }
      const isCrit = step.critable && pendingAttack?.nat20
      roll(step.notation, isCrit ? step.critLabel : step.label, isCrit ? { crit: true } : {})
      pendingAttack = null
    } else if (step.kind === 'heal') {
      const r = roll(step.notation, step.label)
      if (r) healTotal += r.total
    }
  }
  return { healTotal }
}
