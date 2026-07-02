/**
 * Engine de itens mágicos — funções puras que filtram itens "ativos"
 * (atunados/equipados) e agregam seus `effects` em um objeto consultável.
 *
 * Tipos de efeito suportados:
 *  - ac           : bônus genérico em CA (Anel de Proteção, Bracelete, Pedra Ioun)
 *  - armorAc      : bônus na armadura equipada (Armadura +1/+2/+3)
 *  - attack       : bônus em ataque (Arma +N) — informativo, não auto-vincula a combat.attacks
 *  - damage       : bônus em dano (Arma +N) — idem
 *  - saves        : bônus em TODOS os testes de resistência (Anel de Proteção)
 *  - saveAbility  : bônus em saves de UM atributo (Manto da Resistência: CON)
 *  - attrSet      : sobrescreve score do atributo (Cinto de Força do Gigante)
 *  - attrCap      : eleva o teto do atributo (Manto de Carismático)
 *  - attrBonus    : soma ao score respeitando `max` (Amuleto da Saúde, Manuais)
 *  - resistance   : adiciona tipo de dano a `resistances[]`
 *  - advSaves     : ativa flag global de vantagem em saves (Pedra da Boa Sorte)
 *  - speed        : soma em METROS à velocidade (Botas Aladas = +3m). O app
 *                   inteiro usa metros; itens novos devem trazer valor métrico.
 *  - darkvision   : maior valor ganha (Óculos da Visão Noturna)
 */

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha']

/** Máximo BASE de itens sintonizados por criatura (PHB p.138). O Artífice
 *  eleva o teto por nível — ver getMaxAttunement em artificerInfusions.js;
 *  callers com um personagem devem passar o teto real. */
export const MAX_ATTUNED = 3

/**
 * Normaliza a invariante de sintonização: no máximo `max` itens com
 * `attuned: true` (as primeiras ocorrências na ordem do inventário vencem).
 * A UI já impede o excesso ao ligar; isto protege import/dados legados.
 * Retorna a MESMA referência quando nada precisa mudar (não suja o autosave).
 */
export function enforceAttunementLimit(items = [], max = MAX_ATTUNED) {
  let count = 0
  let changed = false
  const out = items.map(item => {
    if (!item?.attuned) return item
    count += 1
    if (count <= max) return item
    changed = true
    return { ...item, attuned: false }
  })
  return changed ? out : items
}

/**
 * Determina se um item mágico está "ativo" — contribuindo com seus
 * `effects` para os cálculos da ficha.
 *
 *  - Itens que requerem atunamento: ativos quando `attuned === true`.
 *  - Itens sem atunamento: ativos quando `equipped === true`
 *    (armas/armaduras mágicas e bugigangas que basta empunhar/usar).
 */
export function isItemActive(item) {
  if (!item) return false
  if (item.requiresAttunement) return item.attuned === true
  return item.equipped === true
}

function emptyEffects() {
  return {
    ac: 0,
    armorAc: 0,
    attack: 0,
    damage: 0,
    saves: 0,
    saveAbility: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    attrSet:     { str: null, dex: null, con: null, int: null, wis: null, cha: null },
    attrCap:     { str: 20, dex: 20, con: 20, int: 20, wis: 20, cha: 20 },
    attrBonus:   ABILITIES.reduce((acc, k) => {
      acc[k] = { value: 0, max: 20 }
      return acc
    }, {}),
    resistances: [],
    advSaves: false,
    speed: 0,
    darkvision: 0,
    sources: [],
  }
}

/**
 * Agrega todos os efeitos de itens mágicos ativos.
 *
 * Regras de combinação:
 *  - Bônus numéricos somam (ac, armorAc, attack, damage, saves, saveAbility, speed).
 *  - `attrSet`: maior valor ganha (não soma).
 *  - `attrCap`: maior teto ganha.
 *  - `attrBonus`: somam `value`s, `max` adota o MAIOR (mais permissivo).
 *  - `darkvision`: maior valor ganha (não soma).
 *  - `resistance` e `advSaves` são sets (sem stack).
 *  - `sources` lista `{ item, type, value, ability?, damage? }` para tooltips.
 */
export function getActiveMagicEffects(items) {
  const agg = emptyEffects()
  const resSet = new Set()

  for (const item of items ?? []) {
    if (!isItemActive(item)) continue
    const effects = item.effects
    if (!Array.isArray(effects) || effects.length === 0) continue

    for (const ef of effects) {
      switch (ef.type) {
        case 'ac':
          agg.ac += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'ac', value: ef.value })
          break
        case 'armorAc':
          agg.armorAc += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'armorAc', value: ef.value })
          break
        case 'attack':
          agg.attack += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'attack', value: ef.value })
          break
        case 'damage':
          agg.damage += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'damage', value: ef.value })
          break
        case 'saves':
          agg.saves += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'saves', value: ef.value })
          break
        case 'saveAbility':
          if (ef.ability) {
            agg.saveAbility[ef.ability] = (agg.saveAbility[ef.ability] ?? 0) + (ef.value ?? 0)
            agg.sources.push({ item: item.name, type: 'saveAbility', ability: ef.ability, value: ef.value })
          }
          break
        case 'attrSet':
          if (ef.ability) {
            const current = agg.attrSet[ef.ability]
            if (current == null || (ef.value ?? 0) > current) {
              agg.attrSet[ef.ability] = ef.value
            }
            agg.sources.push({ item: item.name, type: 'attrSet', ability: ef.ability, value: ef.value })
          }
          break
        case 'attrCap':
          if (ef.ability) {
            const current = agg.attrCap[ef.ability] ?? 20
            if ((ef.value ?? 0) > current) agg.attrCap[ef.ability] = ef.value
            agg.sources.push({ item: item.name, type: 'attrCap', ability: ef.ability, value: ef.value })
          }
          break
        case 'attrBonus':
          if (ef.ability) {
            agg.attrBonus[ef.ability].value += ef.value ?? 0
            const maxFromEffect = ef.max ?? 20
            if (maxFromEffect > agg.attrBonus[ef.ability].max) {
              agg.attrBonus[ef.ability].max = maxFromEffect
            }
            agg.sources.push({ item: item.name, type: 'attrBonus', ability: ef.ability, value: ef.value, max: ef.max })
          }
          break
        case 'resistance':
          if (ef.damage) {
            resSet.add(String(ef.damage).toLowerCase())
            agg.sources.push({ item: item.name, type: 'resistance', damage: ef.damage })
          }
          break
        case 'advSaves':
          agg.advSaves = true
          agg.sources.push({ item: item.name, type: 'advSaves' })
          break
        case 'speed':
          agg.speed += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'speed', value: ef.value })
          break
        case 'darkvision':
          if ((ef.value ?? 0) > agg.darkvision) agg.darkvision = ef.value
          agg.sources.push({ item: item.name, type: 'darkvision', value: ef.value })
          break
        default:
          break
      }
    }
  }

  agg.resistances = Array.from(resSet)
  return agg
}

/**
 * Aplica `attrSet`, `attrBonus` e `attrCap` ao score bruto de cada atributo.
 *
 *  base → attrSet (sobrescreve, só sobe) → attrBonus (+value, respeitando max)
 *
 * O attrCap não eleva o score automaticamente — é apenas autorização para
 * que o usuário possa colocar pontos extras manualmente (consumido pela UI).
 */
export function getEffectiveAttributes(baseAttrs, effects) {
  const out = { ...baseAttrs }
  for (const k of ABILITIES) {
    let score = out[k] ?? 10

    const setVal = effects.attrSet?.[k]
    if (setVal != null && setVal > score) score = setVal

    const bonus = effects.attrBonus?.[k]
    if (bonus && bonus.value > 0) {
      const capped = Math.min(score + bonus.value, bonus.max ?? 20)
      score = Math.max(score, capped)
    }

    out[k] = score
  }
  return out
}

/** Raridades e classes Tailwind associadas. */
export const RARITY_INFO = {
  comum:        { label: 'Comum',       text: 'text-gray-300',   border: 'border-gray-500',   bg: 'bg-gray-700/30'    },
  incomum:      { label: 'Incomum',     text: 'text-green-300',  border: 'border-green-600',  bg: 'bg-green-900/20'   },
  raro:         { label: 'Raro',        text: 'text-blue-300',   border: 'border-blue-600',   bg: 'bg-blue-900/20'    },
  'muito-raro': { label: 'Muito Raro',  text: 'text-purple-300', border: 'border-purple-600', bg: 'bg-purple-900/20'  },
  lendario:     { label: 'Lendário',    text: 'text-orange-300', border: 'border-orange-600', bg: 'bg-orange-900/20'  },
  artefato:     { label: 'Artefato',    text: 'text-red-300',    border: 'border-red-600',    bg: 'bg-red-900/20'     },
}

export function getRarityInfo(rarity) {
  return RARITY_INFO[String(rarity ?? '').toLowerCase()] ?? RARITY_INFO.comum
}
