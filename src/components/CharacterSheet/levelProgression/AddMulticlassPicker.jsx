// src/components/CharacterSheet/levelProgression/AddMulticlassPicker.jsx
// Picker de nova multiclasse: seletor de classe + warnings de pré-requisito
// (PHB p.163) + lista de proficiências ganhas + botão confirmar.
import { useState, useMemo } from 'react'
import { abbrOfKey } from '../../../domain/attributes'

export function AddMulticlassPicker({
  availableClasses, classes, mcRules, characterAttributes,
  onCancel, onConfirm,
}) {
  const [addMCClass, setAddMCClass] = useState('')

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

  function handleConfirm() {
    if (!addMCClass || !allPrereqsMet) return
    onConfirm({
      classIndex: addMCClass,
      proficiencies: mcRules[addMCClass]?.proficiencies ?? {},
    })
  }

  const selectedClassName = addMCClass
    ? (classes ?? []).find(c => c.index === addMCClass)?.name ?? addMCClass
    : ''

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
          disabled={!addMCClass || !allPrereqsMet}
          onClick={handleConfirm}
          title={!allPrereqsMet && addMCClass ? 'Pré-requisitos de atributo não atendidos (PHB p.163)' : undefined}
          className="flex-1 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {addMCClass && !allPrereqsMet
            ? 'Pré-requisitos não atendidos'
            : `Confirmar — ganhar proficiências e adicionar ${selectedClassName}`}
        </button>
      </div>
    </div>
  )
}
