/* ─────────────────────────────────────────────────────────────────────
   Engine de tradução PT-BR para monstros do SRD.

   - mergeMonster: faz merge campo-a-campo. Strings e arrays vêm do PT
     quando presentes, caso contrário caem para o original (EN).
   - translateType/Size/Alignment: maps fixos para termos do statblock.
   - STATBLOCK_LABELS_PT / ABILITY_LABELS_PT: rótulos da UI.
   ────────────────────────────────────────────────────────────────────*/

export const TYPE_PT = {
  aberration: 'aberração',
  beast: 'besta',
  celestial: 'celestial',
  construct: 'constructo',
  dragon: 'dragão',
  elemental: 'elemental',
  fey: 'fada',
  fiend: 'demônio',
  giant: 'gigante',
  humanoid: 'humanoide',
  monstrosity: 'monstruosidade',
  ooze: 'limo',
  plant: 'planta',
  undead: 'morto-vivo',
  swarm: 'enxame',
}

export const SIZE_PT = {
  Tiny: 'Minúsculo',
  Small: 'Pequeno',
  Medium: 'Médio',
  Large: 'Grande',
  Huge: 'Enorme',
  Gargantuan: 'Colossal',
}

// Alinhamentos vêm em diversos formatos no SRD, então traduzimos por
// substituição de palavras-chave individuais. Ex: "chaotic evil" →
// "caótico mau", "any chaotic alignment" → "qualquer alinhamento caótico".
export const ALIGNMENT_TOKEN_PT = {
  lawful: 'leal',
  neutral: 'neutro',
  chaotic: 'caótico',
  good: 'bom',
  evil: 'mau',
  unaligned: 'sem alinhamento',
  any: 'qualquer',
  alignment: 'alinhamento',
}

export const STATBLOCK_LABELS_PT = {
  'Armor Class': 'Classe de Armadura',
  'Hit Points': 'Pontos de Vida',
  'Speed': 'Deslocamento',
  'Saving Throws': 'Testes de Resistência',
  'Skills': 'Perícias',
  'Damage Vulnerabilities': 'Vulnerabilidades a Dano',
  'Damage Resistances': 'Resistências a Dano',
  'Damage Immunities': 'Imunidades a Dano',
  'Condition Immunities': 'Imunidades a Condições',
  'Senses': 'Sentidos',
  'Languages': 'Idiomas',
  'Challenge': 'Nível de Desafio',
  'Special Abilities': 'Habilidades Especiais',
  'Actions': 'Ações',
  'Reactions': 'Reações',
  'Legendary Actions': 'Ações Lendárias',
}

export const SPEED_LABEL_PT = {
  walk: 'caminhar',
  fly: 'voar',
  swim: 'nadar',
  burrow: 'escavar',
  climb: 'escalar',
  hover: 'flutuar',
}

export const SENSE_LABEL_PT = {
  'darkvision': 'visão no escuro',
  'blindsight': 'percepção às cegas',
  'tremorsense': 'percepção de tremores',
  'truesight': 'visão verdadeira',
  'passive Perception': 'Percepção passiva',
  'passive perception': 'Percepção passiva',
}

/**
 * Mescla um monstro EN com seu override PT.
 * - override === null/undefined → retorna EN inalterado
 * - Strings: PT substitui se truthy
 * - Arrays de objetos (actions, special_abilities, reactions, legendary_actions):
 *     substituição total quando override é array.
 *     Cada item EN é casado por nome (case-insensitive) com PT; PT vira o final,
 *     campos ausentes no PT caem para EN do mesmo item.
 * - Outros campos numéricos/objetos: mantém EN.
 */
export function mergeMonster(en, override) {
  if (!override) return en
  const merged = { ...en }

  // Strings simples
  for (const key of ['name', 'type', 'subtype', 'alignment', 'size', 'languages']) {
    if (typeof override[key] === 'string' && override[key].trim()) {
      merged[key] = override[key]
    }
  }

  // Listas de habilidades/ações — substituição com merge por nome
  for (const key of ['special_abilities', 'actions', 'reactions', 'legendary_actions']) {
    if (Array.isArray(override[key])) {
      const enList = Array.isArray(en[key]) ? en[key] : []
      merged[key] = mergeNamedList(enList, override[key])
    }
  }

  return merged
}

function mergeNamedList(enList, ptList) {
  // Index EN por nome lowercase para lookup rápido
  const enByName = new Map(
    enList.map(it => [String(it?.name ?? '').toLowerCase().trim(), it])
  )
  return ptList.map(pt => {
    const key = String(pt?.name_en ?? pt?.name ?? '').toLowerCase().trim()
    const enItem = enByName.get(key) || {}
    // PT sobrescreve campos preenchidos; demais caem em EN
    const out = { ...enItem }
    if (typeof pt.name === 'string' && pt.name.trim()) out.name = pt.name
    if (typeof pt.desc === 'string' && pt.desc.trim()) out.desc = pt.desc
    return out
  })
}

export function translateType(value, lang) {
  if (lang !== 'pt' || !value) return value || ''
  const lower = String(value).toLowerCase()
  return TYPE_PT[lower] || value
}

export function translateSize(value, lang) {
  if (lang !== 'pt' || !value) return value || ''
  return SIZE_PT[value] || value
}

export function translateAlignment(value, lang) {
  if (lang !== 'pt' || !value) return value || ''
  return String(value)
    .split(/\s+/)
    .map(tok => ALIGNMENT_TOKEN_PT[tok.toLowerCase()] ?? tok)
    .join(' ')
}

export function translateLabel(label, lang) {
  if (lang !== 'pt') return label
  return STATBLOCK_LABELS_PT[label] || label
}

export function translateSpeedKey(key, lang) {
  if (lang !== 'pt') return key
  return SPEED_LABEL_PT[key] || key
}

export function translateSenseKey(key, lang) {
  if (lang !== 'pt') return key
  const norm = key.replace(/_/g, ' ')
  return SENSE_LABEL_PT[norm] || norm
}

/** Indexa uma lista de overrides por `index` para lookup O(1). */
export function indexOverrides(ptList) {
  const map = new Map()
  if (!Array.isArray(ptList)) return map
  for (const m of ptList) {
    if (m && typeof m.index === 'string') map.set(m.index, m)
  }
  return map
}
