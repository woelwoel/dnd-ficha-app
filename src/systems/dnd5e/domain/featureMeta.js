/**
 * Catálogo central de tipos de feature/ação (PHB p.190+).
 *
 * Mantém só o que é semanticamente compartilhado entre todas as abas:
 * o ícone e o label PT-BR canônico. Cada consumidor (FeaturesTab,
 * etc.) sobrepõe seu próprio mapa de cor/intensidade conforme o
 * contexto visual.
 */

export const FEATURE_TYPE_KEYS = ['ação', 'ação bônus', 'reação', 'passiva', 'livre']

export const FEATURE_TYPE_META = {
  'ação':       { icon: '⚔️',  label: 'Ação' },
  'ação bônus': { icon: '⚡',  label: 'Ação Bônus' },
  'reação':     { icon: '🛡️', label: 'Reação' },
  'passiva':    { icon: '∞',   label: 'Passiva' },
  'livre':      { icon: '✦',   label: 'Livre' },
}

/** Retorna a meta canônica do tipo; cai em 'ação' se desconhecido. */
export function getFeatureTypeMeta(type) {
  return FEATURE_TYPE_META[type] ?? FEATURE_TYPE_META['ação']
}
