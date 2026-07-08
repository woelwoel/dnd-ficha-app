import { useEffect } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useDiceRoller } from '../../../../../hooks/useDiceRoller'
import { aggregateSpellEffects } from '../../../domain/activeEffects'

/**
 * Registra no DiceRollerProvider o resolver de efeitos ativos da ficha
 * (padrão DiceAccentSync): riders (+1d4 da Bênção) e vantagens entram nas
 * rolagens anotadas com category/ability. v2-only — o v1 não monta isto.
 */
export function EffectsSync() {
  const { character, updaters } = useCharacterContext()
  const { setRollEffectsResolver } = useDiceRoller()
  const activeEffects = character.combat?.activeEffects
  // Só isto é usado no efeito; depender do objeto `updaters` inteiro
  // re-registraria o resolver a cada render da ficha (churn desnecessário).
  const removeActiveEffect = updaters.removeActiveEffect

  useEffect(() => {
    const { riders, advantages } = aggregateSpellEffects(activeEffects ?? [])
    if (riders.length === 0 && advantages.length === 0) {
      setRollEffectsResolver(null)
      return () => setRollEffectsResolver(null)
    }
    setRollEffectsResolver((category, ability) => {
      const applicable = riders.filter(r => r.categories.includes(category))
      const adv = advantages.find(a =>
        a.categories.includes(category) &&
        (a.abilities ? (ability != null && a.abilities.includes(ability)) : true)
      )
      if (applicable.length === 0 && !adv) return null
      return {
        extraDice: applicable.map(r => r.dice),
        advantage: adv ? adv.mode : null,
        labelSuffix: applicable.map(r => ` · ${r.effectName} +${r.dice}`).join(''),
        onApplied: () => {
          for (const r of applicable) {
            if (r.oneShot) removeActiveEffect?.(r.effectId)
          }
        },
      }
    })
    return () => setRollEffectsResolver(null)
  }, [activeEffects, setRollEffectsResolver, removeActiveEffect])

  return null
}
