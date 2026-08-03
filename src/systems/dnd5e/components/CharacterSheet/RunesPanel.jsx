import { Icon } from '../../../../components/ui/Icon'
import { InfoPopover } from '../../../../components/ui/InfoPopover'
import { useSrdOptional } from '../../data/SrdProvider'
import { ACTION_BADGES } from './actionBadges'
import { chosenRuneIds, resolveChosenRunes } from '../../domain/runes'

/**
 * Painel de Runas (Cavaleiro Rúnico, Tasha) — aparece na ficha quando o
 * personagem é Guerreiro com arquétipo `cavaleiro-runico` E gravou runas.
 *
 * Diferença de fundo pro painel de Manobras: manobra é um pool ÚNICO de dados
 * de superioridade compartilhado, runa não. Cada runa tem sua própria
 * invocação, 1 uso por descanso curto ou longo (TCE p.42) — por isso cada
 * linha tem seu botão e seu tracker (`guerreiro-rune-<runa>`), e o cabeçalho
 * conta quantas ainda estão prontas.
 *
 * O benefício passivo vale sempre (com a runa gravada num item que você
 * carregue), então fica na linha como texto, sem botão.
 *
 * As runas só existem como `options` do class-choices — não há catálogo
 * `*-runes-pt.json`. Daí ler `classChoices` do SrdProvider.
 */
export function RunesPanel({ character, featureUses, onSpend, onRegain }) {
  const classChoices = useSrdOptional()?.classChoices ?? {}

  // Guarda antes de qualquer resolução: ids escolhidos não dependem do
  // catálogo, então o painel sabe que EXISTEM runas mesmo antes dele chegar.
  const runeIds = chosenRuneIds(character)
  if (runeIds.length === 0) return null

  const runes = resolveChosenRunes(character, classChoices)
  // `trackerOf`, não `useOf`: nome começando com "use" o lint lê como hook.
  const trackerOf = (runa) => featureUses?.find(u => u.id === runa.useId)
  // Tracker ausente (ficha antiga, antes do sync) conta como pronta.
  const isSpent = (runa) => {
    const t = trackerOf(runa)
    return t ? (t.used ?? 0) >= t.max : false
  }
  const ready = runes.filter(r => !isSpent(r)).length

  return (
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg p-4 shadow-parchment-sm">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest">
          Runas
          <span className="ml-2 text-ink-300 font-normal normal-case text-xs">
            {runeIds.length} gravada{runeIds.length !== 1 ? 's' : ''}
          </span>
        </h3>
        {runes.length > 0 && (
          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-mono font-semibold ${
            ready === 0
              ? 'border-red-500 text-red-700 bg-red-50'
              : 'border-amber-500 text-amber-700 bg-amber-50'
          }`}>
            <Icon name="sparkle" size={11} strokeWidth={2} />
            {ready}/{runes.length} prontas
          </span>
        )}
      </div>

      {runes.length === 0 ? (
        <p className="text-xs italic text-ink-300">Carregando runas…</p>
      ) : (
        <div className="space-y-1.5">
          {runes.map(runa => {
            const badge = ACTION_BADGES[runa.type] ?? ACTION_BADGES.passiva
            const spent = isSpent(runa)
            return (
              <div
                key={runa.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded border border-parchment-600 bg-parchment-50"
              >
                <span className={`text-[13px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 font-bold ${badge.color}`}>
                  {badge.abbr}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display text-ink-500 flex items-center gap-1">
                    <span className="truncate">{runa.name}</span>
                    <InfoPopover content={runa.desc} title={runa.name} iconSize={13} className="p-0.5" />
                  </p>
                  {runa.passive && (
                    <p className="text-xs italic text-ink-300 truncate" title={runa.passive}>
                      {runa.passive}
                    </p>
                  )}
                </div>
                {spent && (
                  <button
                    onClick={() => onRegain?.(runa.useId)}
                    title={`Recuperar a invocação de ${runa.name}`}
                    className="inline-flex items-center text-xs px-2 py-1 rounded border border-parchment-600 text-ink-300 hover:bg-parchment-200 transition-colors min-h-[28px]"
                  >
                    Recuperar
                  </button>
                )}
                <button
                  onClick={() => { if (!spent) onSpend?.(runa.useId) }}
                  disabled={spent}
                  // title curto de propósito: o Chrome usa `title` como nome
                  // acessível do botão, e a regra inteira aqui afogaria a ação.
                  // A descrição completa fica no ℹ ao lado do nome.
                  title={spent
                    ? `${runa.name} já foi invocada — descanse curto/longo`
                    : `Invocar ${runa.name} — 1× por descanso curto ou longo`}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors min-h-[28px] font-semibold ${
                    spent
                      ? 'border-gray-400 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-amber-500 bg-amber-100 text-amber-800 hover:bg-amber-200'
                  }`}
                >
                  <Icon name="sparkle" size={11} strokeWidth={2} />
                  {spent ? 'Invocada' : 'Invocar'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-ink-300 italic leading-relaxed">
        A passiva de cada runa vale sempre, com a runa gravada num item que você carregue.
        Invocar gasta o uso daquela runa — 1 por descanso curto ou longo, cada uma com o seu.
        Toque no ℹ pra ver a regra completa.
      </p>
    </div>
  )
}
