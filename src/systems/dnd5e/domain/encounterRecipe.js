/**
 * Leitura da receita salva de um encontro (`[{ monsterIndex, count }]`).
 *
 * Puro: recebe o catálogo já indexado em vez de buscá-lo, porque o catálogo é
 * dataset preguiçoso e quem chama já o tem em mãos.
 */

const MAX_ESPECIES = 4
const MAX_NOME = 80

/**
 * "4× Goblin · 1× Hobgoblin". Acima de quatro espécies, corta e conta o resto —
 * a linha da biblioteca não pode virar parágrafo.
 *
 * Monstro que o catálogo não reconhece aparece pelo próprio índice: some-lo
 * seria mentir sobre o tamanho do encontro.
 */
export function describeRecipe(recipe, monstersByIndex) {
  const itens = (recipe ?? []).map(item => {
    const n = Math.floor(Number(item?.count))
    const count = Number.isFinite(n) && n > 0 ? n : 1
    const nome = monstersByIndex?.get?.(item?.monsterIndex)?.name ?? item?.monsterIndex ?? '?'
    return `${count}× ${nome}`
  })
  if (itens.length === 0) return ''
  if (itens.length <= MAX_ESPECIES) return itens.join(' · ')
  const resto = itens.length - MAX_ESPECIES
  return [...itens.slice(0, MAX_ESPECIES), `+${resto} espécies`].join(' · ')
}

const chave = (s) => String(s ?? '').trim().toLowerCase()

/**
 * Nome livre para a cópia de um encontro. O índice único do banco compara por
 * `lower(btrim(name))`, então a busca por colisão aqui usa a mesma chave — se
 * usasse comparação literal, duplicar "Emboscada (cópia)" e "  EMBOSCADA
 * (Cópia)" devolveria um nome que o banco recusaria.
 */
export function nextCopyName(baseName, existingNames = []) {
  const usados = new Set((existingNames ?? []).map(chave))
  // O nome-base pode já estar no limite da coluna; corta antes de sufixar.
  const base = String(baseName ?? '').trim()

  for (let i = 1; i < 1000; i++) {
    const sufixo = i === 1 ? ' (cópia)' : ` (cópia ${i})`
    const cortado = base.slice(0, MAX_NOME - sufixo.length).trimEnd()
    const candidato = `${cortado}${sufixo}`
    if (!usados.has(chave(candidato))) return candidato
  }
  return `${base.slice(0, MAX_NOME - 14).trimEnd()} (cópia ${Date.now() % 1000})`
}
