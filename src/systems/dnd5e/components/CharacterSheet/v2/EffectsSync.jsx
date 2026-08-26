import { useEffect } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useDiceRoller } from '../../../../../hooks/useDiceRoller'
import { aggregateSpellEffects } from '../../../domain/activeEffects'
import { exhaustionEffects } from '../../../domain/exhaustion'

/** Categorias de rolagem que são teste de d20 (dano não é). */
const D20_CATEGORIES = ['attack', 'check', 'save']

/**
 * Registra no DiceRollerProvider o resolver de efeitos da ficha
 * (padrão DiceAccentSync): riders (+1d4 da Bênção), vantagens e a penalidade
 * de exaustão entram nas rolagens anotadas com category/ability.
 * v2-only — o v1 não monta isto.
 *
 * Exaustão e buffs SOMAM: a penalidade 2024 se junta aos riders, e a
 * desvantagem 2014 se combina com a vantagem de um buff pela matriz do PHB
 * (que `combineMode` aplica do lado do provider).
 */
export function EffectsSync() {
  const { character, updaters } = useCharacterContext()
  const { setRollEffectsResolver } = useDiceRoller()
  const activeEffects = character.combat?.activeEffects
  const exhaustion = character.combat?.exhaustion ?? 0
  const ruleset = character.meta?.ruleset
  // Só isto é usado no efeito; depender do objeto `updaters` inteiro
  // re-registraria o resolver a cada render da ficha (churn desnecessário).
  const removeActiveEffect = updaters.removeActiveEffect

  useEffect(() => {
    const { riders, advantages } = aggregateSpellEffects(activeEffects ?? [])
    const fx = exhaustionEffects({ meta: { ruleset }, combat: { exhaustion } })

    if (riders.length === 0 && advantages.length === 0 && fx.level === 0) {
      setRollEffectsResolver(null)
      return () => setRollEffectsResolver(null)
    }

    setRollEffectsResolver((category, ability) => {
      const applicable = riders.filter(r => r.categories.includes(category))
      const adv = advantages.find(a =>
        a.categories.includes(category) &&
        (a.abilities ? (ability != null && a.abilities.includes(ability)) : true)
      )

      const isD20 = D20_CATEGORIES.includes(category)
      const flatMod = isD20 ? fx.d20Penalty : 0
      const exhaustionDis = isD20 && (
        (category === 'check'  && fx.abilityCheckDisadvantage) ||
        (category === 'attack' && fx.attackDisadvantage) ||
        (category === 'save'   && fx.saveDisadvantage)
      )

      if (applicable.length === 0 && !adv && !flatMod && !exhaustionDis) return null

      return {
        extraDice: applicable.map(r => r.dice),
        // A desvantagem da exaustão entra como se fosse mais um efeito: o
        // provider combina com o modo do usuário pela matriz do PHB.
        advantage: adv ? adv.mode : (exhaustionDis ? 'dis' : null),
        flatMod,
        labelSuffix: applicable.map(r => ` · ${r.effectName} +${r.dice}`).join(''),
        onApplied: () => {
          for (const r of applicable) {
            if (r.oneShot) removeActiveEffect?.(r.effectId)
          }
        },
      }
    })
    return () => setRollEffectsResolver(null)
  }, [activeEffects, exhaustion, ruleset, setRollEffectsResolver, removeActiveEffect])

  return null
}
