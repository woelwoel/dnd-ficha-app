import { useEffect, useState } from 'react'
import { useDiceRoller } from '../../../../hooks/useDiceRoller'
import { Icon } from '../../../../components/ui/Icon'
import { InfoPopover } from '../../../../components/ui/InfoPopover'
import { useSrdOptional } from '../../data/SrdProvider'
import { MANEUVER_TYPES } from './maneuverTypes'

/**
 * Painel rápido de Manobras (Mestre de Combate) — aparece na aba Ficha
 * quando o personagem é Guerreiro com arquétipo `mestre_combate` E tem
 * manobras escolhidas.
 *
 * Análogo ao bloco de Sneak Attack do Ladino: mostra contagem de dados de
 * superioridade + cada manobra escolhida com gatilho/tipo, com botão
 * de "gastar dado e rolar".
 *
 * Mecânica PHB:
 *  - Todas as manobras conhecidas estão SIMULTANEAMENTE disponíveis.
 *  - O jogador gasta 1 dado quando uma triggera (acerto, miss adversário,
 *    ação bônus, reação, etc.) e narra qual usou.
 *  - Recarga: desc. curto ou longo (já tratado em `defaultClassFeatureUses`).
 *
 * Carrega `phb-maneuvers-pt.json` sob demanda (tem campos `trigger` e
 * `type` que `phb-class-choices-pt.json` não tem).
 *
 * As fontes suplementares (Tasha, Xanathar) acrescentam manobras ao MESMO
 * choice `martial_archetype_maneuvers` e NÃO têm arquivo de catálogo próprio —
 * elas só existem como `options` em `*-class-choices-pt.json`. Por isso o
 * painel resolve em duas camadas: catálogo do PHB primeiro (traz `type` e
 * `trigger`), `classChoices` do SrdProvider (já mesclado PHB+Tasha+Xanathar)
 * depois. Sem a segunda camada a manobra escolhida sumia da lista em silêncio
 * e a contagem do cabeçalho mentia.
 */

const MANEUVERS_CHOICE_ID = 'martial_archetype_maneuvers'

/** Option de class-choices (`{ value, name, type, desc }`) → shape do catálogo. */
function optionToManeuver(opt) {
  return { index: opt.value, name: opt.name, desc: opt.desc, type: opt.type ?? 'manobra' }
}

export function ManeuversPanel({ character, featureUses, onSpend }) {
  const [maneuversData, setManeuversData] = useState(null)
  const { roll } = useDiceRoller()
  const classChoices = useSrdOptional()?.classChoices ?? {}

  // Guarda de classe + escolha antes de gastar fetch.
  const chosen = character?.info?.chosenFeatures ?? {}
  const isPrimary = character?.info?.class === 'guerreiro'
  const isMulticlass = (character?.info?.multiclasses ?? []).some(mc => mc.class === 'guerreiro')
  const isGuerreiro = isPrimary || isMulticlass
  const isMestreCombate = chosen.martial_archetype === 'mestre_combate'
  const chosenIds = Array.isArray(chosen.martial_archetype_maneuvers)
    ? chosen.martial_archetype_maneuvers
    : []

  useEffect(() => {
    if (!isGuerreiro || !isMestreCombate || chosenIds.length === 0) return
    const ctrl = new AbortController()
    fetch('/srd-data/phb-maneuvers-pt.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then(setManeuversData)
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Falha ao carregar manobras:', err)
      })
    return () => ctrl.abort()
  }, [isGuerreiro, isMestreCombate, chosenIds.length])

  if (!isGuerreiro || !isMestreCombate || chosenIds.length === 0) return null

  const supDice = featureUses?.find(u => u.id === 'guerreiro-superiority-dice')
  if (!supDice) return null

  // Extrai tipo do dado do nome ("Dado de Superioridade (d10)" → "d10").
  const dieMatch = (supDice.name ?? '').match(/d(\d+)/i)
  const dieType  = dieMatch ? `d${dieMatch[1]}` : 'd8'
  const remaining = supDice.max - (supDice.used ?? 0)
  const noDice = remaining <= 0

  // Resolve manobras escolhidas (preserva ordem do array).
  // Catálogo do PHB primeiro; o que não estiver lá vem das options do
  // class-choices mesclado (Tasha/Xanathar).
  const allManeuvers = maneuversData?.maneuvers ?? []
  const supplementalOptions = (classChoices?.guerreiro?.choices ?? [])
    .find(c => c.id === MANEUVERS_CHOICE_ID)?.options ?? []
  const maneuverList = chosenIds
    .map(id => {
      const fromCatalog = allManeuvers.find(m => m.index === id)
      if (fromCatalog) return fromCatalog
      const opt = supplementalOptions.find(o => o.value === id)
      return opt ? optionToManeuver(opt) : null
    })
    .filter(Boolean)

  function spendDie(maneuver) {
    if (noDice) return
    onSpend?.('guerreiro-superiority-dice')
    roll(`1${dieType}`, `Sup. Die — ${maneuver.name}`)
  }

  return (
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg p-4 shadow-parchment-sm">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest">
          Manobras
          <span className="ml-2 text-ink-300 font-normal normal-case text-xs">
            {chosenIds.length} conhecida{chosenIds.length !== 1 ? 's' : ''}
          </span>
        </h3>
        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-mono font-semibold ${
          noDice
            ? 'border-red-500 text-red-700 bg-red-50'
            : 'border-amber-500 text-amber-700 bg-amber-50'
        }`}>
          <Icon name="dice" size={11} strokeWidth={2} />
          {remaining}/{supDice.max} {dieType}
        </span>
      </div>

      {maneuverList.length === 0 ? (
        <p className="text-xs italic text-ink-300">Carregando manobras…</p>
      ) : (
        <div className="space-y-1.5">
          {maneuverList.map(m => {
            const typeKey = (m.type ?? 'passiva').toLowerCase()
            const typeColor = MANEUVER_TYPES[typeKey]?.color ?? MANEUVER_TYPES.passiva.color
            const typeAbbr  = MANEUVER_TYPES[typeKey]?.abbr ?? typeKey.toUpperCase()
            return (
              <div
                key={m.index}
                className="flex items-center gap-2 px-2 py-1.5 rounded border border-parchment-600 bg-parchment-50"
              >
                <span className={`text-[13px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 font-bold ${typeColor}`}>
                  {typeAbbr}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display text-ink-500 flex items-center gap-1">
                    <span className="truncate">{m.name}</span>
                    <InfoPopover content={m.desc} title={m.name} iconSize={13} className="p-0.5" />
                  </p>
                  {m.trigger && (
                    <p className="text-xs italic text-ink-300 truncate">{m.trigger}</p>
                  )}
                </div>
                <button
                  onClick={() => spendDie(m)}
                  disabled={noDice}
                  title={noDice
                    ? 'Sem dados de superioridade — descanse curto/longo'
                    : `Gastar 1 dado e rolar 1${dieType} para ${m.name}`}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors min-h-[28px] font-semibold ${
                    noDice
                      ? 'border-gray-400 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-amber-500 bg-amber-100 text-amber-800 hover:bg-amber-200'
                  }`}
                >
                  <Icon name="dice" size={11} strokeWidth={2} />
                  {dieType}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-ink-300 italic leading-relaxed">
        Click no dado para gastar 1 Dado de Superioridade e rolar. Toque no ℹ ao lado do nome pra ver a regra completa.
        Recarrega em descanso curto ou longo.
      </p>
    </div>
  )
}
