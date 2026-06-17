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
