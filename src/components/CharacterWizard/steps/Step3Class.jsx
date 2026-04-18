// Passo 3 — Classe
import { useState } from 'react'
import { ATTR_NAME_TO_KEY, SPELL_ABILITY_PT_TO_KEY, calculateMaxHp } from '../../../utils/calculations'
import { DetailsModal } from '../../DetailsModal'
import { TopicList, FullDescriptionToggle } from '../../TopicList'

function rollGoldFormula(formula) {
  const m = formula.match(/(\d+)d(\d+)(?:\s*[×x]\s*(\d+))?/)
  if (!m) return 0
  let total = 0
  for (let i = 0; i < Number(m[1]); i++) total += Math.ceil(Math.random() * Number(m[2]))
  return total * (Number(m[3]) || 1)
}

export function Step3Class({ draft, updateDraft, classes, classChoices = {} }) {
  const [modal,     setModal]     = useState(false)
  const [infoModal, setInfoModal] = useState(null)   // { name, desc, grants }
  const selectedClass = classes.find(c => c.index === draft.class)
  const level1Choices = (classChoices[draft.class]?.choices ?? []).filter(c => c.level === 1)

  function handleClassChange(classIndex) {
    const cls       = classes.find(c => c.index === classIndex) ?? null
    const saveKeys  = (cls?.saving_throws ?? []).map(n => ATTR_NAME_TO_KEY[n]).filter(Boolean)
    const spellKey  = SPELL_ABILITY_PT_TO_KEY[cls?.spellcasting_ability] ?? null
    const hitDice   = cls?.hit_die ? `1d${cls.hit_die}` : '1d8'
    updateDraft({
      class: classIndex,
      chosenFeatures: {},
      savingThrows: saveKeys,
      spellcastingAbility: spellKey,
      hitDice,
    })
  }

  function handleFeatureChoice(choiceId, value) {
    updateDraft({ chosenFeatures: { ...(draft.chosenFeatures ?? {}), [choiceId]: value } })
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

      {/* Escolhas de características de nível 1 */}
      {level1Choices.length > 0 && (
        <div className="space-y-4">
          {level1Choices.map(choice => {
            const selected = draft.chosenFeatures?.[choice.id] ?? ''
            return (
              <div key={choice.id} className="bg-gray-800 border border-amber-800/40 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-amber-500 font-semibold uppercase tracking-widest mb-0.5">{choice.featureName}</p>
                  <p className="text-sm text-gray-300">{choice.prompt} <span className="text-red-400">*</span></p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {choice.options.map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleFeatureChoice(choice.id, opt.value)}
                        className={`flex-1 text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                          selected === opt.value
                            ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                            : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${selected === opt.value ? 'border-amber-400 bg-amber-500' : 'border-gray-600'}`} />
                        <span className="font-semibold text-sm">{opt.name}</span>
                        {opt.grants?.bonusCantrips > 0 && (
                          <span className="text-[10px] bg-blue-900/40 border border-blue-700/50 text-blue-300 px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                            +{opt.grants.bonusCantrips} truques
                          </span>
                        )}
                        {opt.grants?.spells?.length > 0 && (
                          <span className="text-[10px] bg-green-900/40 border border-green-700/50 text-green-300 px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                            +magia
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setInfoModal(opt)}
                        className="w-7 h-7 rounded-full bg-gray-700 hover:bg-amber-800 text-amber-400 text-xs font-bold shrink-0 transition-colors"
                        title="Ver descrição"
                      >ℹ</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de descrição da opção */}
      <DetailsModal isOpen={!!infoModal} onClose={() => setInfoModal(null)} title={infoModal?.name ?? ''}>
        {infoModal && (
          <div className="space-y-3">
            <p className="text-sm text-gray-300 leading-relaxed">{infoModal.desc}</p>
            {infoModal.grants?.bonusCantrips > 0 && (
              <p className="text-xs bg-blue-900/30 border border-blue-700/40 text-blue-300 px-3 py-2 rounded-lg">
                Concede: +{infoModal.grants.bonusCantrips} truques à sua escolha de qualquer lista de magias.
              </p>
            )}
            {infoModal.grants?.spells?.length > 0 && (
              <p className="text-xs bg-green-900/30 border border-green-700/40 text-green-300 px-3 py-2 rounded-lg">
                Concede automaticamente: {infoModal.grants.spells.join(', ')}
              </p>
            )}
          </div>
        )}
      </DetailsModal>

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
            Você poderá escolher <span className="text-amber-300 font-semibold">{selectedClass.skill_choices.count} perícias</span> no passo de Perícias:
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedClass.skill_choices.from?.map((s, i) => (
              <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Equipamento inicial vs Ouro (F2) */}
      {selectedClass && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Equipamento Inicial</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateDraft({ classEquipmentChoice: 'equipment', classStartingGold: 0 })}
              className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                (draft.classEquipmentChoice ?? 'equipment') !== 'gold'
                  ? 'bg-amber-900/30 border-amber-700 text-amber-300'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              🎒 Equipamento do Antecedente
            </button>
            <button
              type="button"
              onClick={() => updateDraft({ classEquipmentChoice: 'gold' })}
              className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                draft.classEquipmentChoice === 'gold'
                  ? 'bg-amber-900/30 border-amber-700 text-amber-300'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              🪙 Ouro Inicial {selectedClass.gold_formula ? `(${selectedClass.gold_formula} PO)` : ''}
            </button>
          </div>

          {draft.classEquipmentChoice === 'gold' && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-500">Fórmula de ouro inicial:</p>
                <p className="text-sm font-bold text-amber-300">{selectedClass.gold_formula ?? '5d4 × 10'} PO</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const gold = rollGoldFormula(selectedClass.gold_formula ?? '5d4 × 10')
                  updateDraft({ classStartingGold: gold })
                }}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs rounded-lg transition-colors"
              >
                🎲 Rolar
              </button>
              {(draft.classStartingGold ?? 0) > 0 && (
                <span className="text-amber-300 font-bold text-lg">{draft.classStartingGold} PO</span>
              )}
            </div>
          )}
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
