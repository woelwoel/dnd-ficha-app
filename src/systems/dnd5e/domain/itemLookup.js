/**
 * Resolve nome de item (PT-BR ou EN) → entrada da SRD `5e-SRD-Equipment.json`.
 *
 * Por que existe:
 *  - O wizard de classe adiciona itens com nome PT-BR (ex.: "Espadão",
 *    "Cota de Malha"), sem peso/dano/custo, porque o JSON `phb-class-equipment-pt`
 *    só carrega o nome.
 *  - A busca SRD ("+ Buscar SRD") adiciona itens já enriquecidos.
 *  - Isso gerava UX inconsistente: itens do wizard sem dados, itens manuais com
 *    todos os detalhes.
 *
 * Estratégia (em ordem de prioridade):
 *  1. Match exato pelo `name` PT-BR em `phb-weapons-pt.json` → pega o `index`
 *     (ex.: "Espadão" → "greatsword").
 *  2. Aliases de armadura PT-BR via `findArmorByName` → key alinhada com
 *     índice da SRD ("Cota de Malha" → "chain-mail").
 *  3. Match exato pelo `name` EN da SRD ("Greatsword").
 *  4. Slug do nome ("Long Sword" → "long-sword") como tentativa final.
 *
 * Não muta os itens — apenas fornece `enrichItemDisplay(item, lookup)` para
 * renderização. Peso/notas reais do item (digitados pelo usuário) sempre
 * têm prioridade; SRD só preenche o que está vazio.
 */

import { findArmorByName } from './equipment'

export function buildItemLookup(srdEquipment, ptWeapons) {
  const byIndex = new Map()
  const byName  = new Map()
  for (const eq of srdEquipment ?? []) {
    if (eq.index) byIndex.set(eq.index, eq)
    if (eq.name)  byName.set(eq.name.toLowerCase(), eq)
  }
  const ptNameToIndex = new Map()
  for (const w of ptWeapons ?? []) {
    if (w.name && w.index) ptNameToIndex.set(w.name.toLowerCase(), w.index)
  }

  return {
    resolve(name) {
      if (!name) return null
      const lc = String(name).trim().toLowerCase()
      // 1) Nome PT de arma → index → SRD
      const idxFromPt = ptNameToIndex.get(lc)
      if (idxFromPt && byIndex.has(idxFromPt)) return byIndex.get(idxFromPt)
      // 2) Armadura PT — alguns índices SRD têm sufixo "-armor" (padded,
      // leather, studded-leather, hide, half-plate, splint, plate) e outros
      // não (chain-shirt, scale-mail, ring-mail, chain-mail, shield). Tenta
      // os dois.
      const armor = findArmorByName(name)
      if (armor?.key) {
        if (byIndex.has(armor.key)) return byIndex.get(armor.key)
        const suffixed = `${armor.key}-armor`
        if (byIndex.has(suffixed)) return byIndex.get(suffixed)
      }
      // 3) Nome EN exato
      if (byName.has(lc)) return byName.get(lc)
      // 4) Slug EN
      const dashed = lc.replace(/\s+/g, '-')
      if (byIndex.has(dashed)) return byIndex.get(dashed)
      return null
    }
  }
}

/**
 * Retorna `{ weight, notes }` derivados do item + SRD. Mantém valores
 * do usuário; só preenche o que estiver vazio.
 */
export function enrichItemDisplay(item, lookup) {
  const eq = lookup?.resolve(item.name)
  if (!eq) return { weight: item.weight || '', notes: item.notes || '' }

  const weight = item.weight || (eq.weight != null ? `${eq.weight}lb` : '')
  const parts = []
  if (eq.damage?.damage_dice)     parts.push(`Dano: ${eq.damage.damage_dice}`)
  if (eq.armor_class?.base != null) {
    const dex = eq.armor_class.dex_bonus ? ' + Dex' : ''
    parts.push(`CA: ${eq.armor_class.base}${dex}`)
  }
  if (eq.cost) parts.push(`Custo: ${eq.cost.quantity}${eq.cost.unit}`)
  const fallbackNotes = parts.join(' · ')

  return {
    weight,
    notes: item.notes || fallbackNotes,
  }
}
