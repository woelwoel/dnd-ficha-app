// Passo 4 — Antecedente
import { useState } from 'react'
import { SKILLS } from '../../../utils/calculations'
import { DetailsModal } from '../../DetailsModal'

export function Step4Background({ draft, updateDraft, backgrounds }) {
  const [modal, setModal] = useState(false)
  const selectedBg = backgrounds.find(b => b.index === draft.background)

  function handleBackgroundChange(bgIndex) {
    const bg = backgrounds.find(b => b.index === bgIndex)
    const bgSkillKeys = (bg?.skill_proficiencies ?? [])
      .map(name => SKILLS.find(s => s.name === name)?.key)
      .filter(Boolean)
    updateDraft({ background: bgIndex, backgroundSkills: bgSkillKeys })
  }

  const fieldCls = 'w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-amber-400 mb-1">Antecedente</h2>
        <p className="text-sm text-gray-400">De onde vem seu personagem? O antecedente concede perícias, idiomas e equipamento inicial.</p>
      </div>

      {/* Seletor */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Antecedente <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={draft.background}
            onChange={e => handleBackgroundChange(e.target.value)}
            className={fieldCls}
          >
            <option value="">Escolher antecedente...</option>
            {backgrounds.map(b => (
              <option key={b.index} value={b.index}>{b.name}</option>
            ))}
          </select>
          {selectedBg && (
            <button
              onClick={() => setModal(true)}
              className="px-3 py-2 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm shrink-0"
              title="Ver detalhes do antecedente"
            >
              ?
            </button>
          )}
        </div>
      </div>

      {/* Preview: perícias concedidas */}
      {draft.backgroundSkills.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-2">
            Proficiências em perícias concedidas pelo antecedente (aplicadas automaticamente):
          </p>
          <div className="flex flex-wrap gap-2">
            {draft.backgroundSkills.map(key => {
              const skill = SKILLS.find(s => s.key === key)
              return (
                <span key={key} className="flex items-center gap-1.5 text-xs bg-amber-900/30 border border-amber-700 px-2.5 py-1 rounded-full text-amber-300">
                  <span>🎒</span>
                  {skill?.name ?? key}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Outras proficiências do antecedente */}
      {selectedBg && (selectedBg.tool_proficiencies?.length > 0 || selectedBg.languages) && (
        <div className="space-y-2 text-xs">
          {selectedBg.tool_proficiencies?.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <p className="text-gray-500 mb-1">Ferramentas</p>
              <p className="text-gray-300">{selectedBg.tool_proficiencies.join(', ')}</p>
            </div>
          )}
          {selectedBg.languages && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <p className="text-gray-500 mb-1">Idiomas</p>
              <p className="text-gray-300">{selectedBg.languages}</p>
            </div>
          )}
          {selectedBg.equipment && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <p className="text-gray-500 mb-1">Equipamento Inicial</p>
              <p className="text-gray-300 leading-relaxed">{selectedBg.equipment}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal completo */}
      <DetailsModal isOpen={modal} onClose={() => setModal(false)} title={selectedBg?.name ?? ''}>
        {selectedBg && <BackgroundDetails bg={selectedBg} />}
      </DetailsModal>
    </div>
  )
}

function BackgroundDetails({ bg }) {
  return (
    <>
      {bg.description && <p className="text-sm text-gray-300 leading-relaxed">{bg.description}</p>}
      <div className="grid grid-cols-1 gap-2 text-sm">
        {bg.skill_proficiencies?.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Proficiência em Perícias</p>
            <p className="text-amber-300">{bg.skill_proficiencies.join(', ')}</p>
          </div>
        )}
        {bg.tool_proficiencies?.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Ferramentas</p>
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
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
            Característica: {bg.feature.name}
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">{bg.feature.desc}</p>
        </div>
      )}
    </>
  )
}
