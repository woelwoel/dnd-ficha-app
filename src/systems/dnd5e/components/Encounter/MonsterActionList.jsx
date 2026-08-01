import { useMemo } from 'react'
import { useDiceRoller } from '../../../../hooks/useDiceRoller'
import { monsterActions } from '../../domain/monsterActions'

/**
 * Os ataques do monstro selecionado, clicáveis.
 *
 * O statblock logo abaixo continua sendo a fonte de consulta; isto aqui é só o
 * atalho de rolagem, pelo mesmo `roll()` que a ficha do jogador usa — vantagem,
 * histórico e dados 3D vêm junto sem código novo.
 *
 * Crítico é um botão próprio, e não detecção do 20 natural, porque atacar e
 * rolar dano são gestos independentes aqui: o Mestre rola o ataque, ouve a CA
 * do jogador e só então decide. Amarrar os dois exigiria estado por ação e
 * ainda erraria quando o crítico vem de outra fonte.
 */
export function MonsterActionList({ monster, combatantName }) {
  const { roll } = useDiceRoller()
  const acoes = useMemo(() => monsterActions(monster), [monster])

  if (acoes.length === 0) return null

  const rotulo = (acao, sufixo) => `${combatantName} · ${acao.name}${sufixo}`

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-display tracking-widest uppercase text-ink-500">Ações</h3>
      <ul className="flex flex-col gap-2">
        {acoes.map(acao => (
          <li key={acao.id} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-ink-500 font-display tracking-wide">
                {acao.name}
                {acao.source === 'legendary' && (
                  <span className="ml-1 text-xs ink-italic text-ink-300">lendária</span>
                )}
              </span>

              {acao.kind === 'attack' && (
                <button
                  type="button"
                  onClick={() => roll(acao.attackNotation, rotulo(acao, ''), { category: 'attack' })}
                  className="text-xs px-2 py-0.5 border-2 border-ink-600 rounded-sm text-ink-500 hover:bg-parchment-200"
                >
                  Atacar {acao.attackNotation.replace('1d20', '')}
                </button>
              )}

              {acao.kind === 'save' && (
                <span className="text-xs px-2 py-0.5 rounded-sm border border-parchment-600 bg-parchment-100 text-ink-500">
                  CD {acao.save.dc} {acao.save.ability}
                  {acao.save.half && <span className="ink-italic text-ink-300"> · metade no sucesso</span>}
                </span>
              )}
            </div>

            {acao.damage.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {acao.damage.map((d, i) => (
                  <span key={`${acao.id}-${i}`} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => roll(d.notation, rotulo(acao, d.type ? ` (${d.type})` : ' (dano)'), { category: 'damage' })}
                      className="text-xs px-2 py-0.5 border-2 border-red-700 rounded-sm text-red-700 hover:bg-red-50"
                    >
                      {d.notation}{d.type ? ` ${d.type}` : ''}
                    </button>
                    <button
                      type="button"
                      aria-label={`Dano crítico de ${acao.name}`}
                      title="Dobra os dados (PHB p.196)"
                      onClick={() => roll(d.notation, rotulo(acao, ' (crítico)'), { category: 'damage', crit: true })}
                      className="text-xs px-1.5 py-0.5 border-2 border-amber-700 rounded-sm text-amber-800 hover:bg-amber-50"
                    >
                      ×2
                    </button>
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
