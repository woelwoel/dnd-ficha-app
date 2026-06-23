import { useState } from 'react'
import { RollButton } from '../../../../components/DiceRoller/RollButton'
import { useDiceRoller } from '../../../../hooks/useDiceRoller'

/**
 * Painel de features de Domínio do Clérigo (PHB p.60-63).
 *
 * Domínios cobertos com features ativas:
 *  - Vida: Discípulo da Vida (passivo), Preservar Vida (CD nv 2, 5×nv distribuído)
 *  - Guerra: Ataque Bélico Bônus (nv 1, reação 1×/desc curto+CHA), Bênção Bélica (CD nv 2)
 *  - Luz: Repreensão Radiante (CD nv 2, reação 2d10+nv)
 *  - Tempestade: Investida Furiosa (nv 1, reação 2d8, CHA mod /desc longo)
 *  - Natureza: passivo (encantar besta com CD)
 *  - Conhecimento/Engano: passivos (CDs informativos)
 *
 * Channel Divinity já é tracked como recurso genérico; aqui adicionamos
 * BOTÕES de cada efeito específico que GASTA o CD.
 */

const DOMAIN_LABEL = {
  vida:        'Domínio da Vida',
  guerra:      'Domínio da Guerra',
  luz:         'Domínio da Luz',
  tempestade:  'Domínio da Tempestade',
  natureza:    'Domínio da Natureza',
  conhecimento:'Domínio do Conhecimento',
  enganacao:   'Domínio do Engano',
}

const DOMAIN_ICON = {
  vida: '❤️', guerra: '⚔', luz: '☀', tempestade: '⚡',
  natureza: '🌿', conhecimento: '📜', enganacao: '🎭',
}

/* ── Preservar Vida (Vida) ────────────────────────────────────── */
function LifeDomainPanel({ clericoLevel, cdUse, onSpend, attributes }) {
  const [targets, setTargets] = useState('')
  const cdRemaining = cdUse ? cdUse.max - (cdUse.used ?? 0) : 0
  const healPool = 5 * clericoLevel
  const wisMod = Math.floor(((attributes?.wis ?? 10) - 10) / 2)

  function usePreserveLife() {
    if (cdRemaining <= 0 || !cdUse) return
    onSpend?.(cdUse.id)
    setTargets('')
  }

  return (
    <div className="pt-2 border-t border-rose-700/30 space-y-1">
      <p className="text-xs font-bold text-rose-900">❤️ Discípulo da Vida (passivo)</p>
      <p className="text-xs ink-italic">
        Quando conjura magia de cura de nv 1+, a criatura recebe HP adicional = 2 + nv da magia.
      </p>

      <div className="flex items-center gap-2 bg-rose-100 rounded px-2 py-1.5 border border-rose-700/30 mt-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-rose-900">Preservar Vida (CD)</p>
          <p className="text-xs ink-italic">
            Distribui até <strong>{healPool}</strong> PV entre criaturas a 9m (cada ≤ HP/2). Não revive.
          </p>
        </div>
        <button
          onClick={usePreserveLife}
          disabled={cdRemaining <= 0}
          className={`text-xs px-3 py-1.5 rounded border-2 font-bold transition-all shrink-0 ${
            cdRemaining <= 0
              ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
              : 'border-rose-700 bg-rose-100 text-rose-900 hover:bg-rose-200'
          }`}
          title={cdRemaining <= 0 ? 'Sem CD disponível' : `Gasta 1 CD pra distribuir ${healPool} PV`}
        >
          Usar CD
        </button>
      </div>
    </div>
  )
}

/* ── Domínio da Guerra ───────────────────────────────────────── */
function WarDomainPanel({ clericoLevel, cdUse, onSpend, featureUses, attributes }) {
  const wisMod = Math.max(1, Math.floor(((attributes?.wis ?? 10) - 10) / 2))
  const warPriest = featureUses?.find(u => u.id === 'clerigo-war-priest')
  const wpRemaining = warPriest ? warPriest.max - (warPriest.used ?? 0) : 0
  const cdRemaining = cdUse ? cdUse.max - (cdUse.used ?? 0) : 0

  return (
    <div className="pt-2 border-t border-amber-700/30 space-y-1">
      {warPriest && (
        <div className="flex items-center gap-2 bg-amber-100 rounded px-2 py-1.5 border border-amber-700/30">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-900">⚔ Ataque Bélico Bônus</p>
            <p className="text-xs ink-italic">
              Após Ataque, faz +1 ataque como ação bônus. Restantes: {wpRemaining}/{warPriest.max}.
            </p>
          </div>
          <button
            onClick={() => onSpend?.(warPriest.id)}
            disabled={wpRemaining <= 0}
            className={`text-xs px-3 py-1.5 rounded border-2 font-bold transition-all shrink-0 ${
              wpRemaining <= 0
                ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                : 'border-amber-700 bg-amber-100 text-amber-900 hover:bg-amber-200'
            }`}
          >
            Usar
          </button>
        </div>
      )}

      {clericoLevel >= 2 && (
        <div className="flex items-center gap-2 bg-amber-100 rounded px-2 py-1.5 border border-amber-700/30">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-900">Bênção Bélica (CD)</p>
            <p className="text-xs ink-italic">
              Como ação bônus, dá +10 em jogada de ataque pra criatura (incluindo você). Dura até decisão.
            </p>
          </div>
          <button
            onClick={() => onSpend?.(cdUse?.id)}
            disabled={cdRemaining <= 0}
            className={`text-xs px-3 py-1.5 rounded border-2 font-bold transition-all shrink-0 ${
              cdRemaining <= 0
                ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                : 'border-amber-700 bg-amber-100 text-amber-900 hover:bg-amber-200'
            }`}
          >
            Usar CD
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Domínio da Luz ──────────────────────────────────────────── */
function LightDomainPanel({ clericoLevel, cdUse, onSpend, attributes }) {
  const { roll, openPanel } = useDiceRoller()
  const cdRemaining = cdUse ? cdUse.max - (cdUse.used ?? 0) : 0
  const wisMod = Math.max(0, Math.floor(((attributes?.wis ?? 10) - 10) / 2))
  const lureRolls = `2d10+${clericoLevel}`

  function useFlare() {
    if (cdRemaining <= 0 || !cdUse) return
    onSpend?.(cdUse.id)
  }

  function useRadiance() {
    if (cdRemaining <= 0 || !cdUse) return
    onSpend?.(cdUse.id)
    roll(lureRolls, 'Repreensão Radiante (dano)')
    openPanel()
  }

  return (
    <div className="pt-2 border-t border-yellow-700/30 space-y-1">
      <div className="flex items-center gap-2 bg-yellow-100 rounded px-2 py-1.5 border border-yellow-700/30">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-yellow-900">☀ Lampejo Protetor</p>
          <p className="text-xs ink-italic">
            Reação após criatura ser atacada: ataque ganha desvantagem. {Math.max(1, wisMod)}×/desc longo.
          </p>
        </div>
        <button
          onClick={useFlare}
          className="text-xs px-3 py-1.5 rounded border-2 border-yellow-700 bg-yellow-100 text-yellow-900 hover:bg-yellow-200 font-bold transition-colors"
        >
          Marcar uso
        </button>
      </div>

      {clericoLevel >= 2 && (
        <div className="flex items-center gap-2 bg-yellow-100 rounded px-2 py-1.5 border border-yellow-700/30">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-yellow-900">Repreensão Radiante (CD)</p>
            <p className="text-xs ink-italic">
              Apresenta símbolo sagrado. Cada criatura visível a 9m faz TR de Constituição CD = sua CD de magia. Falha = {lureRolls} de dano radiante.
            </p>
          </div>
          <button
            onClick={useRadiance}
            disabled={cdRemaining <= 0}
            className={`text-xs px-3 py-1.5 rounded border-2 font-bold transition-all shrink-0 ${
              cdRemaining <= 0
                ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                : 'border-yellow-700 bg-yellow-100 text-yellow-900 hover:bg-yellow-200'
            }`}
          >
            Rolar + CD
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Domínio da Tempestade ───────────────────────────────────── */
function TempestDomainPanel({ clericoLevel, featureUses, onSpend }) {
  const { roll, openPanel } = useDiceRoller()
  const wrath = featureUses?.find(u => u.id === 'clerigo-wrath-of-storm')
  const wRemaining = wrath ? wrath.max - (wrath.used ?? 0) : 0

  function useWrath() {
    if (wRemaining <= 0 || !wrath) return
    onSpend?.(wrath.id)
    roll('2d8', 'Investida Furiosa — dano (frio/elétrico/trovão)')
    openPanel()
  }

  return (
    <div className="pt-2 border-t border-sky-700/30 space-y-1">
      {wrath && (
        <div className="flex items-center gap-2 bg-sky-100 rounded px-2 py-1.5 border border-sky-700/30">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-sky-900">⚡ Investida Furiosa</p>
            <p className="text-xs ink-italic">
              Reação após criatura a 1,5m te atacar: 2d8 de dano (frio/elétrico/trovão) com TR de Destreza CD magia (sucesso = metade). Restantes: {wRemaining}/{wrath.max}.
            </p>
          </div>
          <button
            onClick={useWrath}
            disabled={wRemaining <= 0}
            className={`text-xs px-3 py-1.5 rounded border-2 font-bold transition-all shrink-0 ${
              wRemaining <= 0
                ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                : 'border-sky-700 bg-sky-100 text-sky-900 hover:bg-sky-200'
            }`}
          >
            Rolar 2d8
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Componente principal ────────────────────────────────────── */
export function ClericDomainPanel({ clericoLevel, character, featureUses, onSpend }) {
  if (clericoLevel < 1) return null

  const domain = character.info?.chosenFeatures?.divine_domain
  if (!domain) return null

  const cdUse = featureUses?.find(u => u.id === 'clerigo-channel-divinity')
  const attributes = character.attributes ?? {}

  return (
    <div className="rounded-lg border-2 border-amber-700/60 bg-amber-50/60 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-2xl shrink-0" aria-hidden>{DOMAIN_ICON[domain] ?? '✨'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-display text-amber-900 tracking-wide">
            {DOMAIN_LABEL[domain] ?? domain}
          </p>
          <p className="text-xs ink-italic">
            Features ativas do domínio. Canalizar Divindade compartilhada com o tracker geral.
          </p>
        </div>
      </div>

      {domain === 'vida'        && <LifeDomainPanel    clericoLevel={clericoLevel} cdUse={cdUse} onSpend={onSpend} attributes={attributes} />}
      {domain === 'guerra'      && <WarDomainPanel     clericoLevel={clericoLevel} cdUse={cdUse} onSpend={onSpend} featureUses={featureUses} attributes={attributes} />}
      {domain === 'luz'         && <LightDomainPanel   clericoLevel={clericoLevel} cdUse={cdUse} onSpend={onSpend} attributes={attributes} />}
      {domain === 'tempestade'  && <TempestDomainPanel clericoLevel={clericoLevel} featureUses={featureUses} onSpend={onSpend} />}

      {/* Domínios sem painel ativo dedicado — info inline */}
      {(domain === 'natureza' || domain === 'conhecimento' || domain === 'enganacao') && (
        <div className="pt-2 border-t border-amber-700/30 space-y-0.5">
          {domain === 'natureza' && (
            <p className="text-xs ink-italic">
              🌿 <strong>Encantar Animais e Plantas (CD)</strong>: cada besta/vegetal a 9m faz TR de Sabedoria. Falha = encantada por 1 min ou até dano.
            </p>
          )}
          {domain === 'conhecimento' && (
            <p className="text-xs ink-italic">
              📜 <strong>Bênção do Conhecimento (CD)</strong>: escolhe 2 perícias dentre Arcanismo/História/Natureza/Religião. Você fica proficiente e tem expertise nelas.
            </p>
          )}
          {domain === 'enganacao' && (
            <p className="text-xs ink-italic">
              🎭 <strong>Invocar Duplicata (CD)</strong>: cria 3 ilusões suas a 9m, dura 1 min. Você troca de posição com elas (sem ação) e usam ações idênticas. Conjuração: ação.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
