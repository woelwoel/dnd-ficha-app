/**
 * Runas do Cavaleiro Rúnico (Guerreiro, Tasha).
 *
 * As runas não têm catálogo próprio — vivem como `options` do choice
 * `guerreiro_rune_knight_runes` em `tasha-class-choices-pt.json`, com a regra
 * inteira numa string só ("Passiva: … Invocada (custo): …"). Este módulo é a
 * fonte única de: quais runas o personagem gravou, o id do tracker de cada
 * invocação e a quebra do texto em passiva/invocação.
 *
 * Cada invocação é 1 uso por descanso curto ou longo, POR RUNA (TCE p.42) —
 * daí um tracker por runa em vez de um pool compartilhado.
 *
 * Puro (sem React): o painel e `defaultClassFeatureUses` leem daqui, então os
 * ids do card e do tracker não podem divergir.
 */

export const RUNES_CHOICE_ID = 'guerreiro_rune_knight_runes'
export const RUNE_KNIGHT = 'cavaleiro-runico'

/** Id do tracker de invocação de uma runa. */
export function runeUseId(value) {
  return `guerreiro-rune-${value}`
}

// "Passiva: X. Invocada (custo[, gatilho]): Y"
const RUNE_DESC = /^\s*Passiva:\s*(.+?)\s*Invocada\s*\(([^)]*)\)\s*:\s*(.+)$/is

const INVOKE_COSTS = ['ação bônus', 'reação', 'ação']

/** Sem o rótulo ("Passiva:"/"Invocada (…):") o texto começaria em minúscula. */
function capitalize(txt) {
  return txt ? txt[0].toUpperCase() + txt.slice(1) : txt
}

/**
 * Quebra a descrição curada de uma runa em `{ passive, invoked, type, trigger }`.
 * `type` é o custo da invocação no vocabulário dos selos; "ao acertar com arma"
 * (Runa do Fogo) não custa ação própria, então vira `passiva`.
 * Texto fora do formato não é adivinhado: vira `invoked` inteiro.
 */
export function parseRuneDesc(desc = '') {
  const m = RUNE_DESC.exec(desc)
  if (!m) return { passive: '', invoked: desc.trim(), type: 'passiva', trigger: '' }

  const [, passive, meta, invoked] = m
  const lower = meta.toLowerCase()
  const cost = INVOKE_COSTS.find(c => lower.startsWith(c))
  // o que sobra do parêntese depois do custo é o gatilho ("quando …")
  const rest = (cost ? meta.slice(cost.length) : meta).replace(/^[\s,]+/, '').trim()

  return {
    passive: capitalize(passive.trim()),
    invoked: capitalize(invoked.trim()),
    type: cost ?? 'passiva',
    trigger: cost ? rest : rest || meta.trim(),
  }
}

/** Entrada de classe (primária ou multiclasse) que é Cavaleiro Rúnico. */
function runeKnightEntries(character) {
  const entries = [
    { level: character?.info?.level ?? 0, chosen: character?.info?.chosenFeatures ?? {}, cls: character?.info?.class },
    ...(character?.info?.multiclasses ?? []).map(mc => ({
      level: mc.level, chosen: mc.chosenFeatures ?? {}, cls: mc.class,
    })),
  ]
  return entries.filter(e => e.cls === 'guerreiro' && e.chosen?.martial_archetype === RUNE_KNIGHT)
}

/**
 * Ids das runas gravadas, na ordem escolhida. Não depende do catálogo — é o
 * que deixa o painel saber que EXISTEM runas antes do SRD chegar (e não sumir
 * em silêncio nesse intervalo).
 */
export function chosenRuneIds(character) {
  return runeKnightEntries(character).flatMap(e => {
    const chosen = e.chosen?.[RUNES_CHOICE_ID]
    return Array.isArray(chosen) ? chosen : []
  })
}

/**
 * Runas gravadas pelo personagem, na ordem em que foram escolhidas.
 * Devolve `[]` quando não é Cavaleiro Rúnico, não escolheu runas, ou o
 * catálogo (`classChoices` do SrdProvider) ainda não chegou.
 */
export function resolveChosenRunes(character, classChoices) {
  const options = (classChoices?.guerreiro?.choices ?? [])
    .find(c => c.id === RUNES_CHOICE_ID)?.options ?? []
  if (options.length === 0) return []

  const out = []
  for (const value of chosenRuneIds(character)) {
    const opt = options.find(o => o.value === value)
    if (!opt) continue
    out.push({
      value,
      // "(nv 7+)" no nome da option é gating de escolha, não parte do nome
      name: (opt.name ?? '').replace(/\s*\(nv[^)]*\)\s*$/i, '').trim(),
      useId: runeUseId(value),
      desc: opt.desc ?? '',
      ...parseRuneDesc(opt.desc ?? ''),
    })
  }
  return out
}
