import { RollButton } from '../../../../components/DiceRoller/RollButton'
import { getModifier, formatModifier, getProficiencyBonus } from '../../utils/calculations'

/**
 * Painel do Bruxo (PHB p.106-110).
 *
 * Cobre:
 *  - Patrono (nv 1): badge informativo (Feérico/Infernal/Grande Antigo)
 *  - Pacto Mágico (nv 1): slots especiais já tracked em spellcasting.pactSlotsUsed
 *    (mostra contagem aqui pra visibilidade)
 *  - Bênção Pact (nv 3):
 *    - Lâmina: rolagem rápida de ataque com CHA mod (arma pact)
 *    - Tomo: passivo (3 truques de qualquer lista)
 *    - Corrente: passivo (familiar especial)
 *  - Invocações Místicas (nv 2+): badges com efeitos passivos comuns
 *  - Arcano Místico (nv 11+): badges informativos por nível
 */

const PATRON_LABEL = {
  feerico:        'O Feérico',
  infernal:       'O Infernal',
  grande_antigo:  'O Grande Antigo',
  insondavel:     'O Insondável',       // Tasha
  genio:          'O Gênio',            // Tasha
  hexblade:       'O Lâmina Maldita',   // Xanathar
  celestial:      'O Celestial',        // Xanathar
}

const PATRON_ICON = {
  feerico: '🍄', infernal: '🔥', grande_antigo: '🐙',
  insondavel: '🌊', genio: '🧞', hexblade: '🗡', celestial: '😇',
}

const BOON_LABEL = {
  lamina:   'Pacto da Lâmina',
  tomo:     'Pacto do Tomo',
  corrente: 'Pacto da Corrente',
}

// Algumas invocações comuns que afetam combate — labels curtos
const INVOCATION_HINTS = {
  forca_agonizante:    { icon: '💥', name: 'Força Agonizante',   note: '+CHA mod no dano de Eldritch Blast' },
  blast_repelente:     { icon: '💨', name: 'Blast Repelente',    note: 'Empurra alvo 3m com Eldritch Blast' },
  lanca_eldritch:      { icon: '🎯', name: 'Lança Eldritch',     note: 'Alcance Eldritch Blast 90m' },
  visao_do_diabo:      { icon: '👁', name: 'Visão do Diabo',     note: 'Vê em escuridão mágica' },
  vigor_infernal:      { icon: '🦴', name: 'Vigor Infernal',     note: 'Recupera HP no início do turno se < HP/2' },
  fala_das_bestas:     { icon: '🐺', name: 'Fala das Bestas',    note: 'Comungar com bestas como ritual' },
  visao_eldritch:      { icon: '🔮', name: 'Visão Eldritch',     note: 'Detectar Magia à vontade' },
}

// Arcano Místico: 1 magia escolhida por nível-faixa, 1×/desc longo
const ARCANUM_TIERS = [
  { level: 11, slot: 6 },
  { level: 13, slot: 7 },
  { level: 15, slot: 8 },
  { level: 17, slot: 9 },
]

/* ── Pacto da Lâmina ─────────────────────────────────────────── */
function BladePactPanel({ totalLevel, attributes, patron }) {
  // PHB/Tasha: a arma de pacto é uma arma comum — ataque/dano usam Força ou
  // Destreza (a melhor; Destreza vale quando a forma escolhida tem acuidade).
  // O Guerreiro Maldito (Hexblade, Xanathar) permite usar Carisma na arma de pacto.
  const isHexblade = patron === 'hexblade'
  const mods = [getModifier(attributes?.str ?? 10), getModifier(attributes?.dex ?? 10)]
  if (isHexblade) mods.push(getModifier(attributes?.cha ?? 10))
  const best = Math.max(...mods)
  const profBonus = getProficiencyBonus(totalLevel)
  const atk = `1d20${formatModifier(profBonus + best)}`
  const abilityNote = isHexblade
    ? 'Força, Destreza ou Carisma (Guerreiro Maldito) — a melhor'
    : 'Força ou Destreza (a melhor)'

  return (
    <div className="flex items-center gap-2 bg-violet-100 rounded px-2 py-1.5 border border-violet-700/30">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-violet-900">🗡 Pacto da Lâmina</p>
        <p className="text-xs ink-italic">
          Arma de pacto usa {abilityNote} pra ataque/dano. Rolar ataque rápido: {atk}.
        </p>
      </div>
      <span className="text-base font-bold text-violet-900 font-mono">{atk}</span>
      <RollButton notation={atk} label="Pacto da Lâmina (ataque)" />
    </div>
  )
}

/* ── Componente principal ────────────────────────────────────── */
export function WarlockPactPanel({ bruxoLevel, character }) {
  if (!bruxoLevel || bruxoLevel < 1) return null

  const chosen = character.info?.chosenFeatures ?? {}
  const patron = chosen.patron
  const boon = chosen.pact_boon
  const invocations = chosen.eldritch_invocations
  const invList = Array.isArray(invocations) ? invocations : (invocations ? [invocations] : [])
  const attributes = character.attributes ?? {}
  // Bônus de proficiência vem do nível TOTAL do personagem (não só de bruxo),
  // pra não subestimar o ataque em multiclasse.
  const totalLevel = character.info?.level ?? bruxoLevel

  const arcanumTiers = ARCANUM_TIERS.filter(t => bruxoLevel >= t.level)

  return (
    <div className="rounded-lg border-2 border-violet-700/60 bg-violet-50/60 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-2xl shrink-0" aria-hidden>{PATRON_ICON[patron] ?? '✨'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-display text-violet-900 tracking-wide">
            {patron ? PATRON_LABEL[patron] : 'Bruxo'}
            {boon && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded border border-violet-700 bg-violet-100 text-violet-900 font-bold normal-case tracking-normal">
                {BOON_LABEL[boon]}
              </span>
            )}
          </p>
          <p className="text-xs ink-italic">
            Patrono define magias adicionais. Pacto define bênção (Lâmina/Tomo/Corrente).
          </p>
        </div>
      </div>

      {/* Pacto da Lâmina — botão de ataque rápido */}
      {boon === 'lamina' && bruxoLevel >= 3 && (
        <div className="pt-2 border-t border-violet-700/30">
          <BladePactPanel totalLevel={totalLevel} attributes={attributes} patron={patron} />
        </div>
      )}

      {/* Pacto do Tomo / Corrente — info passiva */}
      {boon === 'tomo' && bruxoLevel >= 3 && (
        <div className="pt-2 border-t border-violet-700/30">
          <p className="text-xs ink-italic">
            📖 <strong>Pacto do Tomo</strong>: 3 truques de qualquer lista no Livro das Sombras, conjuráveis à vontade enquanto possuir o livro. Perda → ritual de 1h pra recriar.
          </p>
        </div>
      )}
      {boon === 'corrente' && bruxoLevel >= 3 && (
        <div className="pt-2 border-t border-violet-700/30">
          <p className="text-xs ink-italic">
            🔗 <strong>Pacto da Corrente</strong>: familiar especial (imp/pseudodragão/quasit/sprite). Pode usar reação pra fazer o familiar atacar (em vez de você).
          </p>
        </div>
      )}

      {/* Invocações Místicas conhecidas */}
      {invList.length > 0 && (
        <div className="pt-2 border-t border-violet-700/30 space-y-1">
          <p className="text-xs uppercase tracking-widest font-bold text-violet-900">
            Invocações Místicas ({invList.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {invList.map(inv => {
              const hint = INVOCATION_HINTS[inv]
              if (hint) {
                return (
                  <span
                    key={inv}
                    title={hint.note}
                    className="text-xs px-2 py-0.5 rounded border border-violet-700 bg-violet-100 text-violet-900 font-bold"
                  >
                    {hint.icon} {hint.name}
                  </span>
                )
              }
              return (
                <span
                  key={inv}
                  className="text-xs px-2 py-0.5 rounded border border-violet-700/50 bg-violet-50 text-violet-900"
                >
                  {inv.replace(/_/g, ' ')}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Arcano Místico — passivo informativo */}
      {arcanumTiers.length > 0 && (
        <div className="pt-2 border-t border-violet-700/30">
          <p className="text-xs uppercase tracking-widest font-bold text-violet-900 mb-1">
            🌟 Arcano Místico
          </p>
          <p className="text-xs ink-italic">
            Magias escolhidas conjuradas 1×/desc. longo SEM gastar slot de pacto:
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {arcanumTiers.map(t => (
              <span
                key={t.slot}
                className="text-xs px-2 py-0.5 rounded border border-violet-700 bg-violet-100 text-violet-900 font-bold"
              >
                Nv {t.level}: magia de slot {t.slot}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
