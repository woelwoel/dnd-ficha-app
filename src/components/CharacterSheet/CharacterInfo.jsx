import { useState } from 'react'

const ALIGNMENTS = [
  'Leal e Bom', 'Neutro e Bom', 'Caótico e Bom',
  'Leal e Neutro', 'Neutro', 'Caótico e Neutro',
  'Leal e Mau', 'Neutro e Mau', 'Caótico e Mau',
]

function RacePanel({ race }) {
  if (!race) return null
  return (
    <div className="mt-2 p-3 bg-gray-900 border border-amber-700 rounded text-sm text-gray-300 space-y-2">
      <p className="text-amber-400 font-semibold">{race.name}</p>
      {race.description && <p className="text-xs leading-relaxed line-clamp-3">{race.description}</p>}
      <div className="flex flex-wrap gap-2 text-xs">
        {race.size && <span className="bg-gray-800 px-2 py-0.5 rounded">Tamanho: {race.size}</span>}
        {race.speed && <span className="bg-gray-800 px-2 py-0.5 rounded">Deslocamento: {race.speed}m</span>}
        {race.ability_bonuses?.length > 0 && (
          <span className="bg-gray-800 px-2 py-0.5 rounded">
            Bônus: {race.ability_bonuses.map(b => `+${b.bonus} ${b.ability}`).join(', ')}
          </span>
        )}
      </div>
      {race.traits?.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 font-semibold mb-1">Traços Raciais:</p>
          <ul className="space-y-1">
            {race.traits.slice(0, 5).map((t, i) => (
              <li key={i} className="text-xs">
                <span className="text-amber-300">{t.name}.</span>{' '}
                <span className="text-gray-400 line-clamp-1">{t.desc}</span>
              </li>
            ))}
            {race.traits.length > 5 && (
              <li className="text-xs text-gray-500">+ {race.traits.length - 5} mais traços...</li>
            )}
          </ul>
        </div>
      )}
      {race.subraces?.length > 0 && (
        <p className="text-xs text-gray-400">
          Sub-raças: {race.subraces.map(s => s.name).join(', ')}
        </p>
      )}
    </div>
  )
}

function ClassPanel({ cls }) {
  if (!cls) return null
  return (
    <div className="mt-2 p-3 bg-gray-900 border border-amber-700 rounded text-sm text-gray-300 space-y-2">
      <p className="text-amber-400 font-semibold">{cls.name}</p>
      {cls.description && <p className="text-xs leading-relaxed line-clamp-3">{cls.description}</p>}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="bg-gray-800 px-2 py-0.5 rounded">Dado de Vida: d{cls.hit_die}</span>
        {cls.spellcasting_ability && (
          <span className="bg-gray-800 px-2 py-0.5 rounded">Magia: {cls.spellcasting_ability}</span>
        )}
      </div>
      {cls.saving_throws?.length > 0 && (
        <p className="text-xs text-gray-400">
          Resistências: {cls.saving_throws.join(', ')}
        </p>
      )}
      {cls.skill_choices?.from?.length > 0 && (
        <p className="text-xs text-gray-400">
          Perícias: escolha {cls.skill_choices.count} dentre {cls.skill_choices.from.slice(0, 4).join(', ')}
          {cls.skill_choices.from.length > 4 ? '...' : ''}
        </p>
      )}
      {cls.level1_features?.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 font-semibold mb-1">Características (Nível 1):</p>
          <ul className="space-y-1">
            {cls.level1_features.slice(0, 4).map((f, i) => (
              <li key={i} className="text-xs">
                <span className="text-amber-300">{f.name}.</span>{' '}
                <span className="text-gray-400 line-clamp-1">{f.desc}</span>
              </li>
            ))}
            {cls.level1_features.length > 4 && (
              <li className="text-xs text-gray-500">+ {cls.level1_features.length - 4} mais...</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function BackgroundPanel({ bg }) {
  if (!bg) return null
  return (
    <div className="mt-2 p-3 bg-gray-900 border border-amber-700 rounded text-sm text-gray-300 space-y-2">
      <p className="text-amber-400 font-semibold">{bg.name}</p>
      {bg.description && <p className="text-xs leading-relaxed line-clamp-3">{bg.description}</p>}
      {bg.skill_proficiencies?.length > 0 && (
        <p className="text-xs text-gray-400">
          Perícias: {bg.skill_proficiencies.join(', ')}
        </p>
      )}
      {bg.tool_proficiencies?.length > 0 && (
        <p className="text-xs text-gray-400">
          Ferramentas: {bg.tool_proficiencies.join(', ')}
        </p>
      )}
      {bg.languages && (
        <p className="text-xs text-gray-400">Idiomas: {bg.languages}</p>
      )}
      {bg.feature?.name && (
        <div>
          <p className="text-xs text-amber-300 font-semibold">{bg.feature.name}</p>
          <p className="text-xs text-gray-400 line-clamp-2">{bg.feature.desc}</p>
        </div>
      )}
    </div>
  )
}

export function CharacterInfo({ info, onUpdate, races, classes, backgrounds }) {
  const [showRace, setShowRace] = useState(false)
  const [showClass, setShowClass] = useState(false)
  const [showBg, setShowBg] = useState(false)

  const selectedRace = races.find(r => r.index === info.race)
  const selectedClass = classes.find(c => c.index === info.class)
  const selectedBg = backgrounds.find(b => b.index === info.background)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 sm:col-span-3">
        <label className="block text-xs text-gray-400 mb-1">Nome do Personagem</label>
        <input
          type="text"
          value={info.name}
          onChange={e => onUpdate('name', e.target.value)}
          placeholder="Ex: Thorin Ironforge"
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-lg font-semibold focus:outline-none focus:border-amber-400"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Raça</label>
        <select
          value={info.race}
          onChange={e => { onUpdate('race', e.target.value); setShowRace(!!e.target.value) }}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">Escolher...</option>
          {races.map(r => (
            <option key={r.index} value={r.index}>{r.name}</option>
          ))}
        </select>
        {selectedRace && (
          <button
            onClick={() => setShowRace(v => !v)}
            className="mt-1 text-xs text-amber-500 hover:text-amber-300"
          >
            {showRace ? '▲ Ocultar detalhes' : '▼ Ver detalhes'}
          </button>
        )}
        {showRace && <RacePanel race={selectedRace} />}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Classe</label>
        <select
          value={info.class}
          onChange={e => { onUpdate('class', e.target.value); setShowClass(!!e.target.value) }}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">Escolher...</option>
          {classes.map(c => (
            <option key={c.index} value={c.index}>{c.name}</option>
          ))}
        </select>
        {selectedClass && (
          <button
            onClick={() => setShowClass(v => !v)}
            className="mt-1 text-xs text-amber-500 hover:text-amber-300"
          >
            {showClass ? '▲ Ocultar detalhes' : '▼ Ver detalhes'}
          </button>
        )}
        {showClass && <ClassPanel cls={selectedClass} />}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Nível</label>
        <input
          type="number"
          min={1}
          max={20}
          value={info.level}
          onChange={e => onUpdate('level', Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Antecedente</label>
        <select
          value={info.background}
          onChange={e => { onUpdate('background', e.target.value); setShowBg(!!e.target.value) }}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">Escolher...</option>
          {backgrounds.map(b => (
            <option key={b.index} value={b.index}>{b.name}</option>
          ))}
        </select>
        {selectedBg && (
          <button
            onClick={() => setShowBg(v => !v)}
            className="mt-1 text-xs text-amber-500 hover:text-amber-300"
          >
            {showBg ? '▲ Ocultar detalhes' : '▼ Ver detalhes'}
          </button>
        )}
        {showBg && <BackgroundPanel bg={selectedBg} />}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Alinhamento</label>
        <select
          value={info.alignment}
          onChange={e => onUpdate('alignment', e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">Escolher...</option>
          {ALIGNMENTS.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Experiência (XP)</label>
        <input
          type="number"
          min={0}
          value={info.xp}
          onChange={e => onUpdate('xp', Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  )
}
