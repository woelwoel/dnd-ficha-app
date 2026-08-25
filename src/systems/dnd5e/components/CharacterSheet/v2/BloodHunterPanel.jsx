import { useState } from 'react'
import {
  RITES, knownRites, activeRites, riteDieFor,
  bloodHunterLevel, bloodHunterMaxHpPenalty,
  LYCAN, bloodHunterOrder, isHybridForm, lycanMeleeDamageBonus, lycanUnarmedDie,
} from '../../../domain/bloodHunter'
import {
  MUTAGENS, MUTANT, mutationLevel, knownFormulas, activeMutagens,
} from '../../../domain/mutagens'
import {
  PATRONS, PROFANE_SOUL, profaneSoulPatron, profaneSoulPactSlots,
  profaneSoulSaveDC, profaneSoulAttackBonus, profaneSoulCantrips, profaneSoulSpellsKnown,
} from '../../../domain/profaneSoul'

/**
 * Painel do Caçador de Sangue (fonte homebrew): Ritual Vermelho e Sangue
 * Maldito.
 *
 * As duas features vivem aqui em vez de em `CombatClassActions` porque aquele
 * arquivo é uma lista fechada, escrita classe a classe, e não tem renderizador
 * genérico — um tracker novo entra no array derivado e simplesmente não é
 * desenhado. Mesma solução do `RunesPanel`.
 *
 * Controlado: props in, callbacks out — sem contexto, pra dar pra testar
 * isolado. Quem grava em `combat.crimsonRites` é o ActionsTab.
 *
 * A regra toda vem de `domain/bloodHunter.js`. Este arquivo só desenha.
 */
export function BloodHunterPanel({
  character, onChange, featureUses = [], onSpend, onRegain, onToggleHybrid,
  onChangeMutagens, readOnly = false,
}) {
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

  const maldito = (featureUses ?? []).find(u => u.id === 'cacador-de-sangue-blood-maledict')
  const malditoRestantes = maldito ? (maldito.max ?? 0) - (maldito.used ?? 0) : 0

  // Forma híbrida: só a Ordem do Licantropo tem.
  const ehLicano = bloodHunterOrder(character) === LYCAN && nivel >= 3
  const transformado = isHybridForm(character)
  const hibrida = (featureUses ?? []).find(u => u.id === 'cacador-de-sangue-hybrid-transformation')
  const hibridaRestantes = hibrida ? (hibrida.max ?? 0) - (hibrida.used ?? 0) : 0

  // Ordem do Mutante: formulas conhecidas + elixires em efeito agora.
  const ehMutante = bloodHunterOrder(character) === MUTANT && nivel >= 3
  const formulas = knownFormulas(character)
  const ativosMut = activeMutagens(character).map(m => m.key)
  const nivelMutacao = mutationLevel(character)

  function alternarMutagenico(chave) {
    const proximos = ativosMut.includes(chave)
      ? ativosMut.filter(k => k !== chave)
      : [...ativosMut, chave]
    onChangeMutagens?.(proximos)
  }

  // Ordem da Alma Profana: a unica que conjura.
  const ehAlmaProfana = bloodHunterOrder(character) === PROFANE_SOUL && nivel >= 3
  const patrono = profaneSoulPatron(character)
  const pacto = profaneSoulPactSlots(character)

  function transformar() {
    // Transformar consome um uso; reverter não devolve (regra do PDF).
    onToggleHybrid?.(true)
    if (hibrida) onSpend?.(hibrida.id)
  }

  return (
    <div>
      {ehLicano && (
        <>
          <div className="v2-title" style={{ marginTop: 4 }}>Forma Híbrida</div>
          <div className="v2-row">
            <span>
              {transformado ? 'Transformado' : 'Forma normal'}
              <span className="v2-mut" style={{ marginLeft: 6, fontSize: 11 }}>
                descanso curto ou longo
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hibrida && <span className="v2-chip">{hibridaRestantes}/{hibrida.max}</span>}
              {transformado ? (
                <button
                  type="button"
                  className="v2-btn"
                  disabled={readOnly}
                  aria-label="Reverter da forma híbrida"
                  onClick={() => onToggleHybrid?.(false)}
                >
                  Reverter
                </button>
              ) : (
                <button
                  type="button"
                  className="v2-btn"
                  disabled={readOnly || (!!hibrida && hibridaRestantes <= 0)}
                  aria-label="Transformar em forma híbrida"
                  onClick={transformar}
                >
                  Transformar
                </button>
              )}
            </span>
          </div>
          {transformado && (
            <div className="v2-mut" style={{ fontSize: 12, padding: '2px 0' }}>
              Ativo: +1 de CA (exceto com armadura pesada), +{lycanMeleeDamageBonus(character)} no
              dano corpo a corpo, golpe desarmado {lycanUnarmedDie(character)} cortante,
              resistência a concussão, perfurante e cortante não-mágicos, e vulnerabilidade a prata.
            </div>
          )}
        </>
      )}

      {maldito && (
        <>
          <div className="v2-title" style={{ marginTop: 4 }}>Sangue Maldito</div>
          <div className="v2-row">
            <span>
              Invocar maldição de sangue
              <span className="v2-mut" style={{ marginLeft: 6, fontSize: 11 }}>
                descanso curto ou longo
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="v2-chip">{malditoRestantes}/{maldito.max}</span>
              <button
                type="button"
                className="v2-btn"
                disabled={readOnly || malditoRestantes <= 0}
                aria-label="Gastar um uso de Sangue Maldito"
                onClick={() => onSpend?.(maldito.id)}
              >
                Usar
              </button>
              <button
                type="button"
                className="v2-btn"
                disabled={readOnly || (maldito.used ?? 0) <= 0}
                aria-label="Recuperar um uso de Sangue Maldito"
                onClick={() => onRegain?.(maldito.id)}
              >
                ↺
              </button>
            </span>
          </div>
        </>
      )}

      {ehMutante && (
        <>
          <div className="v2-title" style={{ marginTop: 4 }}>Mutagênicos</div>
          <div className="v2-mut" style={{ fontSize: 12, padding: '2px 0' }}>
            Nível de mutação {nivelMutacao}. Duram até o fim do próximo descanso.
          </div>
          {formulas.length === 0 && (
            <div className="v2-mut" style={{ fontSize: 13, padding: '4px 0' }}>
              Nenhuma fórmula conhecida. Escolha suas fórmulas na progressão de nível.
            </div>
          )}
          {formulas.map(chave => {
            const m = MUTAGENS[chave]
            const ativo = ativosMut.includes(chave)
            return (
              <div className="v2-row" key={chave}>
                <span style={{ minWidth: 0 }}>
                  {m.name}
                  <span className="v2-mut" style={{ marginLeft: 6, fontSize: 11 }}>
                    {ativo ? m.sideEffect : m.effect}
                  </span>
                </span>
                <button
                  type="button"
                  className="v2-btn"
                  disabled={readOnly}
                  aria-label={ativo ? `Expelir ${m.name}` : `Beber ${m.name}`}
                  onClick={() => alternarMutagenico(chave)}
                >
                  {ativo ? 'Expelir' : 'Beber'}
                </button>
              </div>
            )
          })}
        </>
      )}

      {ehAlmaProfana && (
        <>
          <div className="v2-title" style={{ marginTop: 4 }}>Magia de Pacto</div>
          <div className="v2-mut" style={{ fontSize: 12, padding: '2px 0' }}>
            CD {profaneSoulSaveDC(character)} · ataque +{profaneSoulAttackBonus(character)} ·
            {' '}conjura por Sabedoria · {profaneSoulCantrips(character)} truques e
            {' '}{profaneSoulSpellsKnown(character)} magias conhecidas
            {pacto ? ` · ${pacto.qty} espaço(s) de ${pacto.slotLevel}º` : ''}
          </div>
          {patrono && PATRONS[patrono] && (
            <div className="v2-row">
              <span style={{ minWidth: 0 }}>
                {PATRONS[patrono].name}
                <span className="v2-mut" style={{ marginLeft: 6, fontSize: 11 }}>
                  {PATRONS[patrono].riteFocus}
                </span>
              </span>
            </div>
          )}
          {!patrono && (
            <div className="v2-mut" style={{ fontSize: 13, padding: '4px 0' }}>
              Nenhum patrono escolhido. Escolha o seu na progressão de nível.
            </div>
          )}
        </>
      )}

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

export default BloodHunterPanel
