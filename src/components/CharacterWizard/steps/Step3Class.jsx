// Passo 3 — Classe
import { useState } from 'react'
import { ATTR_NAME_TO_KEY, SPELL_ABILITY_PT_TO_KEY, calculateMaxHp } from '../../../utils/calculations'
import { DetailsModal } from '../../DetailsModal'
import { TopicList, FullDescriptionToggle } from '../../TopicList'
import { CantripsGrantPicker } from '../../CantripsGrantPicker'

function rollGoldFormula(formula) {
  const m = formula.match(/(\d+)d(\d+)(?:\s*[×x]\s*(\d+))?/)
  if (!m) return 0
  let total = 0
  for (let i = 0; i < Number(m[1]); i++) total += Math.ceil(Math.random() * Number(m[2]))
  return total * (Number(m[3]) || 1)
}

export function Step3Class({ draft, updateDraft, classes, classChoices = {}, classEquipment = {}, weaponsArmor = {}, classProgression = {} }) {
  const [classModal, setClassModal] = useState(false)
  const [infoModal,  setInfoModal]  = useState(null) // { name, desc, grants? }

  const selectedClass = classes.find(c => c.index === draft.class)

  // Choices disponíveis até o nível inicial escolhido
  const leveledChoices = (classChoices[draft.class]?.choices ?? [])
    .filter(c => c.level <= draft.level)
    .sort((a, b) => a.level - b.level)

  // Cantrips bônus exigidos pelas choices já selecionadas
  const bonusCantripsNeeded = leveledChoices.reduce((sum, c) => {
    const val = draft.chosenFeatures?.[c.id] ?? ''
    const opt = c.options.find(o => o.value === val)
    return sum + (opt?.grants?.bonusCantrips ?? 0)
  }, 0)

  const choicesDone     = leveledChoices.filter(c => !!draft.chosenFeatures?.[c.id]).length
  const allChoicesDone  = choicesDone === leveledChoices.length
  const cantripsReady   = (draft.bonusSpells?.length ?? 0) >= bonusCantripsNeeded
  const allComplete     = allChoicesDone && cantripsReady

  // Níveis 1..draft.level da progressão desta classe
  const progressionLevels = (classProgression[draft.class]?.levels ?? [])
    .filter(l => l.level <= draft.level)
    .sort((a, b) => a.level - b.level)

  function handleClassChange(classIndex) {
    const cls      = classes.find(c => c.index === classIndex) ?? null
    const saveKeys = (cls?.saving_throws ?? []).map(n => ATTR_NAME_TO_KEY[n]).filter(Boolean)
    const spellKey = SPELL_ABILITY_PT_TO_KEY[cls?.spellcasting_ability] ?? null
    const hitDice  = cls?.hit_die ? `1d${cls.hit_die}` : '1d8'
    updateDraft({ class: classIndex, chosenFeatures: {}, bonusSpells: [], classEquipmentChoices: {}, classEquipmentPicks: {}, savingThrows: saveKeys, spellcastingAbility: spellKey, hitDice })
  }

  function handleLevelChange(lvl) {
    updateDraft({ level: lvl, chosenFeatures: {}, bonusSpells: [] })
  }

  function handleFeatureChoice(choiceId, value) {
    updateDraft({ chosenFeatures: { ...(draft.chosenFeatures ?? {}), [choiceId]: value }, bonusSpells: [] })
  }

  const hpPreview = selectedClass
    ? calculateMaxHp(selectedClass, draft.level,
        Object.values(draft.baseAttributes).some(v => v > 0)
          ? (draft.baseAttributes.con + (draft.racialBonuses?.con ?? 0))
          : 10)
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
        <label className="block text-xs text-gray-400 mb-1">Classe <span className="text-red-400">*</span></label>
        <div className="flex gap-2">
          <select value={draft.class} onChange={e => handleClassChange(e.target.value)} className={fieldCls}>
            <option value="">Escolher classe...</option>
            {classes.map(c => <option key={c.index} value={c.index}>{c.name}</option>)}
          </select>
          {selectedClass && (
            <button onClick={() => setClassModal(true)}
              className="px-3 py-2 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm shrink-0"
              title="Ver detalhes da classe">?</button>
          )}
        </div>
      </div>

      {/* Nível inicial */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Nível Inicial</label>
        <select value={draft.level} onChange={e => handleLevelChange(Number(e.target.value))} className={fieldCls}>
          {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Nível {n}</option>
          ))}
        </select>
      </div>

      {/* ── Progressão de níveis (inline) ── */}
      {selectedClass && (
        <div className="space-y-3">
          {/* Cabeçalho da seção */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              {draft.level === 1 ? 'Características da Classe' : `Progressão — Níveis 1 a ${draft.level}`}
            </p>
            {leveledChoices.length > 0 && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                allComplete
                  ? 'text-green-300 border-green-700/50 bg-green-900/20'
                  : 'text-amber-300 border-amber-700/50 bg-amber-900/20'
              }`}>
                {allComplete ? '✓ Completo' : `${choicesDone}/${leveledChoices.length} escolha${leveledChoices.length > 1 ? 's' : ''}`}
              </span>
            )}
          </div>

          {/* Entrada por nível */}
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {Array.from({ length: draft.level }, (_, i) => i + 1).map(lvl => {
              const lvlData   = progressionLevels.find(l => l.level === lvl)
              const features  = lvlData?.features ?? []
              const lvlChoices = leveledChoices.filter(c => c.level === lvl)
              const hasContent = features.length > 0 || lvlChoices.length > 0
              const lvlDone   = lvlChoices.length > 0 && lvlChoices.every(c => !!draft.chosenFeatures?.[c.id])
              const lvlPending= lvlChoices.length > 0 && !lvlDone

              if (!hasContent) return (
                <div key={lvl} className="flex items-center gap-2 px-3 py-1 rounded bg-gray-800/20 border border-gray-700/30">
                  <span className="text-[10px] font-bold text-gray-600 w-10 shrink-0">Nv.{lvl}</span>
                  <span className="text-[10px] text-gray-600 italic">
                    {lvlData ? 'Evolução de slots / habilidades' : 'Sem novas características'}
                  </span>
                </div>
              )

              return (
                <div key={lvl} className={`rounded-xl border p-3 space-y-2 transition-colors ${
                  lvlPending ? 'border-amber-700/60 bg-amber-900/10' :
                  lvlDone    ? 'border-green-800/50 bg-green-900/10' :
                               'border-gray-700/50 bg-gray-800/30'
                }`}>
                  {/* Cabeçalho do nível */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">Nível {lvl}</span>
                    {lvlPending && <span className="text-[10px] text-amber-400 font-semibold">⚠ Escolha necessária</span>}
                    {lvlDone   && <span className="text-[10px] text-green-400 font-semibold">✓ Feito</span>}
                  </div>

                  {/* Badges de características */}
                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {features.map((f, fi) => (
                        <button key={fi} type="button" onClick={() => setInfoModal(f)}
                          className="text-[10px] bg-gray-700/80 hover:bg-gray-600 px-2 py-0.5 rounded-full text-gray-300 transition-colors flex items-center gap-1">
                          {f.name}
                          <span className="text-gray-500 text-[9px]">ℹ</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Choices inline para este nível */}
                  {lvlChoices.map(choice => {
                    const selected = draft.chosenFeatures?.[choice.id] ?? ''
                    return (
                      <div key={choice.id} className="space-y-1.5 pt-2 border-t border-gray-600/40">
                        <p className="text-xs font-semibold text-amber-300">
                          {choice.featureName} <span className="text-red-400">*</span>
                        </p>
                        <p className="text-[11px] text-gray-400">{choice.prompt}</p>
                        <div className="flex flex-col gap-1">
                          {choice.options.map(opt => (
                            <div key={opt.value} className="flex items-center gap-1.5">
                              <button type="button"
                                onClick={() => handleFeatureChoice(choice.id, opt.value)}
                                className={`flex-1 text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors flex items-center gap-2 ${
                                  selected === opt.value
                                    ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                                    : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
                                }`}>
                                <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                                  selected === opt.value ? 'border-amber-400 bg-amber-500' : 'border-gray-600'
                                }`} />
                                <span className="font-medium">{opt.name}</span>
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
                              <button type="button" onClick={() => setInfoModal(opt)}
                                className="w-6 h-6 rounded-full bg-gray-700 hover:bg-amber-800 text-amber-400 text-[10px] font-bold shrink-0 transition-colors"
                                title="Ver descrição">ℹ</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Picker de cantrips bônus (Pacto do Tomo, etc.) */}
          {bonusCantripsNeeded > 0 && (
            <div className="bg-gray-800 border border-amber-800/40 rounded-xl p-4 space-y-2">
              <p className="text-xs text-amber-500 font-semibold uppercase tracking-widest">Truques de Bônus</p>
              <CantripsGrantPicker
                needed={bonusCantripsNeeded}
                chosen={draft.bonusSpells ?? []}
                onChosenChange={spells => updateDraft({ bonusSpells: spells })}
              />
            </div>
          )}
        </div>
      )}

      {/* Cards de stats da classe */}
      {selectedClass && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatCard label="Dado de Vida" value={`d${selectedClass.hit_die}`} />
          <StatCard label="Habilidade de Magia" value={selectedClass.spellcasting_ability || '—'} />
          {hpPreview !== null && (
            <StatCard label={`PV no Nível ${draft.level}`} value={`${hpPreview} PV`} sub="com CON 10" />
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
              <span key={k} className="text-xs bg-gray-800 border border-amber-700 px-2.5 py-1 rounded-full text-amber-300 uppercase">{k}</span>
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

      {/* Equipamento inicial vs Ouro */}
      {selectedClass && (
        <ClassEquipmentSection
          draft={draft}
          updateDraft={updateDraft}
          selectedClass={selectedClass}
          classEquipmentData={classEquipment[draft.class] ?? null}
          weaponsArmor={weaponsArmor}
        />
      )}

      {/* Modal de detalhes da classe */}
      <DetailsModal isOpen={classModal} onClose={() => setClassModal(false)} title={selectedClass?.name ?? ''}>
        {selectedClass && <ClassDetails cls={selectedClass} />}
      </DetailsModal>

      {/* Modal de descrição de feature/choice */}
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
    </div>
  )
}

/* ── Sub-picker inline de armas/instrumentos ──────────────────── */
function WeaponPicker({ category, pickKey, currentValue, weaponsArmor, onPick }) {
  const allWeapons    = weaponsArmor?.weapons    ?? []
  const allInstruments= weaponsArmor?.instruments ?? []

  const list = category === 'instrument'
    ? allInstruments
    : allWeapons.filter(w => {
        if (category === 'simple')        return w.category === 'simple-melee'  || w.category === 'simple-ranged'
        if (category === 'martial')       return w.category === 'martial-melee' || w.category === 'martial-ranged'
        return w.category === category
      })

  if (list.length === 0) return null

  return (
    <div className="mt-2 border border-blue-700/40 rounded-lg bg-blue-950/30 overflow-hidden">
      <div className="max-h-48 overflow-y-auto divide-y divide-blue-900/30">
        {list.map(item => {
          const isSelected = currentValue === item.name
          const stats = item.damage
            ? `${item.damage}${item.props?.length ? ' · ' + item.props.join(', ') : ''}`
            : null
          return (
            <button
              key={item.index}
              type="button"
              onClick={() => onPick(pickKey, item.name)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                isSelected
                  ? 'bg-blue-800/50 text-blue-100'
                  : 'hover:bg-blue-900/40 text-gray-300'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full border shrink-0 ${
                isSelected ? 'border-blue-400 bg-blue-400' : 'border-gray-600'
              }`} />
              <span className="font-medium flex-1">{item.name}</span>
              {stats && <span className="text-gray-500 text-[10px] shrink-0">{stats}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Seção de equipamento inicial da classe ───────────────────── */
function ClassEquipmentSection({ draft, updateDraft, selectedClass, classEquipmentData, weaponsArmor }) {
  const isEquipment = (draft.classEquipmentChoice ?? 'equipment') !== 'gold'

  function setOptionChoice(choiceId, value) {
    // ao trocar a opção, limpa os picks desse grupo
    const newPicks = { ...(draft.classEquipmentPicks ?? {}) }
    Object.keys(newPicks).forEach(k => { if (k.startsWith(`${choiceId}:`)) delete newPicks[k] })
    updateDraft({
      classEquipmentChoices: { ...(draft.classEquipmentChoices ?? {}), [choiceId]: value },
      classEquipmentPicks: newPicks,
    })
  }

  function setPick(pickKey, weaponName) {
    updateDraft({ classEquipmentPicks: { ...(draft.classEquipmentPicks ?? {}), [pickKey]: weaponName } })
  }

  // Conta se todos os picks obrigatórios estão resolvidos
  function allPicksDone() {
    if (!classEquipmentData) return true
    for (const choice of classEquipmentData.choices ?? []) {
      const sel = draft.classEquipmentChoices?.[choice.id]
      if (!sel) return false
      const opt = choice.options.find(o => o.value === sel)
      if (!opt) continue
      for (let i = 0; i < (opt.items ?? []).length; i++) {
        if (opt.items[i].pick && !draft.classEquipmentPicks?.[`${choice.id}:${sel}:${i}`]) return false
      }
    }
    for (let i = 0; i < (classEquipmentData.fixed ?? []).length; i++) {
      if (classEquipmentData.fixed[i].pick && !draft.classEquipmentPicks?.[`fixed:${classEquipmentData.fixed[i].name}`]) return false
    }
    return true
  }

  // Calcula preview final de itens
  function previewItems() {
    if (!classEquipmentData) return []
    const items = []
    for (const choice of classEquipmentData.choices ?? []) {
      const sel = draft.classEquipmentChoices?.[choice.id]
      if (!sel) continue
      const opt = choice.options.find(o => o.value === sel)
      if (!opt) continue
      ;(opt.items ?? []).forEach((item, idx) => {
        if (item.pick) {
          const picked = draft.classEquipmentPicks?.[`${choice.id}:${sel}:${idx}`]
          if (picked) items.push({ name: picked, qty: 1 })
        } else {
          items.push(item)
        }
      })
    }
    for (const item of classEquipmentData.fixed ?? []) {
      if (item.pick) {
        const picked = draft.classEquipmentPicks?.[`fixed:${item.name}`]
        if (picked) items.push({ name: picked, qty: 1 })
      } else {
        items.push(item)
      }
    }
    return items
  }

  const totalChoices = classEquipmentData?.choices?.length ?? 0
  const doneChoices  = (classEquipmentData?.choices ?? []).filter(c => !!draft.classEquipmentChoices?.[c.id]).length
  const picksOk      = allPicksDone()
  const allDone      = doneChoices === totalChoices && picksOk
  const preview      = isEquipment ? previewItems() : []

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-semibold">Equipamento Inicial</p>

      {/* Toggle equipamento × ouro */}
      <div className="flex gap-2">
        <button type="button"
          onClick={() => updateDraft({ classEquipmentChoice: 'equipment', classStartingGold: 0 })}
          className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
            isEquipment
              ? 'bg-amber-900/30 border-amber-700 text-amber-300'
              : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
          }`}>
          🎒 Equipamento da Classe
        </button>
        <button type="button"
          onClick={() => updateDraft({ classEquipmentChoice: 'gold' })}
          className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
            !isEquipment
              ? 'bg-amber-900/30 border-amber-700 text-amber-300'
              : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
          }`}>
          🪙 Ouro Inicial {selectedClass.gold_formula ? `(${selectedClass.gold_formula} PO)` : ''}
        </button>
      </div>

      {/* ── Opção: equipamento da classe ── */}
      {isEquipment && classEquipmentData && (
        <div className="space-y-2">
          {/* Indicador de progresso */}
          {totalChoices > 0 && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold ${
              allDone
                ? 'bg-green-900/20 border border-green-800/40 text-green-400'
                : 'bg-amber-900/20 border border-amber-800/40 text-amber-400'
            }`}>
              {allDone ? '✓ Todas as escolhas feitas' : `⚠ ${doneChoices}/${totalChoices} escolha${totalChoices > 1 ? 's' : ''} feita${doneChoices !== 1 ? 's' : ''}`}
            </div>
          )}

          {/* Grupos de escolha */}
          {(classEquipmentData.choices ?? []).map(choice => {
            const selected = draft.classEquipmentChoices?.[choice.id] ?? ''
            return (
              <div key={choice.id} className={`rounded-xl border p-3 space-y-2 transition-colors ${
                selected ? 'border-green-800/50 bg-green-900/10' : 'border-amber-700/50 bg-amber-900/10'
              }`}>
                <p className="text-[11px] font-semibold text-gray-400">
                  {choice.prompt}
                  {!selected && <span className="text-red-400 ml-1">*</span>}
                </p>

                <div className="flex flex-col gap-1.5">
                  {choice.options.map(opt => {
                    const isSelected = selected === opt.value
                    return (
                      <div key={opt.value}>
                        {/* Botão de opção */}
                        <button
                          type="button"
                          onClick={() => setOptionChoice(choice.id, opt.value)}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors flex items-start gap-2 ${
                            isSelected
                              ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                              : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full border-2 shrink-0 mt-0.5 ${
                            isSelected ? 'border-amber-400 bg-amber-500' : 'border-gray-600'
                          }`} />
                          <span className="flex-1 space-y-0.5">
                            <span className="font-medium block">{opt.label}</span>
                            {/* Linha de descrição dos itens */}
                            <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {opt.items.map((item, idx) => (
                                <span key={idx} className="text-[10px] text-gray-500">
                                  {item.pick
                                    ? <span className="text-blue-400">📌 {item.pickLabel ?? item.name} (à escolher)</span>
                                    : <>
                                        {item.qty > 1 ? `${item.qty}× ` : ''}<span className="text-gray-400">{item.name}</span>
                                        {item.desc && <span className="text-gray-600"> · {item.desc}</span>}
                                      </>
                                  }
                                </span>
                              ))}
                            </span>
                          </span>
                        </button>

                        {/* Sub-pickers — aparecem apenas se esta opção está selecionada e tem itens com pick */}
                        {isSelected && opt.items.map((item, itemIdx) => {
                          if (!item.pick) return null
                          const pickKey     = `${choice.id}:${opt.value}:${itemIdx}`
                          const pickedValue = draft.classEquipmentPicks?.[pickKey] ?? ''
                          return (
                            <div key={`pick-${itemIdx}`} className="mt-1.5 ml-5">
                              <p className="text-[10px] text-blue-400 font-semibold mb-1">
                                📌 {item.pickLabel ?? item.name}
                                {!pickedValue && <span className="text-red-400 ml-1">*</span>}
                                {pickedValue && <span className="text-green-400 ml-2">→ {pickedValue}</span>}
                              </p>
                              <WeaponPicker
                                category={item.pick}
                                pickKey={pickKey}
                                currentValue={pickedValue}
                                weaponsArmor={weaponsArmor}
                                onPick={setPick}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Itens fixos (incluindo picks fixos) */}
          {(classEquipmentData.fixed ?? []).length > 0 && (
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 space-y-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Incluído automaticamente</p>
              <div className="flex flex-wrap gap-1.5">
                {classEquipmentData.fixed.filter(i => !i.pick).map((item, i) => (
                  <span key={i} className="text-xs bg-gray-700/80 border border-gray-600/50 px-2 py-0.5 rounded-full text-gray-300"
                    title={item.desc ?? ''}>
                    {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                    {item.desc && <span className="text-gray-500 ml-1 text-[10px]">· {item.desc}</span>}
                  </span>
                ))}
              </div>
              {/* Picks fixos (ex: bruxo arma simples extra) */}
              {classEquipmentData.fixed.filter(i => i.pick).map((item, fixIdx) => {
                const pickKey     = `fixed:${item.name}`
                const pickedValue = draft.classEquipmentPicks?.[pickKey] ?? ''
                return (
                  <div key={`fixed-pick-${fixIdx}`}>
                    <p className="text-[10px] text-blue-400 font-semibold mb-1">
                      📌 {item.pickLabel ?? item.name} (à escolher)
                      {!pickedValue && <span className="text-red-400 ml-1">*</span>}
                      {pickedValue && <span className="text-green-400 ml-2">→ {pickedValue}</span>}
                    </p>
                    <WeaponPicker
                      category={item.pick}
                      pickKey={pickKey}
                      currentValue={pickedValue}
                      weaponsArmor={weaponsArmor}
                      onPick={setPick}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Resumo final */}
          {allDone && preview.length > 0 && (
            <div className="bg-blue-900/15 border border-blue-700/30 rounded-lg px-3 py-2">
              <p className="text-[10px] text-blue-400 mb-1.5 uppercase tracking-widest font-semibold">Equipamento final</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.map((item, i) => (
                  <span key={i} className="text-xs bg-blue-900/30 border border-blue-700/40 px-2 py-0.5 rounded-full text-blue-200">
                    {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Opção: ouro inicial ── */}
      {!isEquipment && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Fórmula de ouro inicial:</p>
            <p className="text-sm font-bold text-amber-300">{selectedClass.gold_formula ?? '5d4 × 10'} PO</p>
          </div>
          <button type="button"
            onClick={() => updateDraft({ classStartingGold: rollGoldFormula(selectedClass.gold_formula ?? '5d4 × 10') })}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs rounded-lg transition-colors">
            🎲 Rolar
          </button>
          {(draft.classStartingGold ?? 0) > 0 && (
            <span className="text-amber-300 font-bold text-lg">{draft.classStartingGold} PO</span>
          )}
        </div>
      )}
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
