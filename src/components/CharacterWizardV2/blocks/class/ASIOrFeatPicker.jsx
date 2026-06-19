import { useState } from 'react'
import { isASIChoiceComplete } from '../class-helpers'

const ATTR_ABR = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' }
const ATTRS_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const ABILITY_MAX = 20  // teto de aumento por ASI (regra oficial)

export function ASIOrFeatPicker({ currentChoice, currentAttrs = {}, allowFeats, feats, onChoose }) {
  const [featSearch, setFeatSearch] = useState('')

  const mode = currentChoice?.type ?? 'asi'
  const bonuses = (mode === 'asi' ? currentChoice?.bonuses : null) ?? {}
  const totalSpent = Object.values(bonuses).reduce((s, v) => s + v, 0)
  const remaining = 2 - totalSpent
  const isDone = isASIChoiceComplete(currentChoice)

  function switchMode(newMode) {
    if (newMode === 'asi') onChoose({ type: 'asi', bonuses: {} })
    else onChoose({ type: 'feat', featIndex: null, featName: null })
  }

  function adjustBonus(attr, delta) {
    const cur = bonuses[attr] ?? 0
    const next = cur + delta
    if (next < 0 || next > 2) return
    if (delta > 0 && remaining <= 0) return
    // Não deixa o ASI ultrapassar o teto 20 (base + racial + outros ASIs já contam).
    if (delta > 0 && (currentAttrs[attr] ?? 0) + next > ABILITY_MAX) return
    const nb = { ...bonuses }
    if (next === 0) delete nb[attr]
    else nb[attr] = next
    onChoose({ type: 'asi', bonuses: nb })
  }

  const filteredFeats = (feats ?? []).filter(f =>
    f.name.toLowerCase().includes(featSearch.toLowerCase())
  )
  // Descrição do talento atualmente selecionado (para exibir o que ele faz).
  const selectedFeatObj = currentChoice?.type === 'feat'
    ? (feats ?? []).find(f => f.index === currentChoice.featIndex) ?? null
    : null

  return (
    <div className="flex flex-col gap-2 pt-2 border-t-2 border-parchment-600/50">
      <div className="flex items-center gap-2">
        <p className="text-xs font-display tracking-widest uppercase text-ink-500 flex-1">
          Aumento de Atributo {allowFeats ? 'ou Talento' : ''} <span className="text-red-700">*</span>
        </p>
        {isDone && <span className="text-xs text-emerald-700 font-display">✓</span>}
      </div>

      {allowFeats && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => switchMode('asi')}
            className={[
              'flex-1 py-1 text-xs rounded-sm border-2 font-display tracking-wide transition-colors',
              mode === 'asi'
                ? 'border-ink-500 bg-parchment-200 text-ink-500'
                : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
            ].join(' ')}
          >
            +2 Atributos
          </button>
          <button
            type="button"
            onClick={() => switchMode('feat')}
            className={[
              'flex-1 py-1 text-xs rounded-sm border-2 font-display tracking-wide transition-colors',
              mode === 'feat'
                ? 'border-ink-500 bg-parchment-200 text-ink-500'
                : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
            ].join(' ')}
          >
            Talento
          </button>
        </div>
      )}

      {mode === 'asi' && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs italic text-ink-300">
            Pontos restantes:{' '}
            <span className={remaining === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
              {remaining}
            </span>
            {' '}/ 2 — distribua +2 em um atributo ou +1/+1 em dois
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {ATTRS_ORDER.map(attr => {
              const bonus = bonuses[attr] ?? 0
              const current = currentAttrs[attr] ?? 0
              const projected = current + bonus
              const atMax = current + bonus >= ABILITY_MAX
              const canInc = remaining > 0 && bonus < 2 && !atMax
              const canDec = bonus > 0
              return (
                <div key={attr} className={[
                  'flex items-center gap-1 px-2 py-1.5 rounded-sm border-2',
                  bonus > 0 ? 'border-ink-500 bg-parchment-200' : 'border-parchment-600 bg-parchment-50',
                ].join(' ')}>
                  <span className="text-xs font-display text-ink-300 w-6 shrink-0">{ATTR_ABR[attr]}</span>
                  <button
                    type="button"
                    onClick={() => adjustBonus(attr, -1)}
                    disabled={!canDec}
                    aria-label={`-1 ${ATTR_ABR[attr]}`}
                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[13px] bg-parchment-100 hover:bg-parchment-200 border border-parchment-600 text-ink-500 disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <span className={[
                    'text-[13px] font-display flex-1 text-center tabular-nums',
                    bonus > 0 ? 'text-ink-500' : 'text-ink-300',
                  ].join(' ')}>
                    {current > 0
                      ? (bonus > 0 ? `${current}→${projected}` : `${current}`)
                      : (bonus > 0 ? `+${bonus}` : '0')}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustBonus(attr, 1)}
                    disabled={!canInc}
                    aria-label="+"
                    title={atMax ? `Máximo ${ABILITY_MAX} atingido` : undefined}
                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[13px] bg-parchment-100 hover:bg-parchment-200 border border-parchment-600 text-ink-500 disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {mode === 'feat' && (
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="Buscar talento..."
            value={featSearch}
            onChange={e => setFeatSearch(e.target.value)}
            className="w-full px-2.5 py-1 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
          />
          <div className="max-h-44 overflow-y-auto flex flex-col gap-1 pr-0.5">
            {filteredFeats.length === 0 && (
              <p className="text-xs text-ink-200 italic text-center py-3">Nenhum talento encontrado.</p>
            )}
            {filteredFeats.map(feat => {
              const isSelected = currentChoice?.type === 'feat' && currentChoice.featIndex === feat.index
              return (
                <button
                  key={feat.index}
                  type="button"
                  onClick={() => {
                    const attrBonus = feat.attrBonus ?? null
                    const autoAttr = attrBonus && attrBonus.choices?.length === 1
                      ? attrBonus.choices[0]
                      : null
                    onChoose({
                      type: 'feat',
                      featIndex: feat.index,
                      featName: feat.name,
                      featAttrBonus: attrBonus,
                      featChosenAttr: autoAttr,
                    })
                  }}
                  className={[
                    'flex items-start gap-2 text-left px-2.5 py-1.5 rounded-sm border-2 text-xs transition-colors',
                    isSelected
                      ? 'border-ink-500 bg-parchment-200 text-ink-500'
                      : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
                  ].join(' ')}
                >
                  <span className={[
                    'w-3 h-3 rounded-full border-2 shrink-0 mt-0.5',
                    isSelected ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                  ].join(' ')} />
                  <span className="flex-1 min-w-0">
                    <span className="font-display block">
                      {feat.name}
                      {feat.attrBonus && (
                        <span className="ml-1.5 text-[13px] text-ink-300 italic">
                          +{feat.attrBonus.amount} {feat.attrBonus.choices.map(c => ATTR_ABR[c]).join('/')}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {selectedFeatObj?.desc && (
            <div className="text-xs text-ink-500 bg-parchment-100 border-2 border-parchment-600 rounded-sm px-2.5 py-2 leading-relaxed max-h-40 overflow-y-auto">
              <span className="font-display block text-ink-300 mb-1">{selectedFeatObj.name}</span>
              {selectedFeatObj.desc}
            </div>
          )}

          {currentChoice?.type === 'feat' && currentChoice.featAttrBonus && (currentChoice.featAttrBonus.choices?.length ?? 0) > 1 && (
            <div className="mt-2 pt-2 border-t-2 border-parchment-600/50 flex flex-col gap-1.5">
              <p className="text-xs font-display text-ink-500">
                Onde aplicar +{currentChoice.featAttrBonus.amount}? <span className="text-red-700">*</span>
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {currentChoice.featAttrBonus.choices.map(attrKey => {
                  const isSel = currentChoice.featChosenAttr === attrKey
                  return (
                    <button
                      key={attrKey}
                      type="button"
                      onClick={() => onChoose({ ...currentChoice, featChosenAttr: attrKey })}
                      className={[
                        'px-2.5 py-1 text-[13px] rounded-sm border-2 font-display transition-colors',
                        isSel
                          ? 'border-ink-500 bg-parchment-200 text-ink-500'
                          : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
                      ].join(' ')}
                    >
                      {ATTR_ABR[attrKey]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
