import { useEffect } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useDiceRoller } from '../../../../../hooks/useDiceRoller'
import { aggregateSpellEffects } from '../../../domain/activeEffects'
import { exhaustionEffects } from '../../../domain/exhaustion'
import { combineAdvantage } from '../../../domain/advantage'

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
 * — combinação feita AQUI, via `combineAdvantage`, antes de o valor chegar
 * ao provider (o `combineMode` do provider nunca vê as duas fontes juntas).
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

      const buffMode = adv ? adv.mode : null
      const exhaustionMode = exhaustionDis ? 'dis' : null

      return {
        extraDice: applicable.map(r => r.dice),
        // Buff e exaustão são fontes DIFERENTES: vantagem e desvantagem se
        // anulam pela matriz do PHB antes de chegar ao motor de dados. Não
        // dá pra reusar o `combineMode` do provider aqui, porque ele já
        // aplica o default 'normal' — e 'normal' vindo daqui sobrescreveria
        // o clique explícito do jogador.
        advantage: combineAdvantage(buffMode, exhaustionMode),
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
