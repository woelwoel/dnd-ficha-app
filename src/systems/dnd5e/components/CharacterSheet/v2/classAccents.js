/**
 * Acento de cor por classe (spec 2026-07-03). Tons calibrados pra contraste
 * AA como TEXTO sobre --v2-surface-0 (#0f141a) e --v2-surface-1 (#1a222c).
 * Chaves = índices em português usados por character.info.class
 * (ver public/srd-data/phb-classes-pt.json e tasha-classes-pt.json).
 * Multiclasse usa a classe primária (character.info.class).
 */
export const CLASS_ACCENTS = {
  artifice:    '#4fc7ab',
  barbaro:     '#e8836f',
  bardo:       '#d49ae0',
  bruxo:       '#b195e8',
  clerigo:     '#e8ce6f',
  druida:      '#8fc978',
  feiticeiro:  '#e88a8a',
  guerreiro:   '#d9a06a',
  ladino:      '#aab6c4',
  mago:        '#7fb3e8',
  monge:       '#6fc4d6',
  paladino:    '#e8b04c',
  patrulheiro: '#7dbd93',
}

export function classAccentOf(classIndex) {
  return CLASS_ACCENTS[classIndex] ?? '#4fc7ab'
}
