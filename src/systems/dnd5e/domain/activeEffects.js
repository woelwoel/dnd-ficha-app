/**
 * Efeitos ativos de magia (buffs) — spec 2026-07-07.
 * Camada PURA: agrega combat.activeEffects[] em (a) modificadores fixos no
 * formato magicEffects (+ speedMultiplier) e (b) riders/vantagens pro
 * pipeline de rolagem. Efeito NUNCA muta a base editável da ficha.
 */

export const EFFECT_CATEGORIES = ['attack', 'save', 'check']

export function aggregateSpellEffects(activeEffects = []) {
  const fx = { ac: 0, saves: 0, saveAbility: {}, speed: 0, speedMultiplier: 1 }
  const riders = []
  const advantages = []
  for (const e of activeEffects) {
    const m = e.mods ?? {}
    fx.ac += m.ac ?? 0
    fx.saves += m.saves ?? 0
    fx.speed += m.speed ?? 0
    fx.speedMultiplier *= m.speedMultiplier ?? 1
    for (const [k, v] of Object.entries(m.saveAbility ?? {})) {
      fx.saveAbility[k] = (fx.saveAbility[k] ?? 0) + (v ?? 0)
    }
    for (const r of e.riders ?? []) {
      riders.push({ dice: r.dice, categories: r.categories, oneShot: !!r.oneShot, effectId: e.id, effectName: e.name })
    }
    for (const a of e.advantages ?? []) {
      advantages.push({ mode: a.mode ?? 'adv', categories: a.categories, abilities: a.abilities ?? null, effectId: e.id })
    }
  }
  return { fx, riders, advantages }
}

/** Adiciona substituindo por id — mesma magia não empilha (PHB p.205). */
export function upsertEffect(list, effect) {
  return [...(list ?? []).filter(e => e.id !== effect.id), effect]
}

export function removeEffect(list, id) {
  return (list ?? []).filter(e => e.id !== id)
}

/**
 * Concentração saiu de `prevSpellIndex` (rompeu/trocou): efeitos criados por
 * conjuração PRÓPRIA daquela magia expiram. Efeitos `manual` (concentração
 * do ALIADO) nunca expiram por aqui.
 */
export function pruneOnConcentrationChange(list, prevSpellIndex) {
  if (!prevSpellIndex) return list ?? []
  return (list ?? []).filter(e =>
    !(e.source === 'cast' && e.concentration && e.id === prevSpellIndex)
  )
}

/** Instancia um efeito a partir da magia da ficha + `effect` curado. */
export function buildEffectInstance(spell, effectDef, source) {
  return {
    id: spell.index,
    name: spell.name,
    source,
    concentration: !!effectDef.concentration,
    mods: effectDef.mods ?? {},
    riders: effectDef.riders ?? [],
    advantages: effectDef.advantages ?? [],
    summary: effectDef.summary ?? '',
  }
}
