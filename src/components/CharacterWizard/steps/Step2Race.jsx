// Passo 2 — Raça
import { useState } from 'react'
import { ABBR_TO_KEY, ABILITY_SCORES, SKILLS } from '../../../utils/calculations'
import { DetailsModal } from '../../DetailsModal'
import { TopicList, FullDescriptionToggle } from '../../TopicList'
import { DRACONIC_ANCESTORS } from '../../../utils/draconicAncestors'

const MAGO_CANTRIPS = [
  'Amizade', 'Ataque Certeiro', 'Consertar', 'Espirro Ácido',
  'Globos De Luz', 'Ilusão Menor', 'Luz', 'Mensagem',
  'Mãos Mágicas', 'Prestidigitação', 'Proteção Contra Lâminas',
  'Raio De Fogo', 'Raio De Gelo', 'Rajada De Veneno',
  'Toque Arrepiante', 'Toque Chocante',
]


export function Step2Race({ draft, updateDraft, races }) {
  const [modal, setModal] = useState(null) // 'race' | 'subrace' | null

  const selectedRace    = races.find(r => r.index === draft.race)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === draft.subrace)

  // Detecta quais escolhas raciais são necessárias
  const isHumanVariant    = draft.subrace === 'tracos-raciais-alternativos'
  const isMeioElfo        = draft.race === 'meio-elfo'
  const isDraconato       = draft.race === 'draconato'
  const isAltoElfo        = draft.subrace === 'alto-elfo'

  // Bônus combinados raça + sub-raça para preview (excluindo "2 à escolha")
  const allBonuses = [
    ...(selectedRace?.ability_bonuses ?? []),
    ...(selectedSubrace?.ability_bonuses ?? []),
  ].filter(b => !b.ability.includes('escolha'))

  function handleRaceChange(raceIndex) {
    const race = races.find(r => r.index === raceIndex)
    const bonuses = computeBonuses(race, null, [])
    updateDraft({
      race: raceIndex,
      subrace: '',
      racialBonuses: bonuses,
      racialAbilityChoices: [],
      racialSkills: [],
      draconicAncestry: '',
      racialCantrip: '',
    })
  }

  function handleSubraceChange(subraceIndex) {
    const race    = races.find(r => r.index === draft.race)
    const subrace = race?.subraces?.find(sr => sr.index === subraceIndex)
    const bonuses = computeBonuses(race, subrace, [])
    updateDraft({
      subrace: subraceIndex,
      racialBonuses: bonuses,
      racialAbilityChoices: [],
      racialSkills: [],
      racialCantrip: '',
    })
  }

  function handleAbilityChoiceToggle(attrKey, maxCount) {
    const prev = draft.racialAbilityChoices ?? []
    const next = prev.includes(attrKey)
      ? prev.filter(k => k !== attrKey)
      : prev.length < maxCount ? [...prev, attrKey] : prev
    const race    = races.find(r => r.index === draft.race)
    const subrace = race?.subraces?.find(sr => sr.index === draft.subrace)
    updateDraft({
      racialAbilityChoices: next,
      racialBonuses: computeBonuses(race, subrace, next),
    })
  }

  function handleSkillToggle(skillKey, maxCount) {
    const prev = draft.racialSkills ?? []
    const next = prev.includes(skillKey)
      ? prev.filter(k => k !== skillKey)
      : prev.length < maxCount ? [...prev, skillKey] : prev
    updateDraft({ racialSkills: next })
  }

  const fieldCls = 'w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400'

  // Quais atributos o Meio-Elfo pode escolher (exceto CHA que já é fixo)
  const meioElfoExclude = new Set(['cha'])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-amber-400 mb-1">Raça</h2>
        <p className="text-sm text-gray-400">Escolha a origem racial do seu personagem.</p>
      </div>

      {/* Seletor de raça */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Raça <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={draft.race}
            onChange={e => handleRaceChange(e.target.value)}
            className={fieldCls}
          >
            <option value="">Escolher raça...</option>
            {races.map(r => (
              <option key={r.index} value={r.index}>{r.name}</option>
            ))}
          </select>
          {selectedRace && (
            <button
              onClick={() => setModal('race')}
              className="px-3 py-2 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm shrink-0"
              title="Ver detalhes da raça"
            >
              ?
            </button>
          )}
        </div>
      </div>

      {/* Sub-raça condicional */}
      {selectedRace?.subraces?.length > 0 && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Sub-raça{' '}
            {selectedRace.optionalSubrace
              ? <span className="text-gray-500">(opcional)</span>
              : <span className="text-red-400">*</span>}
          </label>
          <div className="flex gap-2">
            <select
              value={draft.subrace}
              onChange={e => handleSubraceChange(e.target.value)}
              className={fieldCls}
            >
              <option value="">{selectedRace.optionalSubrace ? 'Nenhuma (raça base)' : 'Escolher sub-raça...'}</option>
              {selectedRace.subraces.map(sr => (
                <option key={sr.index} value={sr.index}>{sr.name}</option>
              ))}
            </select>
            {selectedSubrace && (
              <button
                onClick={() => setModal('subrace')}
                className="px-3 py-2 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm shrink-0"
                title="Ver traços da sub-raça"
              >
                ?
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Ancestral Dracônico (Draconato) ── */}
      {isDraconato && (
        <div className="bg-gray-800 border border-amber-800/40 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
            Ancestral Dracônico <span className="text-red-400">*</span>
          </p>
          <p className="text-[11px] text-gray-400">
            Escolha o tipo de dragão que define sua arma de sopro e resistência a dano.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {DRACONIC_ANCESTORS.map(a => {
              const sel = draft.draconicAncestry === a.value
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => updateDraft({ draconicAncestry: a.value })}
                  className={`text-left px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                    sel
                      ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                      : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
                  }`}
                >
                  <span className="font-semibold block">{a.label}</span>
                  <span className="text-[10px] text-gray-500">{a.damage} · {a.breath} (TR {a.save})</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Truque de Mago (Alto Elfo) ── */}
      {isAltoElfo && (
        <div className="bg-gray-800 border border-amber-800/40 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
            Truque de Mago <span className="text-red-400">*</span>
          </p>
          <p className="text-[11px] text-gray-400">
            Você conhece 1 truque da lista de magias do Mago (Inteligência como habilidade de conjuração).
          </p>
          <select
            value={draft.racialCantrip ?? ''}
            onChange={e => updateDraft({ racialCantrip: e.target.value })}
            className={fieldCls}
          >
            <option value="">Escolher truque...</option>
            {MAGO_CANTRIPS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Bônus de Atributo Livre (Humano Variante: 2 attrs; Meio-Elfo: 2 attrs exceto CHA) ── */}
      {(isHumanVariant || isMeioElfo) && (
        <FreeAbilityPicker
          label={isHumanVariant
            ? 'Escolha 2 atributos para receber +1 cada'
            : 'Escolha 2 atributos (exceto Carisma) para receber +1 cada'}
          count={2}
          chosen={draft.racialAbilityChoices ?? []}
          exclude={isMeioElfo ? meioElfoExclude : null}
          onToggle={k => handleAbilityChoiceToggle(k, 2)}
        />
      )}

      {/* ── Perícia Extra (Humano Variante: 1 perícia; Meio-Elfo: 2 perícias) ── */}
      {isHumanVariant && (
        <RacialSkillPicker
          label="Escolha 1 perícia (proficiência racial)"
          count={1}
          chosen={draft.racialSkills ?? []}
          onToggle={k => handleSkillToggle(k, 1)}
        />
      )}
      {isMeioElfo && (
        <RacialSkillPicker
          label="Escolha 2 perícias (Versatilidade em Perícia)"
          count={2}
          chosen={draft.racialSkills ?? []}
          onToggle={k => handleSkillToggle(k, 2)}
        />
      )}

      {/* ── Feat (Humano Variante) ── */}
      {isHumanVariant && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3">
          <p className="text-xs font-semibold text-amber-400 mb-1">Talento</p>
          <p className="text-[11px] text-gray-400">
            Humanos Variantes recebem 1 talento (feat) no 1° nível. Consulte seu Mestre ou a lista de talentos
            — registre na aba de Características após a criação do personagem.
          </p>
        </div>
      )}

      {/* Bônus de atributo fixos da raça */}
      {allBonuses.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-2">Bônus de atributo (aplicados automaticamente):</p>
          <div className="flex flex-wrap gap-2">
            {allBonuses.map((b, i) => (
              <span key={i} className="text-xs bg-amber-900/40 border border-amber-700 px-2.5 py-1 rounded-full text-amber-300 font-medium">
                +{b.bonus} {b.ability}
              </span>
            ))}
            {(isHumanVariant || isMeioElfo) && (
              <span className="text-xs bg-blue-900/40 border border-blue-700 px-2.5 py-1 rounded-full text-blue-300 font-medium">
                +1 em 2 atributos à escolha
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats rápidos da raça */}
      {selectedRace && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {selectedRace.size && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <p className="text-gray-500 mb-0.5">Tamanho</p>
              <p className="text-gray-200 font-medium">{selectedRace.size}</p>
            </div>
          )}
          {selectedRace.speed && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <p className="text-gray-500 mb-0.5">Deslocamento</p>
              <p className="text-gray-200 font-medium">{selectedRace.speed}m</p>
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      <DetailsModal isOpen={modal === 'race'} onClose={() => setModal(null)} title={selectedRace?.name ?? ''}>
        {selectedRace && <RaceDetails race={selectedRace} />}
      </DetailsModal>
      <DetailsModal isOpen={modal === 'subrace'} onClose={() => setModal(null)} title={selectedSubrace?.name ?? ''}>
        {selectedSubrace && <SubraceDetails subrace={selectedSubrace} />}
      </DetailsModal>
    </div>
  )
}

/* ── Picker de atributos livres ───────────────────────────────── */
function FreeAbilityPicker({ label, count, chosen, exclude, onToggle }) {
  const atLimit = chosen.length >= count
  return (
    <div className="bg-gray-800 border border-amber-800/40 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
        {label}{' '}
        <span className={`text-[10px] font-normal ${atLimit ? 'text-green-400' : 'text-amber-500'}`}>
          ({chosen.length}/{count})
        </span>
        {!atLimit && <span className="text-red-400 ml-1">*</span>}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {ABILITY_SCORES.map(({ key, name, abbr }) => {
          if (exclude?.has(key)) return null
          const sel = chosen.includes(key)
          const disabled = !sel && atLimit
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onToggle(key)}
              className={`px-2 py-2 rounded-lg border text-xs transition-colors text-center ${
                sel
                  ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                  : disabled
                  ? 'border-gray-800 bg-gray-900/40 text-gray-600 cursor-not-allowed'
                  : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
              }`}
            >
              <span className="font-bold block">{abbr}</span>
              <span className="text-[10px] text-gray-500">{name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Picker de perícias raciais ───────────────────────────────── */
function RacialSkillPicker({ label, count, chosen, onToggle }) {
  const atLimit = chosen.length >= count
  return (
    <div className="bg-gray-800 border border-amber-800/40 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
        {label}{' '}
        <span className={`text-[10px] font-normal ${atLimit ? 'text-green-400' : 'text-amber-500'}`}>
          ({chosen.length}/{count})
        </span>
        {!atLimit && <span className="text-red-400 ml-1">*</span>}
      </p>
      <div className="grid grid-cols-2 gap-1">
        {SKILLS.map(({ key, name }) => {
          const sel = chosen.includes(key)
          const disabled = !sel && atLimit
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onToggle(key)}
              className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors flex items-center gap-2 ${
                sel
                  ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                  : disabled
                  ? 'border-gray-800 bg-gray-900/40 text-gray-600 cursor-not-allowed'
                  : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
              }`}
            >
              <span className={`w-3 h-3 rounded border-2 shrink-0 flex items-center justify-center ${
                sel ? 'border-amber-400 bg-amber-500' : 'border-gray-600'
              }`}>
                {sel && <span className="text-white text-[8px]">✓</span>}
              </span>
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RaceDetails({ race }) {
  const topics = race.topics ?? race.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []
  return (
    <>
      {race.summary && <p className="text-sm text-gray-200 leading-relaxed font-medium">{race.summary}</p>}
      <div className="flex flex-wrap gap-2 text-xs">
        {race.size   && <span className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">Tamanho: <span className="text-amber-300">{race.size}</span></span>}
        {race.speed  && <span className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">Deslocamento: <span className="text-amber-300">{race.speed}m</span></span>}
        {race.ability_bonuses?.filter(b => !b.ability.includes('escolha')).map((b, i) => (
          <span key={i} className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">
            <span className="text-amber-300">+{b.bonus}</span> {b.ability}
          </span>
        ))}
      </div>
      {topics.length > 0 && <TopicList items={topics} initialLimit={5} emptyMessage="" />}
      <FullDescriptionToggle text={race.fullDescription || race.description || ''} />
    </>
  )
}

function SubraceDetails({ subrace }) {
  const topics = subrace.topics ?? subrace.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []
  return (
    <>
      {(subrace.fullDescription || subrace.description) && (
        <p className="text-sm text-gray-300 leading-relaxed">{subrace.fullDescription || subrace.description}</p>
      )}
      {subrace.ability_bonuses?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subrace.ability_bonuses.map((b, i) => (
            <span key={i} className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full text-xs">
              <span className="text-amber-300">+{b.bonus}</span> {b.ability}
            </span>
          ))}
        </div>
      )}
      <TopicList items={topics} emptyMessage="Consulte o Livro do Jogador para os traços desta sub-raça." />
    </>
  )
}

function computeBonuses(race, subrace, freeChoices) {
  const map = {}
  for (const b of [...(race?.ability_bonuses ?? []), ...(subrace?.ability_bonuses ?? [])]) {
    if (b.ability.includes('escolha')) continue
    const key = ABBR_TO_KEY[b.ability]
    if (key) map[key] = (map[key] ?? 0) + b.bonus
  }
  for (const key of freeChoices) {
    map[key] = (map[key] ?? 0) + 1
  }
  return map
}
