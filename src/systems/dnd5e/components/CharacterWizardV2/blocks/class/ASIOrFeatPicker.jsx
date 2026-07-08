import { isASIChoiceComplete } from '../class-helpers'
import { FeatPicker } from '../FeatPicker'

const ATTR_ABR = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' }
const ATTRS_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const ABILITY_MAX = 20  // teto de aumento por ASI (regra oficial)

export function ASIOrFeatPicker({ currentChoice, currentAttrs = {}, allowFeats, feats, onChoose, raceInfo = null }) {
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
        <FeatPicker
          feats={feats}
          value={currentChoice?.type === 'feat' ? currentChoice : null}
          onChange={f => onChoose({ type: 'feat', ...f })}
          raceInfo={raceInfo}
        />
      )}
    </div>
  )
}
