/**
 * Traduções e formatadores para a aba de Ataques.
 *
 * Por que existe:
 *  - SRD 5e usa propriedades e tipos de dano em inglês (Slashing, Two-Handed,
 *    Ammunition, etc.). Mostrar isso pro jogador PT-BR é ruim.
 *  - Alcance da SRD vem em pés (D&D oficial), mas o livro PT usa metros
 *    (regra "1,5m = 5 pés" das tabelas de movimento).
 *  - Munição não é tipada na SRD — armas só têm a propriedade "ammunition";
 *    cabe ao app inferir qual item do inventário consome (flecha, virote, etc.)
 *    pelo nome da arma.
 *
 * Não muta dados: tudo é display-side. O atributo `damageType` salvo no
 * personagem segue em inglês (vindo da SRD), e a tradução só acontece ao
 * renderizar — assim itens existentes não precisam de migração.
 */

export const WEAPON_PROPERTY_PT = {
  'light':        'leve',
  'thrown':       'arremesso',
  'two-handed':   '2 mãos',
  'heavy':        'pesada',
  'finesse':      'sutileza',
  'versatile':    'versátil',
  'ranged':       'distância',
  'ammunition':   'munição',
  'loading':      'recarga',
  'reach':        'alcance',
  'special':      'especial',
  'monk':         'monge',
  'martial':      'marcial',
  'simple':       'simples',
}

export const DAMAGE_TYPE_PT = {
  'slashing':    'cortante',
  'piercing':    'perfurante',
  'bludgeoning': 'contundente',
  'fire':        'fogo',
  'cold':        'frio',
  'lightning':   'elétrico',
  'acid':        'ácido',
  'poison':      'veneno',
  'necrotic':    'necrótico',
  'radiant':     'radiante',
  'force':       'energia',
  'psychic':     'psíquico',
  'thunder':     'trovejante',
}

export function translateProperty(prop) {
  if (prop == null) return ''
  return WEAPON_PROPERTY_PT[String(prop).toLowerCase()] ?? String(prop)
}

export function translateDamageType(type) {
  if (type == null) return ''
  return DAMAGE_TYPE_PT[String(type).toLowerCase()] ?? String(type)
}

/**
 * Converte alcance em pés (SRD) pra metros (PHB PT). Usa a regra do grid
 * D&D: 5 ft = 1,5 m. Arredondado a 1 casa.
 */
export function feetToMeters(ft) {
  if (ft == null || !Number.isFinite(Number(ft))) return null
  return Math.round((Number(ft) / 5) * 1.5 * 10) / 10
}

/**
 * "45/180m" ou "45m" quando não há long range distinto. Retorna null se
 * nenhum dado de alcance estiver disponível (corpo a corpo padrão).
 */
export function formatRange(normalFt, longFt) {
  const nm = feetToMeters(normalFt)
  if (nm == null) return null
  const lm = feetToMeters(longFt)
  if (lm == null || lm === nm) return `${nm}m`
  return `${nm}/${lm}m`
}

/**
 * Mapa "tipo de arma → tipo de munição" usado para casar a arma do
 * inventário com a munição correspondente pelo nome.
 *
 * Casamento bidirecional via regex case-insensitive nas duas pontas.
 */
const AMMO_KEYWORDS = [
  { weapon: /\b(arco|bow)\b/i,                   ammo: /\b(flecha|arrow)/i },
  { weapon: /\b(besta|crossbow)\b/i,             ammo: /\b(virote|bolt)/i },
  { weapon: /\b(funda|sling)\b/i,                ammo: /\b(bala|bullet|pedra)/i },
  { weapon: /\b(zarabatana|cerbatana|blowgun)\b/i, ammo: /\b(agulha|needle)/i },
]

/**
 * Para um ataque com propriedade "ammunition" (munição), encontra o item do
 * inventário que serve de munição via match por palavra-chave no nome.
 * Retorna null se a arma não usa munição ou se nenhum item bater.
 */
export function findAmmoForAttack(attack, items) {
  const props = attack?.properties ?? []
  const hasAmmo = props.some(p => /^(ammunition|munição|municao)$/i.test(String(p)))
  if (!hasAmmo) return null
  const rule = AMMO_KEYWORDS.find(r => r.weapon.test(attack?.name ?? ''))
  if (!rule) return null
  return (items ?? []).find(i => rule.ammo.test(i?.name ?? '')) ?? null
}
