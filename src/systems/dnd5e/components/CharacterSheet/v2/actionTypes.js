/**
 * Tipo de ação (economia de turno) de cada recurso de classe gerado por
 * `defaultClassFeatureUses` (domain/rules.js). Usado pela ActionsTab v2 para
 * as linhas nativas rápidas dos filtros Ação/Bônus/Reação.
 *
 * Só mapeamos recursos com um tipo de ação CLARO e acionável em combate.
 * Pools (Ki, Pontos de Feitiçaria) e features de descanso (Recuperação
 * Arcana/Natural) ficam FORA — caem no fallback e só aparecem na visão rica
 * (CombatClassActions, sob os filtros Todas/Limitadas), evitando trackers
 * duplicados na tela. Ids de subclasse (dinâmicos) também caem no fallback.
 *
 * Fonte das classificações: PHB (cap. 3 e subclasses) + Caldeirão de Tasha.
 */
export const ACTION_TYPES = {
  'guerreiro-second-wind': 'bonus',       // Retomar o Fôlego — ação bônus (PHB p.72)
  'guerreiro-action-surge': 'action',     // Surto de Ação — ação adicional no turno (PHB p.72)
  'barbaro-rage': 'bonus',                // Fúria — ação bônus pra entrar (PHB p.48)
  'bardo-bardic-inspiration': 'bonus',    // Inspiração de Bardo — ação bônus (PHB p.53)
  'clerigo-channel-divinity': 'action',   // Canalizar Divindade — ação (PHB p.58)
  'clerigo-war-priest': 'bonus',          // Ataque Bélico Bônus — ação bônus (PHB p.63)
  'clerigo-wrath-of-storm': 'reaction',   // Investida Furiosa — reação (PHB p.62)
  'paladino-channel-divinity': 'action',  // Canalizar Divindade — ação (PHB p.85)
  'paladino-lay-on-hands': 'action',      // Imposição das Mãos — ação (PHB p.84)
  'druida-wild-shape': 'action',          // Forma Selvagem — ação (PHB p.66)
  'artifice-flash-of-genius': 'reaction', // Lampejo de Genialidade — reação (Tasha)
  'artifice-spell-storing-item': 'action',// Item de Armazenar Magia — ação (Tasha)
}

/** Tipo de ação de um recurso, ou `null` se não classificado. */
export function actionTypeOf(featureId) {
  return ACTION_TYPES[featureId] ?? null
}
