import { describe, it, expect } from 'vitest'
import {
  REGIONS_DEFAULT,
  CLASS_TO_REGION,
  getDefaultPosition,
  clampPosition,
} from '../utils/token-position'

describe('REGIONS_DEFAULT', () => {
  it('expõe 6 regiões esperadas com coordenadas 0–1', () => {
    expect(Object.keys(REGIONS_DEFAULT).sort()).toEqual(
      ['castle', 'forest', 'port', 'ruins', 'tower', 'village']
    )
    for (const r of Object.values(REGIONS_DEFAULT)) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.x).toBeLessThanOrEqual(1)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeLessThanOrEqual(1)
      expect(r.r).toBeGreaterThan(0)
    }
  })
})

describe('CLASS_TO_REGION', () => {
  it('mapeia classes mágicas para tower e castelo para tank/divinos', () => {
    expect(CLASS_TO_REGION.mago).toBe('tower')
    expect(CLASS_TO_REGION.clerigo).toBe('castle')
    expect(CLASS_TO_REGION.ladino).toBe('ruins')
    expect(CLASS_TO_REGION.druida).toBe('forest')
  })
})

describe('clampPosition', () => {
  it('clampa coordenadas para [0, 1]', () => {
    expect(clampPosition({ x: -0.5, y: 0.3 })).toEqual({ x: 0, y: 0.3 })
    expect(clampPosition({ x: 0.5, y: 1.5 })).toEqual({ x: 0.5, y: 1 })
    expect(clampPosition({ x: 2, y: -1 })).toEqual({ x: 1, y: 0 })
  })

  it('arredonda para granularidade de 0.005', () => {
    expect(clampPosition({ x: 0.1234, y: 0.6789 })).toEqual({ x: 0.125, y: 0.68 })
  })
})

describe('getDefaultPosition', () => {
  it('é determinístico pelo character.id (mesma entrada → mesma saída)', () => {
    const c = { id: 'abc-123', info: { class: 'Mago' } }
    const p1 = getDefaultPosition(c, 'default')
    const p2 = getDefaultPosition(c, 'default')
    expect(p1).toEqual(p2)
  })

  it('coloca mago perto da região da torre', () => {
    const c = { id: 'mago-x', info: { class: 'Mago' } }
    const pos = getDefaultPosition(c, 'default')
    const tower = REGIONS_DEFAULT.tower
    const d = Math.hypot(pos.x - tower.x, pos.y - tower.y)
    expect(d).toBeLessThanOrEqual(tower.r + 0.001)
  })

  it('coloca classe desconhecida em região fallback (castle) ainda no mapa', () => {
    const c = { id: 'mistery', info: { class: 'Necromante' } }
    const pos = getDefaultPosition(c, 'default')
    expect(pos.x).toBeGreaterThan(0)
    expect(pos.x).toBeLessThan(1)
    expect(pos.y).toBeGreaterThan(0)
    expect(pos.y).toBeLessThan(1)
  })

  it('IDs diferentes geram posições distintas dentro da mesma região', () => {
    const a = getDefaultPosition({ id: 'aaa', info: { class: 'Mago' } }, 'default')
    const b = getDefaultPosition({ id: 'bbb', info: { class: 'Mago' } }, 'default')
    expect(a).not.toEqual(b)
  })
})
