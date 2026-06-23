// src/components/CharacterSheet/levelProgression/AddMulticlassPicker.jsx
// Picker de nova multiclasse: seletor de classe + warnings de pré-requisito
// (PHB p.163) + lista de proficiências ganhas + botão confirmar.
import { useState, useMemo, useEffect } from 'react'
import { abbrOfKey } from '../../../domain/attributes'
import { SKILLS } from '../../../../../utils/calculations'

export function AddMulticlassPicker({
  availableClasses, classes, mcRules, characterAttributes,
  ownedSkills = [],
  onCancel, onConfirm,
}) {
  const [addMCClass, setAddMCClass] = useState('')
  // Perícia(s) concedida(s) pela multiclasse (Bardo/Ladino/Patrulheiro — PHB p.164).
  const [chosenSkills, setChosenSkills] = useState([])

  // Reseta a escolha de perícias ao trocar de classe.
  useEffect(() => { setChosenSkills([]) }, [addMCClass])

  const { reqWarnings, orAttr, orMet, allPrereqsMet, addMCProfs } = useMemo(() => {
    const reqs  = addMCClass ? mcRules[addMCClass]?.prerequisites ?? {} : {}
    const profs = addMCClass ? mcRules[addMCClass]?.proficiencies ?? {} : {}
    const warnings = Object.entries(reqs)
      .filter(([k]) => k !== 'or')
      .map(([attr, val]) => {
        const actual = characterAttributes[attr] ?? 10
        return { attr, val, met: actual >= val }
      })
    const or = reqs.or
    const orOk = or ? (characterAttributes[or] ?? 10) >= (reqs[or] ?? 13) : true
    return {
      reqWarnings: warnings,
      orAttr: or,
      orMet: orOk,
      allPrereqsMet: addMCClass ? warnings.every(r => r.met) && orOk : false,
      addMCProfs: profs,
    }
  }, [addMCClass, mcRules, characterAttributes])

  const selectedClass = addMCClass
    ? (classes ?? []).find(c => c.index === addMCClass) ?? null
    : null
  const selectedClassName = selectedClass?.name ?? addMCClass

  // Perícia(s) da multiclasse: opções vêm de `skill_choices.from` (nomes PT);
  // "qualquer ..." (Bardo) libera as 18. Perícias já proficientes (classe
  // primária/antecedente) são desabilitadas — não dá pra ganhar duas vezes.
  const skillsLimit = addMCProfs.skills ?? 0
  const fromNames = selectedClass?.skill_choices?.from ?? []
  const anySkill = fromNames.some(n => /qualquer/i.test(n))
  const skillOptions = SKILLS.filter(s => anySkill || fromNames.includes(s.name))
  const ownedSet = new Set(ownedSkills)
  const skillsComplete = skillsLimit === 0 || chosenSkills.length === skillsLimit
  const atSkillLimit = chosenSkills.length >= skillsLimit

  function toggleSkill(key) {
    if (chosenSkills.includes(key)) setChosenSkills(chosenSkills.filter(k => k !== key))
    else if (!atSkillLimit && !ownedSet.has(key)) setChosenSkills([...chosenSkills, key])
  }

  const canConfirm = !!addMCClass && allPrereqsMet && skillsComplete

  function handleConfirm() {
    if (!canConfirm) return
    onConfirm({
      classIndex: addMCClass,
      proficiencies: mcRules[addMCClass]?.proficiencies ?? {},
      chosenSkills,
    })
  }

  return (
    <div className="bg-gray-800 border border-amber-700/50 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-amber-400">Adicionar Multiclasse</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-lg">✕</button>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Escolha a classe:</label>
        <select
          value={addMCClass}
          onChange={e => setAddMCClass(e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-600"
        >
          <option value="">— Selecione —</option>
          {availableClasses.map(c => (
            <option key={c.index} value={c.index}>{c.name}</option>
          ))}
        </select>
      </div>

      {addMCClass && (
        <>
          {/* Pré-requisitos */}
          {reqWarnings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Pré-requisitos (LdJ Cap. 6)</p>
              <div className="flex flex-wrap gap-2">
                {reqWarnings.map(({ attr, val, met }) => (
                  <div key={attr} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                    met ? 'border-green-700 bg-green-900/20 text-green-300' : 'border-yellow-700 bg-yellow-900/20 text-yellow-300'
                  }`}>
                    {met ? '✓' : '⚠'} {abbrOfKey(attr) ?? attr.toUpperCase()} {val}+
                    <span className="text-gray-500">({characterAttributes[attr] ?? 10})</span>
                  </div>
                ))}
                {orAttr && (
                  <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                    orMet ? 'border-green-700 bg-green-900/20 text-green-300' : 'border-yellow-700 bg-yellow-900/20 text-yellow-300'
                  }`}>
                    {orMet ? '✓' : '⚠'} ou {abbrOfKey(orAttr) ?? orAttr.toUpperCase()} 13+
                    <span className="text-gray-500">({characterAttributes[orAttr] ?? 10})</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Proficiências ganhas */}
          {(addMCProfs.armor?.length > 0 || addMCProfs.weapons?.length > 0 || addMCProfs.tools?.length > 0 || addMCProfs.skills > 0) && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Proficiências ganhas ao entrar nessa classe</p>
              <div className="flex flex-wrap gap-1.5">
                {addMCProfs.armor?.map((a, i) => (
                  <span key={i} className="text-xs bg-blue-900/30 border border-blue-700/50 text-blue-300 px-2 py-0.5 rounded-full">
                    Armadura: {a}
                  </span>
                ))}
                {addMCProfs.weapons?.map((w, i) => (
                  <span key={i} className="text-xs bg-orange-900/30 border border-orange-700/50 text-orange-300 px-2 py-0.5 rounded-full">
                    Arma: {w}
                  </span>
                ))}
                {addMCProfs.tools?.map((t, i) => (
                  <span key={i} className="text-xs bg-purple-900/30 border border-purple-700/50 text-purple-300 px-2 py-0.5 rounded-full">
                    Ferramenta: {t}
                  </span>
                ))}
                {addMCProfs.skills > 0 && (
                  <span className="text-xs bg-green-900/30 border border-green-700/50 text-green-300 px-2 py-0.5 rounded-full">
                    +{addMCProfs.skills} perícia(s)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Seletor de perícia(s) da multiclasse */}
          {skillsLimit > 0 && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                Escolha {skillsLimit} perícia(s){' '}
                <span className={chosenSkills.length === skillsLimit ? 'text-green-400' : 'text-yellow-400'}>
                  ({chosenSkills.length}/{skillsLimit})
                </span>
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {skillOptions.map(s => {
                  const isChosen = chosenSkills.includes(s.key)
                  const owned = ownedSet.has(s.key)
                  const disabled = owned || (!isChosen && atSkillLimit)
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSkill(s.key)}
                      disabled={disabled}
                      title={owned ? 'Já proficiente por outra fonte' : undefined}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs text-left transition-colors ${
                        isChosen
                          ? 'border-amber-600 bg-amber-900/30 text-amber-200'
                          : disabled
                          ? 'border-gray-700 bg-gray-800/50 text-gray-600 opacity-50 cursor-not-allowed'
                          : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-amber-700 cursor-pointer'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                        isChosen ? 'border-amber-500 bg-amber-600' : 'border-gray-600'
                      }`}>
                        {isChosen && <span className="text-white text-[10px]">✓</span>}
                      </span>
                      <span className="flex-1">{s.name}{owned ? ' 🎒' : ''}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
        >
          Cancelar
        </button>
        <button
          disabled={!canConfirm}
          onClick={handleConfirm}
          title={!allPrereqsMet && addMCClass ? 'Pré-requisitos de atributo não atendidos (PHB p.163)' : undefined}
          className="flex-1 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {addMCClass && !allPrereqsMet
            ? 'Pré-requisitos não atendidos'
            : addMCClass && !skillsComplete
            ? `Escolha ${skillsLimit} perícia(s)`
            : `Confirmar — ganhar proficiências e adicionar ${selectedClassName}`}
        </button>
      </div>
    </div>
  )
}
