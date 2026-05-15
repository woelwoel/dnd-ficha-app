/**
 * Posicionamento de tokens no mapa.
 *
 * Coordenadas são normalizadas (0..1) relativas ao bounding rect do
 * elemento `<map>` — assim funcionam em qualquer resolução.
 *
 * Regiões são pontos de interesse marcados no mapa default. Cada classe
 * tem uma região "natural" (mago → torre, druida → floresta, etc.); novos
 * personagens caem numa posição determinística dentro do raio da região.
 */

import { getClassIconKey } from './class-icons'

export const REGIONS_DEFAULT = {
  forest:  { x: 0.18, y: 0.55, r: 0.08 },
  castle:  { x: 0.50, y: 0.45, r: 0.10 },
  tower:   { x: 0.22, y: 0.40, r: 0.06 },
  ruins:   { x: 0.82, y: 0.65, r: 0.08 },
  village: { x: 0.42, y: 0.80, r: 0.06 },
  port:    { x: 0.80, y: 0.78, r: 0.06 },
}

export const CLASS_TO_REGION = {
  guerreiro:   'castle',
  paladino:    'castle',
  barbaro:     'castle',
  clerigo:     'castle',
  mago:        'tower',
  feiticeiro:  'tower',
  bruxo:       'tower',
  druida:      'forest',
  patrulheiro: 'forest',
  ladino:      'ruins',
  bardo:       'village',
  monge:       'village',
  fallback:    'castle',
}

const REGIONS_BY_MAP = { default: REGIONS_DEFAULT }

/** Hash determinístico (Jenkins hash) → float em [0, 1). */
function hashFloat(str, salt = 0) {
  let h = salt
  for (let i = 0; i < str.length; i++) {
    h += str.charCodeAt(i)
    h += (h << 10)
    h ^= (h >> 6)
  }
  h += (h << 3)
  h ^= (h >> 11)
  h += (h << 15)
  return (h >>> 0) / 4294967295 // 32-bit unsigned to [0,1)
}

export function clampPosition({ x, y }) {
  const cx = Math.min(1, Math.max(0, Number(x) || 0))
  const cy = Math.min(1, Math.max(0, Number(y) || 0))
  const snap = (v) => Math.round(v * 200) / 200 // grid 0.005
  return { x: snap(cx), y: snap(cy) }
}

/**
 * Calcula posição default determinística para o personagem dentro do
 * raio da região associada à sua classe. Mesmo ID → mesma posição.
 */
export function getDefaultPosition(character, mapKey = 'default') {
  const regions = REGIONS_BY_MAP[mapKey] || REGIONS_DEFAULT
  const classKey = getClassIconKey(character?.info?.class)
  const regionKey = CLASS_TO_REGION[classKey] || CLASS_TO_REGION.fallback
  const region = regions[regionKey] || regions.castle

  const id = String(character?.id || 'unknown')
  // Distribui em ângulo + raio determinístico (espiral leve)
  const theta = hashFloat(id, 999999) * Math.PI * 2
  const rho = Math.sqrt(hashFloat(id, 111111)) * region.r // sqrt distribui uniforme em disco

  return clampPosition({
    x: region.x + Math.cos(theta) * rho,
    y: region.y + Math.sin(theta) * rho,
  })
}
