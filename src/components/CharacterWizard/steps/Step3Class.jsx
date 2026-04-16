// Passo 3 — Classe
import { useState } from 'react'
import { ATTR_NAME_TO_KEY, SPELL_ABILITY_PT_TO_KEY, getModifier, calculateMaxHp } from '../../../utils/calculations'
import { DetailsModal } from '../../DetailsModal'
import { TopicList, FullDescriptionToggle } from '../../TopicList'

export function Step3Class({ draft, updateDraft, classes }) {
  const [modal, setModal] = useState(false)
  const selectedClass = classes.find(c => c.index === draft.class)

  function handleClassChange(classIndex) {
    const cls       = classes.find(c => c.index === classIndex) ?? null
    const saveKeys  = (cls?.saving_throws ?? []).map(n => ATTR_NAME_TO_KEY[n]).filter(Boolean)
    const spellKey  = SPELL_ABILITY_PT_TO_KEY[cls?.spellcasting_ability] ?? null
    const hitDice   = cls?.hit_die ? `1d${cls.hit_die}` : '1d8'
    updateDraft({
      class: classIndex,
      savingThrows: saveKeys,
      spellcastingAbility: spellKey,
      hitDice,
    })
  }

  // HP preview
  const hpPreview = selectedClass
    ? calculateMaxHp(selectedClass, draft.level,
        Object.values(draft.baseAttributes).some(v => v > 0) ? (draft.baseAttributes.con + (draft.racialBonuses?.con ?? 0)) : 10
      )
    : null

  const fieldCls = 'w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-amber-400 mb-1">Classe</h2>
        <p className="text-sm text-gray-400">Escolha a vocação do seu personagem.</p>
      </div>

      {/* Seletor de classe */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Classe <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={draft.class}
            onChange={e => handleClassChange(e.target.value)}
            className={fieldCls}
          >
            <option value="">Escolher classe...</option>
            {classes.map(c => (
              <option key={c.index} value={c.index}>{c.name}</option>
            ))}
          </select>
          {selectedClass && (
            <button
              onClick={() => setModal(true)}
              className="px-3 py-2 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm shrink-0"
              title="Ver detalhes da classe"
            >
              ?
            </button>
          )}
        </div>
      </div>

      {/* Nível inicial */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Nível Inicial</label>
        <select
          value={draft.level}
          onChange={e => updateDraft({ level: Number(e.target.value) })}
          className={fieldCls}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Nível {n}</option>
          ))}
        </select>
      </div>

      {/* Cards de stats da classe */}
      {selectedClass && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatCard label="Dado de Vida" value={`d${selectedClass.hit_die}`} />
          <StatCard label="Habilidade de Magia" value={selectedClass.spellcasting_ability || '—'} />
          {hpPreview !== null && (
            <StatCard label="PV no Nível 1" value={`${hpPreview} PV`} sub="com CON 10" />
          )}
          <StatCard label="Bônus de Proficiência" value={`+${Math.ceil(draft.level / 4) + 1}`} />
        </div>
      )}

      {/* Salvaguardas */}
      {draft.savingThrows.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">Salvaguardas da classe:</p>
          <div className="flex flex-wrap gap-2">
            {draft.savingThrows.map(k => (
              <span key={k} className="text-xs bg-gray-800 border border-amber-700 px-2.5 py-1 rounded-full text-amber-300 uppercase">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Perícias disponíveis */}
      {selectedClass?.skill_choices && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">
            Você poderá escolher <span className="text-amber-300 font-semibold">{selectedClass.skill_choices.count} perícias</span> da lista:
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedClass.skill_choices.from?.map((s, i) => (
              <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      <DetailsModal isOpen={modal} onClose={() => setModal(false)} title={selectedClass?.name ?? ''}>
        {selectedClass && <ClassDetails cls={selectedClass} />}
      </DetailsModal>
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
      <p className="text-gray-500 text-[11px] mb-0.5">{label}</p>
      <p className="text-amber-300 font-bold text-base">{value}</p>
      {sub && <p className="text-gray-600 text-[10px]">{sub}</p>}
    </div>
  )
}

function ClassDetails({ cls }) {
  const topics = cls.topics ?? cls.level1_features?.map(f => ({ title: f.name, desc: f.desc })) ?? []
  return (
    <>
      {cls.summary && <p className="text-sm text-gray-200 leading-relaxed font-medium">{cls.summary}</p>}
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
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Salvaguardas</p>
          <div className="flex flex-wrap gap-2">
            {cls.saving_throws.map((s, i) => (
              <span key={i} className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full text-xs text-amber-300">{s}</span>
            ))}
          </div>
        </div>
      )}
      {topics.length > 0 && <TopicList items={topics} initialLimit={4} emptyMessage="" />}
      <FullDescriptionToggle text={cls.fullDescription || cls.description || ''} />
    </>
  )
}
