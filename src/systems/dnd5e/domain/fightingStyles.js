/**
 * Estilos de Combate (PHB p.72) — ponte entre a ESCOLHA do jogador e os
 * MOTORES de cálculo.
 *
 * A escolha vive em `info.chosenFeatures`, com ids e valores em português
 * (um id por classe, porque guerreiro/paladino/patrulheiro podem coexistir
 * em multiclasse e cada um escolhe o seu). Já `equipment.js` (CA) e
 * `utils/attacks.js` (ataque/dano) falam as chaves em inglês do PHB.
 *
 * Estilos sem efeito numérico automático (Proteção é reação; os de Tasha
 * dependem de UI própria) NÃO são traduzidos — ficam de fora da lista para
 * que os motores nunca precisem conhecê-los.
 */

/** Ids de escolha que carregam um Estilo de Combate, por classe. */
export const FIGHTING_STYLE_CHOICE_IDS = [
  'fighting_style',           // guerreiro (nv1)
  'fighting_style_paladin',   // paladino (nv2)
  'fighting_style_ranger',    // patrulheiro (nv2)
  'fighting_style_champion',  // guerreiro Campeão (nv10) — segundo estilo
]

/** Valor do JSON (PT) → chave do motor (EN). Sem entrada = sem mecânica. */
export const FIGHTING_STYLE_BY_VALUE = {
  arqueiro:    'archery',
  defesa:      'defense',
  duelo:       'dueling',
  duas_maos:   'two-weapon',
  grande_arma: 'great-weapon',
}

/**
 * Todos os Estilos de Combate mecanicamente ativos do personagem, já em
 * chaves de motor. Agrega a classe primária E cada multiclasse (que carrega
 * seu próprio `chosenFeatures`), sem duplicar.
 *
 * @param {object} character
 * @returns {string[]}
 */
export function getFightingStyles(character) {
  const buckets = [
    character?.info?.chosenFeatures,
    ...(character?.info?.multiclasses ?? []).map(mc => mc?.chosenFeatures),
  ]

  const styles = []
  for (const chosen of buckets) {
    if (!chosen) continue
    for (const id of FIGHTING_STYLE_CHOICE_IDS) {
      const key = FIGHTING_STYLE_BY_VALUE[chosen[id]]
      if (key && !styles.includes(key)) styles.push(key)
    }
  }
  return styles
}

/**
 * @param {object} character
 * @param {string} key - chave de motor ('defense', 'archery', ...)
 * @returns {boolean}
 */
export function hasFightingStyle(character, key) {
  return getFightingStyles(character).includes(key)
}
