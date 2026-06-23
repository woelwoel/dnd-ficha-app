import { useState } from 'react'
import { RollButton } from '../../../../components/DiceRoller/RollButton'

/**
 * Painel do Patrulheiro (PHB p.91-94).
 *
 * Cobre:
 *  - Inimigo Favorito (nv 1) — passivo, badge informativo do tipo escolhido
 *  - Estilo de Luta (nv 2) — passivo, badge informativo
 *  - Caçador (Hunter):
 *    - Presa do Caçador (nv 3): Matador de Colosso (botão +1d8) / Caçador
 *      de Hordas (passivo +1) / Assassino de Gigantes (passivo)
 *    - Táticas Defensivas (nv 7): passivos
 *  - Mestre das Bestas:
 *    - Companheiro Animal (nv 3): tracker simples nome + HP
 */

const FAVORED_ENEMY_LABEL = {
  aberracoes:    'Aberrações',
  bestas:        'Bestas',
  celestiais:    'Celestiais',
  construtos:    'Construtos',
  draconicos:    'Dracônicos',
  elementais:    'Elementais',
  fadas:         'Fadas',
  gigantes:      'Gigantes',
  humanoides:    'Humanóides',
  lamas:         'Lamas',
  monstrosidades:'Monstruosidades',
  mortos_vivos:  'Mortos-vivos',
  plantas:       'Plantas',
}

const FIGHTING_STYLE_LABEL = {
  arqueiro:  'Arqueiro (+2 ataques à distância)',
  defesa:    'Defesa (+1 AC com armadura)',
  duelo:     'Duelo (+2 dano com arma de uma mão)',
  duas_maos: 'Combate com Duas Armas (+mod no off-hand)',
}

const HUNTERS_PREY_LABEL = {
  matador_colosso:    'Matador de Colosso',
  cacador_horda:      'Caçador de Hordas',
  assassino_gigante:  'Assassino de Gigantes',
}

const DEFENSIVE_TACTICS_LABEL = {
  manada_furiosa:  'Manada Furiosa — vantagem em TR contra amedrontamento',
  ataque_multiplo: 'Ataque Múltiplo — desvantagem em ataques contra você se múltiplos a 1,5m',
  esquiva_provada: 'Veredas Espinhosas — 1d6 corte em quem te ferir',
}

/* ── Companheiro Animal (Mestre das Bestas) ──────────────────── */
function CompanionPanel({ character, onUpdateCompanion }) {
  const c = character.combat?.rangerCompanion ?? { name: '', currentHp: 0, maxHp: 0, ac: 13 }
  const [draft, setDraft] = useState({ name: c.name || '', maxHp: c.maxHp || '', ac: c.ac || 13 })
  const [editing, setEditing] = useState(!c.name)

  function save() {
    const max = parseInt(draft.maxHp, 10) || 0
    if (!draft.name.trim() || max <= 0) return
    onUpdateCompanion({
      name: draft.name.trim(),
      maxHp: max,
      currentHp: c.currentHp > 0 && c.currentHp <= max ? c.currentHp : max,
      ac: parseInt(draft.ac, 10) || 13,
    })
    setEditing(false)
  }

  function adjustHp(delta) {
    const next = Math.max(0, Math.min(c.maxHp, c.currentHp + delta))
    onUpdateCompanion({ ...c, currentHp: next })
  }

  return (
    <div className="pt-2 border-t border-emerald-700/30 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xl shrink-0" aria-hidden>🐾</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-emerald-900">Companheiro Animal</p>
          <p className="text-xs ink-italic">
            Besta CR ≤ 1/4, Pequena ou menor. Age no seu turno; usa seu bônus de proficiência.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-2 py-1 rounded border border-parchment-600 bg-parchment-50 text-ink-500 hover:bg-parchment-200"
          >
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-1">
          <input
            type="text"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Nome da besta (ex: Lobo, Falcão)"
            className="w-full bg-parchment-50 border border-parchment-600 rounded px-2 py-1 text-xs text-ink-500 placeholder:text-ink-200"
          />
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={draft.maxHp}
              onChange={e => setDraft(d => ({ ...d, maxHp: e.target.value }))}
              placeholder="HP máx"
              className="flex-1 bg-parchment-50 border border-parchment-600 rounded px-2 py-1 text-xs text-ink-500 placeholder:text-ink-200"
            />
            <input
              type="number"
              value={draft.ac}
              onChange={e => setDraft(d => ({ ...d, ac: e.target.value }))}
              placeholder="AC"
              className="w-16 bg-parchment-50 border border-parchment-600 rounded px-2 py-1 text-xs text-ink-500 placeholder:text-ink-200"
            />
            <button
              onClick={save}
              disabled={!draft.name.trim() || !(parseInt(draft.maxHp, 10) > 0)}
              className="text-xs px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 disabled:bg-parchment-200 disabled:text-ink-200 text-white font-bold"
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-emerald-100 rounded px-2 py-1.5 border border-emerald-700/30">
          <span className="text-sm font-bold text-emerald-900 flex-1 truncate">{c.name}</span>
          <span className="text-xs font-mono text-emerald-900/80">AC {c.ac}</span>
          <button
            onClick={() => adjustHp(-1)}
            className="w-7 h-7 rounded bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-bold"
          >−</button>
          <span className="font-mono text-sm text-emerald-900 min-w-[5ch] text-center font-bold">
            {c.currentHp}/{c.maxHp}
          </span>
          <button
            onClick={() => adjustHp(+1)}
            className="w-7 h-7 rounded bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-bold"
          >+</button>
        </div>
      )}
    </div>
  )
}

/* ── Componente principal ────────────────────────────────────── */
export function RangerPanel({ ranger, character, onUpdateCompanion }) {
  if (!ranger || ranger < 1) return null

  const chosen = character.info?.chosenFeatures ?? {}
  // Inimigos favoritos vêm de 3 escolhas por nível (1º, 6º e 14º — PHB p.91).
  const favoredEnemies = [
    chosen.favored_enemy, chosen.favored_enemy_6, chosen.favored_enemy_14,
  ].filter(Boolean)
  const fightStyle   = chosen.fighting_style_ranger
  const archetype    = chosen.ranger_archetype
  const huntersPrey  = chosen.patrulheiro_hunters_prey
  const defensive    = chosen.patrulheiro_defensive_tactics

  const isHunter = archetype === 'cacador'
  const isBeastMaster = archetype === 'mestre_das_bestas'

  return (
    <div className="rounded-lg border-2 border-emerald-700/60 bg-emerald-50/60 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-2xl shrink-0" aria-hidden>🏹</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-display text-emerald-900 tracking-wide">Recursos de Patrulheiro</p>
          <p className="text-xs ink-italic">
            Inimigos favoritos, estilo de luta e features de arquétipo.
          </p>
        </div>
      </div>

      {/* Inimigo Favorito + Estilo de Luta — badges */}
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-emerald-700/30">
        {favoredEnemies.map(fav => (
          <span key={fav} className="text-xs px-2 py-0.5 rounded-full border border-emerald-700 bg-emerald-100 text-emerald-900 font-bold">
            🎯 Inimigo: {FAVORED_ENEMY_LABEL[fav] ?? fav}
          </span>
        ))}
        {fightStyle && ranger >= 2 && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-700 bg-emerald-100 text-emerald-900 font-bold">
            ⚔ {FIGHTING_STYLE_LABEL[fightStyle] ?? fightStyle}
          </span>
        )}
      </div>

      {/* Presa do Caçador */}
      {isHunter && ranger >= 3 && huntersPrey && (
        <div className="pt-2 border-t border-emerald-700/30 space-y-1">
          <p className="text-xs font-bold text-emerald-900">
            🩸 Presa do Caçador: {HUNTERS_PREY_LABEL[huntersPrey] ?? huntersPrey}
          </p>
          {huntersPrey === 'matador_colosso' && (
            <div className="flex items-center gap-2 bg-emerald-100 rounded px-2 py-1.5 border border-emerald-700/30">
              <p className="text-xs text-emerald-900 flex-1">
                Quando acertar alvo abaixo do HP máximo, rola +1d8 dano (1×/turno).
              </p>
              <span className="text-base font-bold text-emerald-900 font-mono">1d8</span>
              <RollButton notation="1d8" label="Matador de Colosso (dano extra)" />
            </div>
          )}
          {huntersPrey === 'cacador_horda' && (
            <p className="text-xs ink-italic">
              Passivo: 1×/turno, faz um ataque adicional com a mesma arma contra outro alvo no alcance (5 pés ou tiro).
            </p>
          )}
          {huntersPrey === 'assassino_gigante' && (
            <p className="text-xs ink-italic">
              Passivo: reação após criatura Grande+ errar ataque c/c contra você — faz um ataque c/c gratuito nela.
            </p>
          )}
        </div>
      )}

      {/* Táticas Defensivas */}
      {isHunter && ranger >= 7 && defensive && (
        <div className="pt-2 border-t border-emerald-700/30">
          <p className="text-xs font-bold text-emerald-900">
            🛡️ Táticas Defensivas: {(DEFENSIVE_TACTICS_LABEL[defensive] ?? defensive).split(' — ')[0]}
          </p>
          <p className="text-xs ink-italic">
            {(DEFENSIVE_TACTICS_LABEL[defensive] ?? defensive).split(' — ')[1]}
          </p>
        </div>
      )}

      {/* Companheiro Animal */}
      {isBeastMaster && ranger >= 3 && (
        <CompanionPanel character={character} onUpdateCompanion={onUpdateCompanion} />
      )}
    </div>
  )
}
