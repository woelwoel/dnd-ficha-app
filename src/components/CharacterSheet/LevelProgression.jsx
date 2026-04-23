import { useState, useEffect, useRef, useCallback } from 'react'
import { DetailsModal } from '../DetailsModal'
import { CantripsGrantPicker } from '../CantripsGrantPicker'
import { ABILITY_SCORES, getModifier, formatModifier } from '../../utils/calculations'
import { abbrOfKey } from '../../domain/attributes'
import { calculateMulticlassSpellSlots } from '../../utils/spellcasting'

/* ── Helpers ────────────────────────────────────────────────────────── */

function isASIEntry(entry) {
  return entry?.features?.some(f => f.name?.includes('Aumento') || f.name?.includes('Melhoria'))
}

function calcHpAverage(hitDie, conMod) {
  return Math.max(1, Math.floor(hitDie / 2) + 1 + conMod)
}
function calcHpMax(hitDie, conMod) {
  return Math.max(1, hitDie + conMod)
}
function rollDie(sides) {
  return Math.ceil(Math.random() * sides)
}


/* ── Timeline 1-20 ─────────────────────────────────────────────────── */
function LevelTimeline({ currentLevel, levels, onJump }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-lvl="${currentLevel}"]`)
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [currentLevel])

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto pb-1 pt-2 px-1">
        {Array.from({ length: 20 }, (_, i) => i + 1).map(lvl => {
          const entry     = levels?.find(l => l.level === lvl)
          const isASI     = isASIEntry(entry)
          const isCurrent = lvl === currentLevel
          const isPast    = lvl < currentLevel

          return (
            <button
              key={lvl}
              data-lvl={lvl}
              onClick={() => onJump(lvl)}
              title={`Nível ${lvl}${isASI ? ' · Aumento de Habilidade' : ''}`}
              className={`relative shrink-0 w-8 h-8 rounded-full text-xs font-bold border-2 transition-all ${
                isCurrent
                  ? 'bg-amber-600 border-amber-400 text-white scale-110 shadow-lg shadow-amber-900/40'
                  : isPast
                  ? 'bg-gray-700 border-gray-600 text-gray-400 hover:border-amber-600/50'
                  : 'bg-gray-900 border-gray-700 text-gray-600 hover:border-gray-500'
              }`}
            >
              {lvl}
              {isASI && (
                <span className="absolute -top-1.5 -right-1 text-[9px] text-amber-400 font-black leading-none">★</span>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-gray-600 mt-1">★ = Aumento de Habilidade disponível</p>
    </div>
  )
}

/* ── HP Section ─────────────────────────────────────────────────────── */
function HPSection({ hitDie, conMod, hpGain, onHpChange }) {
  const avg  = calcHpAverage(hitDie, conMod)
  const max  = calcHpMax(hitDie, conMod)
  const [rolled, setRolled] = useState(null)

  function handleRoll() {
    const result = Math.max(1, rollDie(hitDie) + conMod)
    setRolled(result)
    onHpChange(result)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        Dado de vida: <span className="text-amber-300 font-bold">d{hitDie}</span>
        {conMod !== 0 && <span className="ml-2">CON {formatModifier(conMod)}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setRolled(null); onHpChange(avg) }}
          className={`flex flex-col items-center px-4 py-2 rounded border-2 transition-all ${
            hpGain === avg && rolled === null
              ? 'border-amber-500 bg-amber-900/30 text-amber-200'
              : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
          }`}
        >
          <span className="text-xs text-gray-400">Média</span>
          <span className="text-xl font-black">+{avg}</span>
        </button>
        <button
          onClick={() => { setRolled(null); onHpChange(max) }}
          className={`flex flex-col items-center px-4 py-2 rounded border-2 transition-all ${
            hpGain === max && rolled === null
              ? 'border-amber-500 bg-amber-900/30 text-amber-200'
              : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
          }`}
        >
          <span className="text-xs text-gray-400">Máximo</span>
          <span className="text-xl font-black">+{max}</span>
        </button>
        <button
          onClick={handleRoll}
          className={`flex flex-col items-center px-4 py-2 rounded border-2 transition-all ${
            rolled !== null
              ? 'border-green-500 bg-green-900/20 text-green-200'
              : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
          }`}
        >
          <span className="text-xs text-gray-400">Rolar 1d{hitDie}</span>
          <span className="text-xl font-black">{rolled !== null ? `+${rolled}` : '🎲'}</span>
        </button>
      </div>
      {hpGain != null && (
        <p className="text-sm text-green-400 font-semibold">Ganho selecionado: +{hpGain} PV</p>
      )}
    </div>
  )
}

/* ── ASI Picker ─────────────────────────────────────────────────────── */
function ASIPicker({ attributes, onBoostsChange }) {
  const [mode, setMode]   = useState('single')
  const [pick1, setPick1] = useState(null)
  const [pick2, setPick2] = useState(null)

  const finalize = useCallback((p1, p2, m) => {
    const boosts = {}
    if (m === 'single') {
      if (p1) boosts[p1] = 2
    } else {
      if (p1) boosts[p1] = (boosts[p1] || 0) + 1
      if (p2 && p2 !== p1) boosts[p2] = (boosts[p2] || 0) + 1
    }
    onBoostsChange(boosts)
  }, [onBoostsChange])

  function switchMode(m) {
    setMode(m); setPick1(null); setPick2(null); onBoostsChange({})
  }

  function selectSingle(key) {
    const v = pick1 === key ? null : key
    setPick1(v)
    finalize(v, null, 'single')
  }

  function selectSplit(slot, key) {
    const v = (slot === 0 ? pick1 : pick2) === key ? null : key
    const p1 = slot === 0 ? v : pick1
    const p2 = slot === 1 ? v : pick2
    setPick1(p1); setPick2(p2)
    finalize(p1, p2, 'split')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[['single', '+2 em um atributo'], ['split', '+1+1 em dois atributos']].map(([m, label]) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`text-xs px-3 py-1.5 rounded transition-colors ${
              mode === m ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'single' && (
        <div className="flex flex-wrap gap-2">
          {ABILITY_SCORES.map(({ key, abbr }) => {
            const cur = attributes[key], atMax = cur >= 20, sel = pick1 === key
            return (
              <button key={key} disabled={atMax} onClick={() => selectSingle(key)}
                className={`flex flex-col items-center px-3 py-2 rounded border-2 text-xs transition-all min-w-[52px] ${
                  atMax ? 'opacity-30 cursor-not-allowed border-gray-700 bg-gray-800' :
                  sel ? 'border-amber-400 bg-amber-900/40 text-amber-200' :
                  'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-400'
                }`}>
                <span className="font-bold text-sm">{abbr}</span>
                <span className="text-gray-400">{cur}</span>
                {sel && <span className="text-green-400 font-bold">→ {Math.min(20, cur + 2)}</span>}
                {atMax && <span className="text-gray-500">máx</span>}
              </button>
            )
          })}
        </div>
      )}
      {mode === 'split' && (
        <div className="space-y-3">
          {[{ slot: 0, label: '1° +1', pick: pick1, other: pick2 },
            { slot: 1, label: '2° +1', pick: pick2, other: pick1 }].map(({ slot, label, pick, other }) => (
            <div key={slot}>
              <p className="text-xs text-gray-400 mb-1.5">{label}</p>
              <div className="flex flex-wrap gap-1.5">
                {ABILITY_SCORES.map(({ key, abbr }) => {
                  const cur = attributes[key], atMax = cur >= 20, taken = key === other, sel = pick === key
                  return (
                    <button key={key} disabled={atMax || taken} onClick={() => selectSplit(slot, key)}
                      className={`flex flex-col items-center px-2.5 py-1.5 rounded border text-[11px] transition-all ${
                        atMax || taken ? 'opacity-25 cursor-not-allowed border-gray-700 bg-gray-800' :
                        sel ? 'border-amber-400 bg-amber-900/40 text-amber-200' :
                        'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-400'
                      }`}>
                      <span className="font-bold">{abbr}</span>
                      {sel
                        ? <span className="text-green-400">{cur}→{Math.min(20, cur + 1)}</span>
                        : <span className="text-gray-400">{cur}</span>
                      }
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Wizard de Level Up ─────────────────────────────────────────────── */
function LevelUpPanel({ nextLevel, nextEntry, hitDie, conMod, attributes, onConfirm, onCancel, levelChoices, currentChosenFeatures, allowFeats = false }) {
  const [hpGain,              setHpGain]              = useState(null)
  const [boosts,              setBoosts]              = useState({})
  const [newChoices,          setNewChoices]          = useState({})
  const [bonusCantripsChosen, setBonusCantripsChosen] = useState([])
  const [featModal,           setFeatModal]           = useState(null)
  const [infoModal,           setInfoModal]           = useState(null)
  // Modo ASI vs Talento
  const [asiMode,             setAsiMode]             = useState('asi') // 'asi' | 'feat'
  const [feats,               setFeats]               = useState([])
  const [selectedFeatIdx,     setSelectedFeatIdx]     = useState(null)
  const [featSearch,          setFeatSearch]          = useState('')

  useEffect(() => {
    if (allowFeats) {
      fetch('/srd-data/phb-feats-pt.json').then(r => r.json()).then(setFeats).catch(() => {})
    }
  }, [allowFeats])

  const newFeatures = nextEntry?.features?.filter(f => !f.name?.includes('Aumento') && !f.name?.includes('Melhoria')) ?? []
  const hasASI      = isASIEntry(nextEntry)

  const chosenFeat  = selectedFeatIdx !== null ? feats[selectedFeatIdx] : null
  // ASI pronto: se modo ASI precisam boosts; se modo talento precisa ter selecionado um talento
  const asiReady    = !hasASI || (asiMode === 'asi' ? Object.keys(boosts).length > 0 : chosenFeat !== null)

  const choicesForLevel = (levelChoices ?? []).filter(c => c.level === nextLevel)
  const choicesReady = choicesForLevel.every(c => !!(newChoices[c.id] ?? currentChosenFeatures?.[c.id]))

  // Soma cantrips bônus necessários de todas as choices selecionadas neste nível
  const bonusCantripsNeeded = choicesForLevel.reduce((sum, choice) => {
    const val = newChoices[choice.id] ?? currentChosenFeatures?.[choice.id] ?? ''
    const opt = choice.options.find(o => o.value === val)
    return sum + (opt?.grants?.bonusCantrips ?? 0)
  }, 0)
  const bonusCantripsReady = bonusCantripsChosen.length >= bonusCantripsNeeded

  const canCommit = hpGain != null && asiReady && choicesReady && bonusCantripsReady

  const newProfBonus = nextEntry?.proficiency_bonus
  const oldProfBonus = Math.ceil((nextLevel - 1) / 4) + 1

  // Filtra talentos pelo pré-requisito e busca
  const filteredFeats = feats.filter(f => {
    if (featSearch.trim()) {
      if (!f.name.toLowerCase().includes(featSearch.toLowerCase())) return false
    }
    if (!f.prereq) return true
    if (f.prereq.type === 'ability') {
      return (attributes[f.prereq.ability] ?? 10) >= f.prereq.min
    }
    if (f.prereq.type === 'ability_or') {
      return f.prereq.abilities.some(a => (attributes[a.ability] ?? 10) >= a.min)
    }
    return true
  })

  return (
    <div className="bg-gray-800 border border-amber-700 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-amber-400">Subindo para Nível {nextLevel}!</h3>
          {newProfBonus > oldProfBonus && (
            <p className="text-xs text-green-400 mt-0.5">
              Bônus de proficiência: +{oldProfBonus} → +{newProfBonus}
            </p>
          )}
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-xl leading-none">✕</button>
      </div>

      {/* Pontos de Vida */}
      <div>
        <h4 className="text-sm font-bold text-amber-300 mb-2">❤️ Pontos de Vida</h4>
        <HPSection hitDie={hitDie} conMod={conMod} hpGain={hpGain} onHpChange={setHpGain} />
      </div>

      {/* Escolhas de características */}
      {choicesForLevel.map(choice => {
        const currentVal = newChoices[choice.id] ?? currentChosenFeatures?.[choice.id] ?? ''
        return (
          <div key={choice.id} className="space-y-2">
            <h4 className="text-sm font-bold text-amber-300">🎭 {choice.featureName} <span className="text-red-400 font-normal text-xs">*</span></h4>
            <p className="text-xs text-gray-400">{choice.prompt}</p>
            <div className="flex flex-col gap-1.5">
              {choice.options.map(opt => (
                <div key={opt.value} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setNewChoices(prev => ({ ...prev, [choice.id]: opt.value })); setBonusCantripsChosen([]) }}
                    className={`flex-1 text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                      currentVal === opt.value
                        ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                        : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${currentVal === opt.value ? 'border-amber-400 bg-amber-500' : 'border-gray-600'}`} />
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
                    className="w-7 h-7 rounded-full bg-gray-700 hover:bg-amber-800 text-amber-400 text-xs font-bold shrink-0"
                    title="Ver descrição"
                  >ℹ</button>
                </div>
              ))}
            </div>
            {/* Picker de cantrips bônus */}
            {bonusCantripsNeeded > 0 && currentVal && (
              <CantripsGrantPicker
                needed={bonusCantripsNeeded}
                chosen={bonusCantripsChosen}
                onChosenChange={setBonusCantripsChosen}
              />
            )}
          </div>
        )
      })}

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

      {/* Novas Características */}
      {newFeatures.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-amber-300 mb-2">✨ Novas Características</h4>
          <div className="flex flex-wrap gap-2">
            {newFeatures.map((f, i) => (
              <button
                key={i}
                onClick={() => setFeatModal(f)}
                className="text-xs bg-gray-700 border border-gray-600 hover:border-amber-600 px-3 py-1.5 rounded text-amber-200 transition-colors"
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ASI / Talento */}
      {hasASI && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-amber-300">⬆️ Melhoria de Atributo{allowFeats ? ' ou Talento' : ''}</h4>

          {/* Toggle ASI vs Talento */}
          {allowFeats && (
            <div className="flex gap-2">
              {[['asi', '📈 Melhorar Atributos'], ['feat', '🌟 Escolher Talento']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => { setAsiMode(mode); setBoosts({}); setSelectedFeatIdx(null) }}
                  className={`text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
                    asiMode === mode
                      ? 'bg-amber-700 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Modo ASI */}
          {(!allowFeats || asiMode === 'asi') && (
            <ASIPicker attributes={attributes} onBoostsChange={setBoosts} />
          )}

          {/* Modo Talento */}
          {allowFeats && asiMode === 'feat' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Buscar talento..."
                value={featSearch}
                onChange={e => setFeatSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-600"
              />
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {filteredFeats.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">Nenhum talento encontrado.</p>
                )}
                {filteredFeats.map((feat) => {
                  const realIdx = feats.indexOf(feat)
                  const sel = selectedFeatIdx === realIdx
                  return (
                    <button
                      key={feat.index}
                      type="button"
                      onClick={() => setSelectedFeatIdx(sel ? null : realIdx)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        sel
                          ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                          : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-sm">{feat.name}</span>
                          {feat.prereq && (
                            <span className="ml-2 text-[10px] text-gray-500">
                              {feat.prereq.type === 'spellcasting' && '(requer conjuração)'}
                              {feat.prereq.type === 'ability' && `(requer ${feat.prereq.ability.toUpperCase()} ${feat.prereq.min}+)`}
                              {feat.prereq.type === 'ability_or' && `(requer atributo ${feat.prereq.abilities[0].min}+)`}
                              {feat.prereq.type === 'proficiency' && '(requer proficiência)'}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setFeatModal(feat) }}
                          className="w-6 h-6 shrink-0 rounded-full bg-gray-700 hover:bg-amber-800 text-amber-400 text-xs font-bold"
                          title="Ver descrição"
                        >ℹ</button>
                      </div>
                      {sel && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{feat.desc}</p>
                      )}
                    </button>
                  )
                })}
              </div>
              {chosenFeat && (
                <p className="text-xs text-green-400 font-semibold">✓ Talento selecionado: {chosenFeat.name}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de descrição do talento */}
      <DetailsModal isOpen={!!featModal && featModal !== featModal?.features} onClose={() => setFeatModal(null)} title={featModal?.name ?? ''}>
        {featModal && (
          <p className="text-sm text-gray-300 leading-relaxed">{featModal.desc}</p>
        )}
      </DetailsModal>

      {/* Spell slots */}
      {nextEntry?.spell_slots?.some(s => s > 0) && (
        <div>
          <h4 className="text-sm font-bold text-amber-300 mb-1.5">🔮 Espaços de Magia</h4>
          <div className="flex flex-wrap gap-1.5">
            {nextEntry.spell_slots.map((n, i) =>
              n > 0 ? (
                <span key={i} className="text-xs bg-gray-700 border border-gray-600 px-2 py-0.5 rounded text-gray-300">
                  {i + 1}°: {n}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm">
          Cancelar
        </button>
        <button
          disabled={!canCommit}
          onClick={() => canCommit && onConfirm({
            newLevel: nextLevel,
            hpIncrease: hpGain,
            attrBoosts: asiMode === 'asi' ? boosts : {},
            newChoices,
            bonusSpells: bonusCantripsChosen,
            chosenFeat: asiMode === 'feat' ? chosenFeat : null,
          })}
          className={`flex-1 py-2 rounded text-sm font-bold transition-all ${
            canCommit
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {!canCommit
            ? (!hpGain ? 'Escolha o ganho de PV'
              : !choicesReady ? 'Escolha sua característica'
              : !bonusCantripsReady ? `Escolha ${bonusCantripsNeeded - bonusCantripsChosen.length} truque(s) bônus`
              : asiMode === 'feat' ? 'Escolha um talento' : 'Escolha a melhoria de atributo')
            : `Confirmar Subida para Nível ${nextLevel}`
          }
        </button>
      </div>
    </div>
  )
}

/* ── Features adquiridas ────────────────────────────────────────────── */
function AcquiredFeatures({ levels, currentLevel, onFeatureClick }) {
  const [open, setOpen] = useState(false)
  const acquired = []
  for (const entry of levels) {
    if (entry.level > currentLevel) break
    for (const f of (entry.features ?? [])) acquired.push({ ...f, level: entry.level })
  }
  if (!acquired.length) return null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-300 hover:text-white"
      >
        <span>Características Adquiridas <span className="text-gray-500 font-normal text-xs">({acquired.length})</span></span>
        <span className="text-gray-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {acquired.map((f, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] text-gray-600 shrink-0 w-8 text-right">Nv{f.level}</span>
              <button
                onClick={() => onFeatureClick(f)}
                className="text-xs text-amber-300 hover:text-amber-200 text-left underline decoration-dotted leading-tight"
              >
                {f.name}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Painel de progressão por classe ────────────────────────────────── */
function ClassProgressionPanel({
  progression, currentLevel, hitDie, conMod, attributes, isMulticlass,
  onLevelChange, onApplyLevelUp, multiclassIndex,
  levelChoices, chosenFeatures, allowFeats = false,
}) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [showAll,    setShowAll]    = useState(false)
  const [jumpLevel,  setJumpLevel]  = useState(null)
  const [selectedFeat, setSelectedFeat] = useState(null)

  const levels      = progression?.levels ?? []
  const currentEntry = levels.find(l => l.level === currentLevel)
  const nextEntry    = levels.find(l => l.level === currentLevel + 1)
  const focusEntry   = jumpLevel ? levels.find(l => l.level === jumpLevel) : null
  const focusLvl     = jumpLevel ?? currentLevel
  const visibleLevels = showAll
    ? levels
    : levels.filter(l => l.level >= Math.max(1, focusLvl - 1) && l.level <= Math.min(20, focusLvl + 6))

  function handleConfirmLevelUp(payload) {
    onApplyLevelUp?.({ ...payload, multiclassIndex: multiclassIndex ?? null })
    setWizardOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho da classe selecionada */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-gray-400 mt-0.5">
            Nível atual: <span className="text-white font-bold text-base">{currentLevel}</span>
            <span className="mx-2 text-gray-600">·</span>
            Proficiência: <span className="text-white font-semibold">+{currentEntry?.proficiency_bonus ?? Math.ceil(currentLevel / 4) + 1}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {!isMulticlass && currentLevel > 1 && (
            <button
              onClick={() => onLevelChange?.(currentLevel - 1)}
              className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-400"
            >
              − Nível {currentLevel - 1}
            </button>
          )}
          {currentLevel < 20 && !wizardOpen && (
            <button
              onClick={() => setWizardOpen(true)}
              className="text-xs px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              Subir para Nível {currentLevel + 1} →
            </button>
          )}
        </div>
      </div>

      {/* Wizard de Level Up */}
      {wizardOpen && nextEntry && (
        <LevelUpPanel
          nextLevel={currentLevel + 1}
          nextEntry={nextEntry}
          hitDie={hitDie}
          conMod={conMod}
          attributes={attributes}
          levelChoices={levelChoices}
          currentChosenFeatures={chosenFeatures}
          onConfirm={handleConfirmLevelUp}
          onCancel={() => setWizardOpen(false)}
          allowFeats={allowFeats}
        />
      )}

      {/* Timeline */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Linha do Tempo</p>
        <LevelTimeline
          currentLevel={currentLevel}
          levels={levels}
          onJump={lvl => { setJumpLevel(lvl === jumpLevel ? null : lvl); setShowAll(false) }}
        />
      </div>

      {/* Preview do nível focado */}
      {focusEntry && focusEntry.level !== currentLevel && (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-amber-300">
              Nível {focusEntry.level}
              {focusEntry.level > currentLevel && <span className="text-gray-500 text-xs ml-2">(futuro)</span>}
              {focusEntry.level < currentLevel && <span className="text-gray-500 text-xs ml-2">(passado)</span>}
            </p>
            <button onClick={() => setJumpLevel(null)} className="text-xs text-gray-500 hover:text-gray-300">✕ fechar</button>
          </div>
          {focusEntry.features?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {focusEntry.features.map((f, i) => (
                <button key={i} onClick={() => setSelectedFeat(f)}
                  className="text-xs bg-gray-700 border border-gray-600 hover:border-amber-600 px-2.5 py-1 rounded text-amber-200">
                  {f.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">Sem novas características neste nível.</p>
          )}
          {focusEntry.spell_slots?.some(s => s > 0) && (
            <div className="flex flex-wrap gap-1">
              {focusEntry.spell_slots.map((n, i) =>
                n > 0 ? (
                  <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                    {i + 1}°: {n}
                  </span>
                ) : null
              )}
            </div>
          )}
        </div>
      )}

      {/* Features adquiridas */}
      <AcquiredFeatures levels={levels} currentLevel={currentLevel} onFeatureClick={setSelectedFeat} />

      {/* Tabela de progressão */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progressão Completa</p>
          <button onClick={() => setShowAll(v => !v)} className="text-xs text-amber-500 hover:text-amber-300">
            {showAll ? 'Mostrar resumo' : 'Ver todos os 20 níveis'}
          </button>
        </div>
        <div className="divide-y divide-gray-700">
          {visibleLevels.map(entry => {
            const isCurrent = entry.level === currentLevel
            const isPast    = entry.level < currentLevel
            const isASI     = isASIEntry(entry)
            return (
              <div
                key={entry.level}
                className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${
                  isCurrent ? 'bg-amber-900/20 border-l-2 border-amber-500' : isPast ? 'opacity-60' : ''
                }`}
              >
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border ${
                  isCurrent ? 'bg-amber-600 border-amber-400 text-white'
                  : isPast ? 'bg-gray-700 border-gray-600 text-gray-400'
                  : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}>
                  {entry.level}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="text-xs text-gray-500">Prof +{entry.proficiency_bonus}</span>
                    {isASI && <span className="text-xs text-amber-400">★ Aumento de Habilidade</span>}
                    {entry.features?.filter(f => !f.name?.includes('Aumento')).map((f, i) => (
                      <button key={i} onClick={() => setSelectedFeat(f)}
                        className="text-xs text-amber-300 hover:text-amber-200 underline decoration-dotted">
                        {f.name}
                      </button>
                    ))}
                    {!entry.features?.length && !isASI && <span className="text-xs text-gray-600 italic">—</span>}
                  </div>
                  {entry.spell_slots?.some(s => s > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.spell_slots.map((n, i) =>
                        n > 0 ? (
                          <span key={i} className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">
                            {i + 1}°:{n}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {!showAll && (
          <p className="text-[10px] text-center text-gray-600 py-2 border-t border-gray-700">
            Exibindo níveis próximos ao atual.{' '}
            <button onClick={() => setShowAll(true)} className="text-amber-600 hover:text-amber-400">Ver todos</button>
          </p>
        )}
      </div>

      <DetailsModal isOpen={!!selectedFeat} onClose={() => setSelectedFeat(null)} title={selectedFeat?.name || ''}>
        {selectedFeat && (
          <p className="text-sm text-gray-300 leading-relaxed">
            {selectedFeat.desc || 'Consulte o Livro do Jogador para a descrição completa desta característica.'}
          </p>
        )}
      </DetailsModal>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════════════ */
export function LevelProgression({ character, classData, classes, onLevelChange, onApplyLevelUp, onAddMulticlass, onRemoveMulticlass, onNavigateToSpells, allowMulticlass = true, allowFeats = false }) {
  const [allProgressions, setAllProgressions] = useState(null)
  const [classChoices,    setClassChoices]    = useState({})
  const [mcRules,         setMcRules]         = useState({})
  const [activeTab,       setActiveTab]       = useState('primary')
  const [showAddMC,       setShowAddMC]       = useState(false)
  const [addMCClass,      setAddMCClass]      = useState('')

  const classIndex   = character.info.class
  const currentLevel = character.info.level
  const multiclasses = character.info.multiclasses ?? []
  const chosenFeatures = character.info.chosenFeatures ?? {}
  const conMod       = getModifier(character.attributes.con)
  const hitDie       = classData?.hit_die ?? 8

  const totalLevel = currentLevel + multiclasses.reduce((s, m) => s + (m.level ?? 0), 0)

  useEffect(() => {
    fetch('/srd-data/phb-class-progression-pt.json')
      .then(r => r.json()).then(setAllProgressions).catch(() => setAllProgressions({}))
    fetch('/srd-data/phb-class-choices-pt.json')
      .then(r => r.json()).then(setClassChoices).catch(() => setClassChoices({}))
    fetch('/srd-data/phb-multiclass-pt.json')
      .then(r => r.json()).then(setMcRules).catch(() => setMcRules({}))
  }, [])

  if (!classIndex) {
    return <div className="text-center py-16 text-gray-500">Selecione uma classe na aba Ficha para ver a progressão de nível.</div>
  }
  if (!allProgressions) {
    return <div className="text-center py-10 text-gray-500">Carregando progressão...</div>
  }

  const progression = allProgressions[classIndex] ?? null
  if (!progression) {
    return <div className="text-center py-10 text-gray-500">Dados de progressão não encontrados para esta classe.</div>
  }

  const usedClasses     = new Set([classIndex, ...multiclasses.map(m => m.class)])
  const availableForMC  = (classes ?? []).filter(c => !usedClasses.has(c.index))
  const fusedSlots      = multiclasses.length > 0
    ? calculateMulticlassSpellSlots(classIndex, currentLevel, multiclasses)
    : null

  // Pré-requisitos para a classe de MC selecionada no picker
  const addMCReqs = addMCClass ? mcRules[addMCClass]?.prerequisites ?? {} : {}
  const addMCProfs = addMCClass ? mcRules[addMCClass]?.proficiencies ?? {} : {}
  const reqWarnings = Object.entries(addMCReqs)
    .filter(([k]) => k !== 'or')
    .map(([attr, val]) => {
      const actual = character.attributes[attr] ?? 10
      return { attr, val, met: actual >= val }
    })
  const orAttr = addMCReqs.or
  const orMet = orAttr ? (character.attributes[orAttr] ?? 10) >= (addMCReqs[orAttr] ?? 13) : true

  function handleConfirmAddMC() {
    if (!addMCClass) return
    const mcProfs = mcRules[addMCClass]?.proficiencies ?? {}
    onAddMulticlass?.({ classIndex: addMCClass, proficiencies: mcProfs })
    setAddMCClass('')
    setShowAddMC(false)
    setActiveTab(multiclasses.length) // switch to the new mc tab
  }

  // Determine se active tab ainda existe
  const tabExists = activeTab === 'primary' || (typeof activeTab === 'number' && activeTab < multiclasses.length)
  const safeTab = tabExists ? activeTab : 'primary'

  return (
    <div className="space-y-5">

      {/* ── Nível Total em destaque ── */}
      {multiclasses.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-5 py-3 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[10px] text-amber-600 uppercase tracking-widest font-semibold">Nível Total</p>
            <p className="text-3xl font-black text-amber-300">{totalLevel}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Classe Principal</p>
              <p className="text-sm font-bold text-white">
                {(classes ?? []).find(c => c.index === classIndex)?.name ?? progression.name}{' '}
                <span className="text-amber-400">{currentLevel}</span>
              </p>
            </div>
            {multiclasses.map((mc, idx) => {
              const mcName = (classes ?? []).find(c => c.index === mc.class)?.name ?? mc.class
              return (
                <div key={idx}>
                  <p className="text-[10px] text-gray-500 uppercase">Multiclasse {idx + 1}</p>
                  <p className="text-sm font-bold text-white">{mcName} <span className="text-amber-400">{mc.level}</span></p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Abas por classe ── */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {/* Aba classe primária */}
        <button
          onClick={() => setActiveTab('primary')}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition-colors ${
            safeTab === 'primary'
              ? 'border-amber-500 text-amber-300 bg-amber-900/20'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          <span>{(classes ?? []).find(c => c.index === classIndex)?.name ?? progression.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
            safeTab === 'primary' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}>{currentLevel}</span>
        </button>

        {/* Abas de multiclasses */}
        {multiclasses.map((mc, idx) => {
          const mcClassName = (classes ?? []).find(c => c.index === mc.class)?.name ?? mc.class
          const isActive = safeTab === idx
          return (
            <div key={idx} className="relative shrink-0 flex items-center">
              <button
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-1.5 px-3 pr-7 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition-colors ${
                  isActive
                    ? 'border-amber-500 text-amber-300 bg-amber-900/20'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span>{mcClassName}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}>{mc.level}</span>
              </button>
              <button
                onClick={() => { onRemoveMulticlass?.(idx); if (isActive) setActiveTab('primary') }}
                className="absolute right-1 text-gray-500 hover:text-red-400 transition-colors text-xs w-5 h-5 flex items-center justify-center"
                aria-label={`Remover ${mcClassName}`}
                title="Remover multiclasse"
              >×</button>
            </div>
          )
        })}

        {/* Aba "+" para adicionar multiclasse — só aparece quando permitido pela campanha */}
        {allowMulticlass && currentLevel >= 3 && multiclasses.length < 3 && (
          <button
            onClick={() => { setShowAddMC(v => !v); setActiveTab('primary') }}
            className="shrink-0 px-3 py-2 rounded-t-lg text-sm text-amber-500 hover:text-amber-300 font-bold border-b-2 border-transparent hover:bg-gray-800/50 transition-colors"
            title="Adicionar multiclasse"
          >
            ＋
          </button>
        )}
      </div>

      {/* ── Picker de nova multiclasse ── */}
      {showAddMC && (
        <div className="bg-gray-800 border border-amber-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-400">Adicionar Multiclasse</h3>
            <button onClick={() => { setShowAddMC(false); setAddMCClass('') }} className="text-gray-500 hover:text-gray-300 text-lg">✕</button>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Escolha a classe:</label>
            <select
              value={addMCClass}
              onChange={e => setAddMCClass(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-600"
            >
              <option value="">— Selecione —</option>
              {availableForMC.map(c => (
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
                        <span className="text-gray-500">({character.attributes[attr] ?? 10})</span>
                      </div>
                    ))}
                    {orAttr && (
                      <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                        orMet ? 'border-green-700 bg-green-900/20 text-green-300' : 'border-yellow-700 bg-yellow-900/20 text-yellow-300'
                      }`}>
                        {orMet ? '✓' : '⚠'} ou {abbrOfKey(orAttr) ?? orAttr.toUpperCase()} 13+
                        <span className="text-gray-500">({character.attributes[orAttr] ?? 10})</span>
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
              onClick={() => { setShowAddMC(false); setAddMCClass('') }}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
            >
              Cancelar
            </button>
            <button
              disabled={!addMCClass}
              onClick={handleConfirmAddMC}
              className="flex-1 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar — ganhar proficiências e adicionar {addMCClass ? (classes ?? []).find(c => c.index === addMCClass)?.name ?? addMCClass : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── Conteúdo da aba ativa ── */}
      {safeTab === 'primary' && !showAddMC && (
        <ClassProgressionPanel
          progression={progression}
          currentLevel={currentLevel}
          hitDie={hitDie}
          conMod={conMod}
          attributes={character.attributes}
          isMulticlass={false}
          onLevelChange={onLevelChange}
          onApplyLevelUp={onApplyLevelUp}
          multiclassIndex={null}
          levelChoices={classChoices[classIndex]?.choices ?? []}
          chosenFeatures={chosenFeatures}
          allowFeats={allowFeats}
        />
      )}

      {typeof safeTab === 'number' && !showAddMC && (() => {
        const mc = multiclasses[safeTab]
        if (!mc) return null
        const mcProg   = allProgressions[mc.class] ?? null
        const mcClass  = (classes ?? []).find(c => c.index === mc.class)
        const mcHitDie = mcClass?.hit_die ?? 8
        return (
          <ClassProgressionPanel
            progression={mcProg}
            currentLevel={mc.level}
            hitDie={mcHitDie}
            conMod={conMod}
            attributes={character.attributes}
            isMulticlass={true}
            onApplyLevelUp={onApplyLevelUp}
            multiclassIndex={safeTab}
            levelChoices={classChoices[mc.class]?.choices ?? []}
            chosenFeatures={chosenFeatures}
            allowFeats={allowFeats}
          />
        )
      })()}

      {/* ── Slots de magia fundidos ── */}
      {fusedSlots && !showAddMC && (
        <div className="bg-gray-800 border border-blue-900/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold text-blue-300">Espaços de Magia Fundidos (Multiclasse D&D 5e)</p>
            {onNavigateToSpells && (
              <button
                onClick={onNavigateToSpells}
                className="text-xs px-3 py-1.5 rounded bg-blue-900/40 hover:bg-blue-800/50 border border-blue-700/50 text-blue-300 font-semibold transition-colors"
              >
                ✨ Adicionar / Gerenciar Magias →
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(fusedSlots).map(([lvl, qty]) => (
              <div key={lvl} className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-center">
                <span className="text-gray-400">Nível {lvl}: </span>
                <span className="text-blue-300 font-bold">{qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
