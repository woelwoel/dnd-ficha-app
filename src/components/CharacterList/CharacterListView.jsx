import { useMemo, useState } from 'react'
import { ClassIcon } from '../../utils/class-icons'
import { Icon } from '../ui/Icon'
import { getSystemCore } from '../../systems'
import { DEFAULT_SYSTEM } from '../../systems/envelope'

// Resumo agnóstico do card: cada sistema decide title/subtitle/badges/icon via
// summarize(). A lista não conhece "nível"/"classe" — só pinta o que vier.
function summaryOf(character) {
  const core = getSystemCore(character?.system ?? DEFAULT_SYSTEM)
  if (core) return core.summarize(character)
  const info = character?.info ?? {}
  return { title: info.name || 'Sem nome', subtitle: '—', badges: [], icon: null }
}

function relativeTime(epoch) {
  if (!epoch) return null
  const delta = Date.now() - epoch
  const min = Math.floor(delta / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `há ${w} sem`
  const mo = Math.floor(d / 30)
  return `há ${mo} mês${mo > 1 ? 'es' : ''}`
}

/**
 * Status do personagem derivado do combat — sai como badge colorido
 * quando o estado é "ruim" (inconsciente/morto/estabilizado/exausto N+).
 * Personagens saudáveis não mostram badge (reduz ruído visual).
 */
function statusBadge(combat) {
  if (!combat) return null
  if (combat.isDead) return { label: '☠ Morto', cls: 'bg-red-100 text-red-800 border-red-600' }
  if (combat.isStable) return { label: '🛡 Estabilizado', cls: 'bg-green-100 text-green-800 border-green-600' }
  if ((combat.currentHp ?? 0) <= 0) return { label: 'Inconsciente', cls: 'bg-red-100 text-red-800 border-red-600' }
  if ((combat.exhaustion ?? 0) >= 4) return { label: `Exaustão ${combat.exhaustion}`, cls: 'bg-amber-100 text-amber-800 border-amber-600' }
  if ((combat.conditions ?? []).length > 0) {
    const n = combat.conditions.length
    return { label: `${n} condiç${n === 1 ? 'ão' : 'ões'}`, cls: 'bg-amber-100 text-amber-800 border-amber-600' }
  }
  return null
}

const SORT_OPTIONS = [
  { key: 'recent',  label: 'Recentes' },
  { key: 'name',    label: 'Nome'     },
  { key: 'level',   label: 'Nível'    },
]

export function CharacterListView({ characters = [], onSelect }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')

  // Busca + sort
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let arr = characters
    if (q) {
      arr = arr.filter(c => {
        const info = c.info || {}
        return (
          (info.name || '').toLowerCase().includes(q) ||
          (info.race || '').toLowerCase().includes(q) ||
          (info.class || '').toLowerCase().includes(q)
        )
      })
    }
    arr = [...arr].sort((a, b) => {
      if (sort === 'name') {
        return (a.info?.name || '').localeCompare(b.info?.name || '', 'pt-BR')
      }
      if (sort === 'level') {
        return (b.info?.level || 0) - (a.info?.level || 0)
      }
      // recent (default)
      return (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0)
    })
    return arr
  }, [characters, query, sort])

  const showSearch = characters.length >= 4

  if (characters.length === 0) {
    return (
      <div className="text-center py-16 text-ink-300">
        <p className="text-sm ink-italic">Nenhum herói recrutado ainda.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-2">
      {/* Barra de busca + sort — só aparece com 4+ personagens */}
      {showSearch && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            placeholder="Buscar herói…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Buscar personagem"
            className="flex-1 min-w-[160px] px-3 py-1.5 bg-parchment-50 border-2 border-parchment-600 rounded-sm text-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
          />
          <div role="group" aria-label="Ordenar por" className="flex items-center gap-1 text-xs">
            {SORT_OPTIONS.map(opt => {
              const active = sort === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSort(opt.key)}
                  aria-pressed={active}
                  className={[
                    'px-2 py-1 rounded-sm border-2 font-display tracking-wide transition-colors',
                    active
                      ? 'bg-ink-500 text-parchment-50 border-ink-600'
                      : 'bg-parchment-50 text-ink-500 border-parchment-600 hover:border-ink-300',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm ink-italic text-ink-300 text-center py-8">
          Nenhum herói corresponde a "{query}".
        </p>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(c => {
            const summary = summaryOf(c)
            const combat = c.combat || {}
            const last = relativeTime(c.lastOpenedAt)
            const status = statusBadge(combat)
            const hp = combat.currentHp
            const maxHp = combat.maxHp
            const ac = combat.armorClass
            const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0
            const hpColor = hpPct >= 75
              ? 'bg-green-600'
              : hpPct >= 25
                ? 'bg-amber-500'
                : hpPct > 0
                  ? 'bg-red-600'
                  : 'bg-ink-600'

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect && onSelect(c.id)}
                data-testid="list-card"
                className="group flex flex-col gap-2 p-3 rounded-sm text-left transition-all hover:-translate-y-0.5 hover:shadow-parchment border-2 border-parchment-600 bg-parchment-50 hover:border-ink-300 shadow-parchment-sm"
              >
                {/* Linha topo: avatar + nome + meta */}
                <div className="flex items-start gap-3">
                  <span className="companion-avatar grid place-items-center rounded-full flex-shrink-0 w-11 h-11 border-2 border-ink-500 text-ink-500">
                    <ClassIcon classKey={summary.icon} size={24} color="currentColor" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="block text-base font-display font-semibold text-ink-500 truncate tracking-wide">
                        {summary.title}
                      </span>
                      {summary.badges.map(b => (
                        <span key={b} className="text-xs ink-italic text-ink-300 shrink-0">
                          {b}
                        </span>
                      ))}
                    </div>
                    <span className="block text-xs ink-italic text-ink-300 truncate">
                      {summary.subtitle}
                    </span>
                    {c.playerName && (
                      <span className="block text-[11px] ink-italic text-ink-300 truncate">
                        👤 {c.playerName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Linha PV + CA + status (só se temos números válidos) */}
                {maxHp > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    {/* HP com mini-barra */}
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      <Icon name="heart" size={12} className="text-red-700 shrink-0" />
                      <span className="font-bold tabular-nums text-ink-500 shrink-0">
                        {hp}/{maxHp}
                      </span>
                      <div className="flex-1 h-1.5 bg-parchment-200 rounded-full overflow-hidden border border-parchment-600 min-w-[40px]">
                        <div
                          className={`h-full transition-all ${hpColor}`}
                          style={{ width: `${hpPct}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                    {/* CA */}
                    {ac != null && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-parchment-200 border border-parchment-600 text-ink-500 shrink-0">
                        <Icon name="shield" size={11} strokeWidth={2} />
                        <span className="font-bold tabular-nums">{ac}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Linha rodapé: status badge (se houver) + última edição */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  {status ? (
                    <span className={`px-1.5 py-0.5 rounded-sm border text-[11px] font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                  ) : <span />}
                  {last && (
                    <span className="ink-italic text-ink-300">
                      {last}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
