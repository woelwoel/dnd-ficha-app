// src/test/dnd5e/subclassFeatures-uses.test.js
import { describe, it, expect } from 'vitest'
import { detectFeatureUses } from '../../systems/dnd5e/domain/subclassFeatures'

const ctx = { attributes: { cha: 16, int: 14 }, profBonus: 3 }

describe('detectFeatureUses — só padrões de alta confiança', () => {
  it('"Usos = bônus de proficiência" → max=prof, recarga conforme descanso citado', () => {
    expect(detectFeatureUses('Tentáculo. Usos = bônus de proficiência, recuperados num descanso longo.', ctx))
      .toEqual({ max: 3, recharge: 'long' })
  })
  it('"1×/descanso curto" → max=1, short', () => {
    expect(detectFeatureUses('Presença Feérica. 1×/descanso curto ou longo.', ctx))
      .toEqual({ max: 1, recharge: 'short' })
  })
  it('"uma vez ... descanso longo" → max=1, long', () => {
    expect(detectFeatureUses('Você pode fazer isso uma vez e recupera após um descanso longo.', ctx))
      .toEqual({ max: 1, recharge: 'long' })
  })
  it('"igual ao seu modificador de Carisma" (com "usos") → max=mod CHA', () => {
    expect(detectFeatureUses('Usos iguais ao seu modificador de Carisma, recupera em descanso longo.', ctx))
      .toEqual({ max: 3, recharge: 'long' })
  })
  it('NÃO dispara em "+bônus de proficiência de dano" (sem "usos =")', () => {
    expect(detectFeatureUses('Ira do Gênio: +bônus de proficiência de dano do tipo do gênio.', ctx)).toBeNull()
  })
  it('NÃO dispara em "1×/turno" nem texto sem uso', () => {
    expect(detectFeatureUses('Ao acertar 1×/turno, soma dano.', ctx)).toBeNull()
    expect(detectFeatureUses('Você ganha visão no escuro a 18 metros.', ctx)).toBeNull()
  })
})
