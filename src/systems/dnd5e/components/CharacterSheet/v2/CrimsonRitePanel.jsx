import { useState } from 'react'
import {
  RITES, knownRites, activeRites, riteDieFor,
  bloodHunterLevel, bloodHunterMaxHpPenalty,
} from '../../../domain/bloodHunter'

/**
 * Painel do Ritual Vermelho (Caçador de Sangue, fonte homebrew).
 *
 * Controlado: props in, `onChange(próximosRitos)` out — sem contexto, pra dar
 * pra testar isolado. Quem grava em `combat.crimsonRites` é o ActionsTab.
 *
 * A regra toda vem de `domain/bloodHunter.js`. Este arquivo só desenha.
 */
export function CrimsonRitePanel({ character, onChange, readOnly = false }) {
  const nivel = bloodHunterLevel(character)
  const conhecidos = knownRites(character)
  const ativos = activeRites(character)
  const armas = character?.combat?.attacks ?? []

  // Rito pré-selecionado por arma no seletor, antes de ativar.
  const [escolha, setEscolha] = useState({})

  if (nivel < 1) return null

  const custo = character?.info?.level ?? 0
  const semSacrificio = nivel >= 20
  const tetoArmazenado = Number(character?.combat?.maxHp) || 0
  const tetoEfetivo = Math.max(1, tetoArmazenado - bloodHunterMaxHpPenalty(character))

  function riteDe(attackId) {
    return ativos.find(r => r.attackId === attackId)?.rite ?? null
  }

  function ativar(attackId) {
    const rito = escolha[attackId] ?? conhecidos[0]
    if (!rito) return
    // Rito novo na mesma arma substitui o antigo — não acumula (regra do PDF).
    onChange([...ativos.filter(r => r.attackId !== attackId), { attackId, rite: rito }])
  }

  function desfazer(attackId) {
    onChange(ativos.filter(r => r.attackId !== attackId))
  }

  return (
    <div>
      <div className="v2-title" style={{ marginTop: 4 }}>Ritual Vermelho</div>

      <div className="v2-mut" style={{ fontSize: 12, padding: '2px 0' }}>
        {semSacrificio
          ? 'Maestria Sanguinária: invocar um ritual não reduz mais seus pontos de vida máximos.'
          : `Cada ritual ativo custa ${custo} PV máximo. Dado do ritual: ${riteDieFor(nivel)}.`}
      </div>

      {!semSacrificio && ativos.length > 0 && (
        <div className="v2-mut" style={{ fontSize: 12, padding: '2px 0' }}>
          Teto de PV agora: {tetoEfetivo} de {tetoArmazenado}
        </div>
      )}

      {conhecidos.length === 0 && (
        <div className="v2-mut" style={{ fontSize: 13, padding: '4px 0' }}>
          Nenhum ritual conhecido. Escolha um Ritual Primal na progressão de nível.
        </div>
      )}

      {conhecidos.length > 0 && armas.length === 0 && (
        <div className="v2-mut" style={{ fontSize: 13, padding: '4px 0' }}>
          Nenhuma arma registrada para imbuir.
        </div>
      )}

      {conhecidos.length > 0 && armas.map(atk => {
        const ativo = riteDe(atk.id)
        return (
          <div className="v2-row" key={atk.id}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {atk.name}
              {ativo && (
                <span className="v2-mut" style={{ marginLeft: 6, fontSize: 11 }}>
                  {RITES[ativo].name} · {riteDieFor(nivel)} {RITES[ativo].damageType}
                </span>
              )}
            </span>
            <span style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {!ativo && (
                <select
                  className="ui-btn"
                  aria-label={`Ritual para ${atk.name}`}
                  value={escolha[atk.id] ?? conhecidos[0]}
                  disabled={readOnly}
                  onChange={e => setEscolha(prev => ({ ...prev, [atk.id]: e.target.value }))}
                >
                  {conhecidos.map(k => (
                    <option key={k} value={k}>{RITES[k].name}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className="v2-btn"
                disabled={readOnly}
                aria-label={ativo ? `Desfazer ritual em ${atk.name}` : `Ativar ritual em ${atk.name}`}
                onClick={() => (ativo ? desfazer(atk.id) : ativar(atk.id))}
              >
                {ativo ? 'Desfazer' : 'Ativar'}
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default CrimsonRitePanel
