import { describe, it, expect } from 'vitest'
import { fitWithin } from '../../utils/imageResize'

describe('fitWithin', () => {
  it('não amplia imagens já pequenas', () => {
    expect(fitWithin(100, 80, 256)).toEqual({ width: 100, height: 80 })
  })
  it('limita o maior lado ao máximo, preservando proporção', () => {
    expect(fitWithin(1024, 512, 256)).toEqual({ width: 256, height: 128 })
    expect(fitWithin(512, 1024, 256)).toEqual({ width: 128, height: 256 })
  })
  it('quadrada grande vira quadrada no teto', () => {
    expect(fitWithin(2000, 2000, 256)).toEqual({ width: 256, height: 256 })
  })
})
