import { describe, it, expect } from 'vitest'
import {
  MAP_BACKGROUND_URL,
  CAMPAIGN_NAME_DEFAULT,
  MAX_VISIBLE_TOKENS,
  CAMPAIGN_NAME_STORAGE_KEY,
  VIEW_MODE_STORAGE_KEY,
} from '../utils/config'

describe('config', () => {
  it('expõe URL do mapa padrão apontando para /maps/default.webp', () => {
    expect(MAP_BACKGROUND_URL).toBe('/maps/default.webp')
  })

  it('expõe nome de campanha padrão com ornamentos', () => {
    expect(CAMPAIGN_NAME_DEFAULT).toMatch(/Companhia do Vale/)
    expect(CAMPAIGN_NAME_DEFAULT).toMatch(/⚜/)
  })

  it('define limite de tokens visíveis no sidebar antes de cluster', () => {
    expect(MAX_VISIBLE_TOKENS).toBe(10)
  })

  it('expõe chaves de localStorage com namespace do app', () => {
    expect(CAMPAIGN_NAME_STORAGE_KEY).toBe('dnd-ficha:campaign-name')
    expect(VIEW_MODE_STORAGE_KEY).toBe('dnd-ficha:char-list-view')
  })
})
