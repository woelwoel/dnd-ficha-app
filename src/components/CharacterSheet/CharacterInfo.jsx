import { useState } from 'react'
import { DetailsModal } from '../DetailsModal'

const ALIGNMENTS = [
  'Leal e Bom', 'Neutro e Bom', 'Caótico e Bom',
  'Leal e Neutro', 'Neutro', 'Caótico e Neutro',
  'Leal e Mau', 'Neutro e Mau', 'Caótico e Mau',
]

/* ── Conteúdo do modal de Raça ── */
function RaceModalContent({ race }) {
  return (
    <>
      {race.description && (
        <p className="text-sm text-gray-300 leading-relaxed">{race.description}</p>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {race.size && (
          <span className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">
            Tamanho: <span className="text-amber-300">{race.size}</span>
          </span>
        )}
        {race.speed && (
          <span className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">
            Deslocamento: <span className="text-amber-300">{race.speed}m</span>
          </span>
        )}
        {race.ability_bonuses?.map((b, i) => (
          <span key={i} className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">
            <span className="text-amber-300">+{b.bonus}</span> {b.ability}
          </span>
        ))}
      </div>

      {race.traits?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Traços Raciais</h3>
          <div className="space-y-3">
            {race.traits.map((t, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-amber-300">{t.name}</p>
                <p className="text-sm text-gray-400 leading-relaxed mt-0.5">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {race.subraces?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Sub-raças</h3>
          <div className="space-y-4">
            {race.subraces.map((sr, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3">
                <p className="font-semibold text-amber-300 mb-1">{sr.name}</p>
                {sr.description && <p className="text-xs text-gray-400 mb-2">{sr.description}</p>}
                {sr.ability_bonuses?.length > 0 && (
                  <p className="text-xs text-gray-400 mb-2">
                    Bônus: {sr.ability_bonuses.map(b => `+${b.bonus} ${b.ability}`).join(', ')}
                  </p>
                )}
                {sr.traits?.map((t, j) => (
                  <div key={j} className="mt-2">
                    <span className="text-xs font-semibold text-amber-300">{t.name}. </span>
                    <span className="text-xs text-gray-400">{t.desc}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/* ── Conteúdo do modal de Classe ── */
function ClassModalContent({ cls }) {
  return (
    <>
      {cls.description && (
        <p className="text-sm text-gray-300 leading-relaxed">{cls.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
          <p className="text-gray-400 mb-1">Dado de Vida</p>
          <p className="text-2xl font-bold text-amber-400">d{cls.hit_die}</p>
        </div>
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
          <p className="text-gray-400 mb-1">Habilidade de Magia</p>
          <p className="text-base font-bold text-amber-400">{cls.spellcasting_ability || '—'}</p>
        </div>
      </div>

      {cls.saving_throws?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Testes de Resistência</h3>
          <div className="flex flex-wrap gap-2">
            {cls.saving_throws.map((s, i) => (
              <span key={i} className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full text-xs text-amber-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {cls.armor_proficiencies?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Proficiências em Armaduras</h3>
          <p className="text-sm text-gray-400">{cls.armor_proficiencies.join(', ')}</p>
        </div>
      )}

      {cls.weapon_proficiencies?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Proficiências em Armas</h3>
          <p className="text-sm text-gray-400">{cls.weapon_proficiencies.join(', ')}</p>
        </div>
      )}

      {cls.skill_choices?.from?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
            Perícias (escolha {cls.skill_choices.count})
          </h3>
          <div className="flex flex-wrap gap-1">
            {cls.skill_choices.from.map((s, i) => (
              <span key={i} className="bg-gray-800 border border-gray-600 px-2 py-0.5 rounded text-xs text-gray-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {cls.level1_features?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">
            Características de Nível 1
          </h3>
          <div className="space-y-3">
            {cls.level1_features.map((f, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-amber-300">{f.name}</p>
                <p className="text-sm text-gray-400 leading-relaxed mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/* ── Conteúdo do modal de Antecedente ── */
function BackgroundModalContent({ bg }) {
  return (
    <>
      {bg.description && (
        <p className="text-sm text-gray-300 leading-relaxed">{bg.description}</p>
      )}

      <div className="grid grid-cols-1 gap-2 text-sm">
        {bg.skill_proficiencies?.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Proficiência em Perícias</p>
            <p className="text-amber-300">{bg.skill_proficiencies.join(', ')}</p>
          </div>
        )}
        {bg.tool_proficiencies?.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Proficiência em Ferramentas</p>
            <p className="text-amber-300">{bg.tool_proficiencies.join(', ')}</p>
          </div>
        )}
        {bg.languages && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Idiomas</p>
            <p className="text-amber-300">{bg.languages}</p>
          </div>
        )}
        {bg.equipment && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Equipamento</p>
            <p className="text-gray-300 text-xs leading-relaxed">{bg.equipment}</p>
          </div>
        )}
      </div>

      {bg.feature?.name && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
            Característica: {bg.feature.name}
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">{bg.feature.desc}</p>
        </div>
      )}

      {bg.personality_traits?.length > 0 && (
        <TableSection title="Traços de Personalidade" items={bg.personality_traits} />
      )}
      {bg.ideals?.length > 0 && (
        <TableSection title="Ideais" items={bg.ideals} />
      )}
      {bg.bonds?.length > 0 && (
        <TableSection title="Vínculos" items={bg.bonds} />
      )}
      {bg.flaws?.length > 0 && (
        <TableSection title="Defeitos" items={bg.flaws} />
      )}
    </>
  )
}

function TableSection({ title, items }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">{title}</h3>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 text-xs bg-gray-800 rounded px-3 py-2">
            <span className="text-amber-600 font-bold shrink-0 w-4">{i + 1}</span>
            <span className="text-gray-300">{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Componente principal ── */
export function CharacterInfo({ info, onUpdate, races, classes, backgrounds }) {
  const [modal, setModal] = useState(null) // 'race' | 'class' | 'background' | null

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

      {/* Raça */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Raça</label>
        <div className="flex gap-1">
          <select
            value={info.race}
            onChange={e => onUpdate('race', e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
          >
            <option value="">Escolher...</option>
            {races.map(r => (
              <option key={r.index} value={r.index}>{r.name}</option>
            ))}
          </select>
          {selectedRace && (
            <button
              onClick={() => setModal('race')}
              title="Ver detalhes"
              className="px-2 py-1 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm"
            >
              ?
            </button>
          )}
        </div>
      </div>

      {/* Classe */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Classe</label>
        <div className="flex gap-1">
          <select
            value={info.class}
            onChange={e => onUpdate('class', e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
          >
            <option value="">Escolher...</option>
            {classes.map(c => (
              <option key={c.index} value={c.index}>{c.name}</option>
            ))}
          </select>
          {selectedClass && (
            <button
              onClick={() => setModal('class')}
              title="Ver detalhes"
              className="px-2 py-1 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm"
            >
              ?
            </button>
          )}
        </div>
      </div>

      {/* Nível */}
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

      {/* Antecedente */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Antecedente</label>
        <div className="flex gap-1">
          <select
            value={info.background}
            onChange={e => onUpdate('background', e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
          >
            <option value="">Escolher...</option>
            {backgrounds.map(b => (
              <option key={b.index} value={b.index}>{b.name}</option>
            ))}
          </select>
          {selectedBg && (
            <button
              onClick={() => setModal('background')}
              title="Ver detalhes"
              className="px-2 py-1 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm"
            >
              ?
            </button>
          )}
        </div>
      </div>

      {/* Alinhamento */}
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

      {/* XP */}
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

      {/* Modais */}
      <DetailsModal
        isOpen={modal === 'race'}
        onClose={() => setModal(null)}
        title={selectedRace?.name || ''}
      >
        {selectedRace && <RaceModalContent race={selectedRace} />}
      </DetailsModal>

      <DetailsModal
        isOpen={modal === 'class'}
        onClose={() => setModal(null)}
        title={selectedClass?.name || ''}
      >
        {selectedClass && <ClassModalContent cls={selectedClass} />}
      </DetailsModal>

      <DetailsModal
        isOpen={modal === 'background'}
        onClose={() => setModal(null)}
        title={selectedBg?.name || ''}
      >
        {selectedBg && <BackgroundModalContent bg={selectedBg} />}
      </DetailsModal>
    </div>
  )
}
