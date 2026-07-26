// @ts-check
/**
 * Hidratação de magias guardadas na ficha contra o catálogo SRD.
 *
 * Nem toda magia da ficha nasce do catálogo: algumas são objetos MÍNIMOS
 * escritos à mão quando uma feature concede a magia — truque racial do Alto
 * Elfo (`racial-cantrip-*`), familiar do Pacto da Corrente, Consciência
 * Primordial do Patrulheiro. Esses stubs trazem uma linha de resumo no lugar
 * do texto do livro, então abrir o detalhe mostrava um card praticamente
 * vazio. Aqui a magia guardada é completada com o texto e a papelada
 * (tempo/alcance/duração/componentes) da entrada real.
 *
 * A IDENTIDADE da magia guardada é preservada de propósito (`index`, `name`,
 * `id`, `prepared`, `alwaysPrepared`, `sourceLabel`...): a ficha salva já se
 * apoia nesses campos pra preparar, remover e conjurar. Só os campos
 * descritivos vêm do catálogo.
 */

/** Índices legados que nunca existiram no catálogo PT. */
const INDEX_ALIASES = {
  // Pacto da Corrente sempre gravou o index em inglês; no PT a magia é
  // "Convocar Familiar".
  'find-familiar': 'convocar-familiar',
}

const COMBINING_MARKS = /[̀-ͯ]/g

const norm = s => (s ?? '')
  .normalize('NFD')
  .replace(COMBINING_MARKS, '')
  .toLowerCase()
  .trim()

/** Acha a entrada do catálogo por index (com alias) e, em último caso, por nome. */
function findInCatalog(spell, catalog) {
  const wanted = INDEX_ALIASES[spell.index] ?? spell.index
  return catalog.find(s => s.index === wanted)
    ?? catalog.find(s => norm(s.name) === norm(spell.name))
    ?? null
}

/** Campos que o catálogo pode preencher; `undefined` no catálogo não apaga o que a ficha já tinha. */
function descriptiveFields(srd) {
  const out = {}
  const put = (key, value) => { if (value !== undefined && value !== null && value !== '') out[key] = value }

  put('desc', srd.desc)
  put('higherLevel', Array.isArray(srd.higher_level) ? srd.higher_level.join(' ') : srd.higher_level)
  put('castingTime', srd.casting_time)
  put('range', srd.range)
  put('duration', srd.duration)
  put('material', srd.material)
  put('components', Array.isArray(srd.components) ? srd.components.join(', ') : srd.components)
  put('school', typeof srd.school === 'object' ? srd.school?.name : srd.school)
  if (typeof srd.ritual === 'boolean') out.ritual = srd.ritual
  if (typeof srd.concentration === 'boolean') out.concentration = srd.concentration
  return out
}

/**
 * Completa UMA magia da ficha com os dados do catálogo. Sem correspondência
 * (magia caseira, catálogo ainda carregando), devolve a magia como está.
 */
export function resolveSpellDetail(spell, catalog) {
  if (!spell || !Array.isArray(catalog) || catalog.length === 0) return spell
  const srd = findInCatalog(spell, catalog)
  if (!srd) return spell
  return { ...spell, ...descriptiveFields(srd) }
}

/** Mesma coisa pra uma lista inteira. */
export function resolveSpellDetails(spells, catalog) {
  if (!Array.isArray(spells) || !Array.isArray(catalog) || catalog.length === 0) return spells
  return spells.map(s => resolveSpellDetail(s, catalog))
}
