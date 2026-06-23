// src/domain/featureCategories.js
/**
 * Classificação de features de classe/raça para a ficha.
 *
 * A fonte da verdade é a marcação nos JSONs de SRD:
 *  - combat:   "essencial" | "situacional"  → feature de combate
 *  - category: "defesa" | "exploracao" | "social" | "magia" → não-combate
 *  - actionType (opcional): força o selo de tipo na visão Combate
 *
 * Este módulo é puro (sem React) para ser testável isoladamente.
 */

export const COMBAT_TIERS = ['essencial', 'situacional']
export const FEATURE_CATEGORIES = ['defesa', 'exploracao', 'social', 'magia']

const ACTION_KEYWORDS = [
  { type: 'reação',     patterns: ['como reação', 'como sua reação', 'usa sua reação', 'usa a reação'] },
  { type: 'ação bônus', patterns: ['ação bônus', 'como ação bônus', 'ação de bônus'] },
  { type: 'ação',       patterns: ['como ação', 'usar a ação', 'use sua ação', 'usar uma ação', 'como uma ação'] },
]

/** Infere o tipo de ação a partir da descrição. Retorna null se nada casar. */
export function detectActionType(desc = '') {
  const lower = desc.toLowerCase()
  for (const { type, patterns } of ACTION_KEYWORDS) {
    if (patterns.some(p => lower.includes(p))) return type
  }
  return null
}

/** 'essencial' | 'situacional' | null */
export function combatTier(feature) {
  return COMBAT_TIERS.includes(feature?.combat) ? feature.combat : null
}

/** 'defesa' | 'exploracao' | 'social' | 'magia' | 'outras' */
export function featureCategory(feature) {
  return FEATURE_CATEGORIES.includes(feature?.category) ? feature.category : 'outras'
}

/** Selo de tipo na visão Combate: 'ação' | 'ação bônus' | 'reação' | 'passiva' */
export function actionTypeOf(feature) {
  if (feature?.actionType) return feature.actionType
  return detectActionType(feature?.desc ?? '') ?? 'passiva'
}

/** "Aumento de Atributo" é tratado no sistema de atributos — some das Habilidades. */
export function isAttributeIncrease(feature) {
  return (feature?.name ?? '').trim().toLowerCase().startsWith('aumento de atributo')
}

/* ──────────────────────────────────────────────────────────────────
   Ligação feature → recurso rastreável (featureUses de domain/rules.js)

   Os ids/nomes dos recursos divergem dos nomes PT das features (ex.:
   "Segunda Rajada" usa o recurso "Retomar o Fôlego"/guerreiro-second-wind;
   "Fonte de Magia" usa feiticeiro-sorcery-points). Mapeamos por
   classe + nome-base (sem o sufixo entre parênteses) para casar variantes
   de nível (ex.: "Surto de Ação (1 uso)"/"(2 usos)").
   ────────────────────────────────────────────────────────────────── */
const FEATURE_USE_LINKS = {
  'barbaro/Fúria':                'barbaro-rage',
  'guerreiro/Segunda Rajada':     'guerreiro-second-wind',
  'guerreiro/Surto de Ação':      'guerreiro-action-surge',
  'monge/Ki':                     'monge-ki',
  'bardo/Inspiração Bárdica':     'bardo-bardic-inspiration',
  'clerigo/Canalizar Divindade':  'clerigo-channel-divinity',
  'paladino/Cura pelas Mãos':     'paladino-lay-on-hands',
  'druida/Forma Selvagem':        'druida-wild-shape',
  'feiticeiro/Fonte de Magia':    'feiticeiro-sorcery-points',
}

/** Remove o sufixo "(...)" final do nome para casar variantes de nível. */
function baseFeatureName(name = '') {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/**
 * Colapsa famílias de features que escalam por nível repetindo o mesmo
 * nome-base (ex.: "Ataque Furtivo (1d6)" … "(10d6)", "Artes Marciais (d4)"…,
 * "Inspiração Bárdica (d6)"…). O SRD lista uma entrada por nível; sem isso a
 * ficha mostra TODAS as variantes acumuladas.
 *
 * Mantém só a variante do nível mais alto já alcançado (o nome carrega o valor
 * atual, ex.: "(5d6)"), preservando a descrição mais completa da família
 * (normalmente a do 1º nível, que traz as regras inteiras) e o nível em que a
 * feature foi adquirida. Agrupa por origem + nome-base para nunca fundir
 * features de classes diferentes, e preserva a ordem de entrada.
 */
export function collapseScalingFeatures(features = []) {
  const groups = new Map()
  const order = []
  for (const f of features) {
    const key = `${f.source ?? ''}::${baseFeatureName(f.name ?? '')}`
    if (!groups.has(key)) { groups.set(key, []); order.push(key) }
    groups.get(key).push(f)
  }
  return order.map(key => {
    const group = groups.get(key)
    if (group.length === 1) return group[0]
    const top = group.reduce((a, b) => ((b.level ?? 0) >= (a.level ?? 0) ? b : a))
    const fullest = group.reduce((a, b) => ((b.desc ?? '').length > (a.desc ?? '').length ? b : a))
    const firstLevel = group.reduce((min, f) => Math.min(min, f.level ?? Infinity), Infinity)
    return {
      ...top,
      desc: fullest.desc,
      level: Number.isFinite(firstLevel) ? firstLevel : top.level,
    }
  })
}

/**
 * Retorna o id do recurso rastreável (featureUses) ligado a esta feature,
 * ou null se ela não concede um recurso. Casa por nome-base EXATO para não
 * confundir "Fúria" com "Fúria Implacável".
 */
export function featureUseId(classIndex, featureName) {
  return FEATURE_USE_LINKS[`${classIndex}/${baseFeatureName(featureName)}`] ?? null
}
