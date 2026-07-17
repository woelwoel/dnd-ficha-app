/* eslint-disable react-refresh/only-export-components -- exporta helpers
   puros (computeSpellPickToggle/resolveFixedSpells) pra teste unitário
   isolado (mesmo padrão de SrdProvider.jsx) */
import { useState } from 'react'
import { useSrd, useLazySrdDataset } from '../../../data/SrdProvider'
import {
  getFeatSpellDef, getChooseGrants, resolveFeatSpellOptions,
} from '../../../domain/featSpells'

/**
 * Escolha das magias que um TALENTO concede (spec 2026-07-15 §4).
 *
 * Auto-contido de propósito: lê o catálogo do SRD sozinho, então os dois call
 * sites (wizard e level-up) passam só `featIndex`/`value`/`onChange`. Sem
 * filtro por fonte ativa — `useClassSpells` (o picker de magia que já existe
 * na ficha) também usa o catálogo inteiro; não inventamos regra nova aqui.
 *
 * Props:
 *  - featIndex: índice do talento (sem declaração → não renderiza nada)
 *  - value: { list, picks } | null — a forma persistida em info.feats[].spellChoices
 *  - onChange(next): mesma forma de `value`
 */

// `picks[ordinal]` alinha com o i-ésimo grant `choose`, NÃO com a posição
// absoluta em `grants` — getChooseGrants faz a ponte entre os dois índices.
const SCHOOL_LABEL = {
  'adivinhação': 'Adivinhação', 'encantamento': 'Encantamento',
  'ilusão': 'Ilusão', 'necromancia': 'Necromancia',
}

/**
 * Próximo array de picks pra UM grant após clicar em `spellIndex`. `null`
 * sinaliza limite atingido (clique em magia nova quando `count` já foi
 * preenchido é no-op) — exportada à parte porque o botão fica `disabled`
 * nesse caso, e clique em botão disabled não dispara evento nenhum (nem via
 * DOM cru): a lógica só é observável testando a função isolada.
 */
export function computeSpellPickToggle(cur, spellIndex, count) {
  if (cur.includes(spellIndex)) return cur.filter(i => i !== spellIndex)
  return cur.length < count ? [...cur, spellIndex] : null
}

/**
 * Magias FIXAS (chips read-only) de um talento. Filtra por `g.fixed`
 * EXPLICITAMENTE — sem esse filtro, um grant `choose` (que não tem `.fixed`)
 * cairia num `find(s => s.index === undefined)`. Hoje isso falha em silêncio
 * porque nenhuma magia real tem `index` undefined, mas o filtro documenta a
 * intenção sem depender dessa coincidência dos dados — exportada à parte pra
 * testar o contrato isoladamente.
 */
export function resolveFixedSpells(def, srdSpells) {
  return (def?.grants ?? [])
    .filter(g => g.fixed)
    .map(g => srdSpells?.find(s => s.index === g.fixed))
    .filter(Boolean)
}

function grantLabel(choose) {
  const plural = choose.count > 1
  const what = choose.level === 0
    ? (plural ? 'truques' : 'truque')
    : (plural ? `magias de ${choose.level}º círculo` : `magia de ${choose.level}º círculo`)
  const quals = []
  if (choose.schools) {
    quals.push(`de ${choose.schools.map(s => SCHOOL_LABEL[s] ?? s).join(' ou ')}`)
  }
  if (choose.ritual) quals.push('com descritor ritual')
  if (choose.attack) quals.push('com jogada de ataque')
  return `Escolha ${choose.count} ${what}${quals.length ? ` ${quals.join(', ')}` : ''}`
}

export function FeatSpellPicker({ featIndex, value = null, onChange }) {
  const { spells: srdSpells } = useSrd()
  const spellMechanics = useLazySrdDataset('spellMechanics')
  const [search, setSearch] = useState({})   // ordinal → termo de busca

  const def = getFeatSpellDef(featIndex)
  if (!def) return null

  const fixed = resolveFixedSpells(def, srdSpells)
  const chooseGrants = getChooseGrants(featIndex)

  function togglePick(ordinal, spellIndex, count) {
    const cur = value?.picks?.[ordinal] ?? []
    const next = computeSpellPickToggle(cur, spellIndex, count)
    if (next === null) return   // limite atingido: clique em magia nova é no-op
    // Preenche buracos: picks[1] sem picks[0] viraria array esparso (que o
    // JSON serializa como null).
    const picks = [...(value?.picks ?? [])]
    while (picks.length <= ordinal) picks.push([])
    picks[ordinal] = next
    onChange({ list: value?.list ?? null, picks })
  }

  return (
    <div className="flex flex-col gap-2">
      {fixed.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-display tracking-widest uppercase text-ink-500">
            Magias concedidas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {fixed.map(s => (
              <span
                key={s.index}
                className="px-2 py-0.5 rounded-sm border-2 border-parchment-600 bg-parchment-100 text-[13px] text-ink-500"
              >
                ✓ {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {chooseGrants.map(({ grantIdx, ordinal, choose }) => {
        const picks = value?.picks?.[ordinal] ?? []
        // `spellMechanics` é lazy: chamar resolveFeatSpellOptions sem ele num
        // grant `attack` LANÇA (contrato do motor — lista vazia silenciosa
        // seria indistinguível de "nenhuma opção"). Espera carregar.
        if (choose.attack && !spellMechanics) {
          return (
            <p key={grantIdx} className="text-xs text-ink-300 italic">
              Carregando mecânicas das magias...
            </p>
          )
        }
        const options = resolveFeatSpellOptions(featIndex, grantIdx, {
          list: value?.list ?? null, srdSpells, spellMechanics,
        })
        const term = (search[ordinal] ?? '').toLowerCase()
        const shown = term
          ? options.filter(s => s.name.toLowerCase().includes(term))
          : options
        const done = picks.length === choose.count

        return (
          <div key={grantIdx} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs font-display text-ink-500">
                {grantLabel(choose)} <span className="text-red-700">*</span>
              </p>
              <span className={[
                'text-[13px] font-display tabular-nums',
                done ? 'text-emerald-700' : 'text-amber-700',
              ].join(' ')}>
                {picks.length} / {choose.count}
              </span>
            </div>

            <input
              type="text"
              placeholder="Buscar magia..."
              value={search[ordinal] ?? ''}
              onChange={e => setSearch(prev => ({ ...prev, [ordinal]: e.target.value }))}
              className="w-full px-2.5 py-1 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
            />

            <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-0.5">
              {shown.length === 0 && (
                <p className="text-xs text-ink-200 italic text-center py-3">
                  Nenhuma magia encontrada.
                </p>
              )}
              {shown.map(s => {
                const isSel = picks.includes(s.index)
                // Sem vaga e não selecionada → desabilita, deixando claro que
                // é preciso desmarcar antes de trocar.
                const isFull = !isSel && picks.length >= choose.count
                return (
                  <button
                    key={s.index}
                    type="button"
                    onClick={() => togglePick(ordinal, s.index, choose.count)}
                    disabled={isFull}
                    aria-pressed={isSel}
                    className={[
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-sm border-2 text-xs text-left transition-colors',
                      isSel
                        ? 'border-ink-500 bg-parchment-200 text-ink-500'
                        : isFull
                          ? 'border-parchment-600 bg-parchment-50 text-ink-200 cursor-not-allowed'
                          : 'border-parchment-600 bg-parchment-50 text-ink-500 hover:border-ink-300',
                    ].join(' ')}
                  >
                    <span className={[
                      'w-3 h-3 rounded-sm border-2 shrink-0',
                      isSel ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                    ].join(' ')} aria-hidden />
                    <span className="flex-1 min-w-0 font-display">{s.name}</span>
                    <span className="shrink-0 text-[13px] text-ink-300 italic">{s.school}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
