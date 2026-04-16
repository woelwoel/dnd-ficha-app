// Passo 2 — Raça
import { useState } from 'react'
import { ABBR_TO_KEY } from '../../../utils/calculations'
import { DetailsModal } from '../../DetailsModal'
import { TopicList, FullDescriptionToggle } from '../../TopicList'

export function Step2Race({ draft, updateDraft, races }) {
  const [modal, setModal] = useState(null) // 'race' | 'subrace' | null

  const selectedRace    = races.find(r => r.index === draft.race)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === draft.subrace)

  // Bônus combinados raça + sub-raça para preview
  const allBonuses = [
    ...(selectedRace?.ability_bonuses ?? []),
    ...(selectedSubrace?.ability_bonuses ?? []),
  ]

  function handleRaceChange(raceIndex) {
    const race = races.find(r => r.index === raceIndex)
    const bonuses = computeBonuses(race, null)
    updateDraft({ race: raceIndex, subrace: '', racialBonuses: bonuses })
  }

  function handleSubraceChange(subraceIndex) {
    const race    = races.find(r => r.index === draft.race)
    const subrace = race?.subraces?.find(sr => sr.index === subraceIndex)
    const bonuses = computeBonuses(race, subrace)
    updateDraft({ subrace: subraceIndex, racialBonuses: bonuses })
  }

  const fieldCls = 'w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400'

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
            Sub-raça <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={draft.subrace}
              onChange={e => handleSubraceChange(e.target.value)}
              className={fieldCls}
            >
              <option value="">Escolher sub-raça...</option>
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

      {/* Bônus de atributo da raça */}
      {allBonuses.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-2">Bônus de atributo (aplicados automaticamente):</p>
          <div className="flex flex-wrap gap-2">
            {allBonuses.map((b, i) => (
              <span key={i} className="text-xs bg-amber-900/40 border border-amber-700 px-2.5 py-1 rounded-full text-amber-300 font-medium">
                +{b.bonus} {b.ability}
              </span>
            ))}
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

function RaceDetails({ race }) {
  const topics = race.topics ?? race.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []
  return (
    <>
      {race.summary && <p className="text-sm text-gray-200 leading-relaxed font-medium">{race.summary}</p>}
      <div className="flex flex-wrap gap-2 text-xs">
        {race.size   && <span className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">Tamanho: <span className="text-amber-300">{race.size}</span></span>}
        {race.speed  && <span className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">Deslocamento: <span className="text-amber-300">{race.speed}m</span></span>}
        {race.ability_bonuses?.map((b, i) => (
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

function computeBonuses(race, subrace) {
  const map = {}
  for (const b of [...(race?.ability_bonuses ?? []), ...(subrace?.ability_bonuses ?? [])]) {
    const key = ABBR_TO_KEY[b.ability]
    if (key) map[key] = (map[key] ?? 0) + b.bonus
  }
  return map
}
