// src/test/rules-mc-subclass-features.test.js
//
// Garante que `defaultClassFeatureUses` lê chosenFeatures DA MULTICLASSE
// pra liberar recursos de sub-classe (Domínio do Clérigo, Círculo do
// Druida, Arquétipo do Guerreiro) quando essa classe vem como secundária.
//
// Antes do fix, a função lia só `character.info?.chosenFeatures` (do
// primário), então Clérigo MC com Domínio da Guerra não ganhava o recurso
// "Ataque Bélico Bônus", e equivalentes pra Druida (Recuperação Natural)
// e Guerreiro (Dado de Superioridade).
import { describe, it, expect } from 'vitest'
import { defaultClassFeatureUses } from '../systems/dnd5e/domain/rules'

function makeCharacter({ primary, multiclasses, attributes = {} }) {
  return {
    info: {
      class: primary.class,
      level: primary.level,
      chosenFeatures: primary.chosenFeatures ?? {},
      multiclasses: multiclasses ?? [],
    },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16, ...attributes },
    combat: {},
  }
}

describe('defaultClassFeatureUses — features de sub-classe via MULTICLASSE', () => {
  it('Clérigo MC com Domínio da Guerra ganha Ataque Bélico Bônus', () => {
    // Bruxo 5 primary + Clérigo MC nv 3 com domain=guerra.
    const char = makeCharacter({
      primary: { class: 'bruxo', level: 5 },
      multiclasses: [{
        class: 'clerigo',
        level: 3,
        chosenFeatures: { divine_domain: 'guerra' },
      }],
    })
    const uses = defaultClassFeatureUses(char)
    const warPriest = uses.find(u => u.id === 'clerigo-war-priest')
    expect(warPriest, 'esperava clerigo-war-priest com domain=guerra').toBeDefined()
    expect(warPriest.name).toBe('Ataque Bélico Bônus')
    expect(warPriest.max).toBe(3) // CHA mod (16 → +3)
  })

  it('Clérigo MC com Domínio da Tempestade ganha Investida Furiosa', () => {
    const char = makeCharacter({
      primary: { class: 'bruxo', level: 5 },
      multiclasses: [{
        class: 'clerigo',
        level: 3,
        chosenFeatures: { divine_domain: 'tempestade' },
      }],
    })
    const uses = defaultClassFeatureUses(char)
    const wrath = uses.find(u => u.id === 'clerigo-wrath-of-storm')
    expect(wrath, 'esperava clerigo-wrath-of-storm com domain=tempestade').toBeDefined()
  })

  it('Druida MC com Círculo da Terra ganha Recuperação Natural', () => {
    const char = makeCharacter({
      primary: { class: 'bruxo', level: 5 },
      multiclasses: [{
        class: 'druida',
        level: 2,
        chosenFeatures: { druid_circle: 'terra' },
      }],
    })
    const uses = defaultClassFeatureUses(char)
    expect(uses.find(u => u.id === 'druida-natural-recovery')).toBeDefined()
  })

  it('Druida MC nv 14 com Círculo da Terra ganha Refúgio da Natureza', () => {
    const char = makeCharacter({
      primary: { class: 'bruxo', level: 6 },
      multiclasses: [{
        class: 'druida',
        level: 14,
        chosenFeatures: { druid_circle: 'terra' },
      }],
    })
    const uses = defaultClassFeatureUses(char)
    expect(uses.find(u => u.id === 'druida-natures-sanctuary')).toBeDefined()
  })

  it('Guerreiro MC Mestre de Combate ganha Dado de Superioridade', () => {
    const char = makeCharacter({
      primary: { class: 'bruxo', level: 5 },
      multiclasses: [{
        class: 'guerreiro',
        level: 3,
        chosenFeatures: { martial_archetype: 'mestre_combate' },
      }],
    })
    const uses = defaultClassFeatureUses(char)
    const superiority = uses.find(u => u.id === 'guerreiro-superiority-dice')
    expect(superiority, 'esperava dado de superioridade').toBeDefined()
    expect(superiority.name).toMatch(/d8/) // nv 3 → d8
    expect(superiority.max).toBe(4)         // nv 3 → 4 dados
  })

  it('Domínio do primário NÃO ativa recurso da MC (e vice-versa)', () => {
    // Primário Clérigo com Domínio da Vida (sem recurso especial nesta classe)
    // + MC Druida sem chosenFeatures → não dispara nem war-priest nem natural-recovery.
    const char = makeCharacter({
      primary: { class: 'clerigo', level: 5, chosenFeatures: { divine_domain: 'vida' } },
      multiclasses: [{ class: 'druida', level: 2, chosenFeatures: {} }],
    })
    const uses = defaultClassFeatureUses(char)
    expect(uses.find(u => u.id === 'clerigo-war-priest')).toBeUndefined()
    expect(uses.find(u => u.id === 'druida-natural-recovery')).toBeUndefined()
  })

  it('chosenFeatures do primário não vaza pra MC com mesma classe duplicada não acontece (lvl 1+ unique)', () => {
    // Garante isolamento: se primário é Clérigo Guerra e por algum motivo
    // chosenFeatures do MC Druida vier vazio, NÃO ganha war-priest
    // (que é específico de classe Clérigo + domain guerra, MC é Druida).
    const char = makeCharacter({
      primary: { class: 'clerigo', level: 3, chosenFeatures: { divine_domain: 'guerra' } },
      multiclasses: [{ class: 'druida', level: 2, chosenFeatures: {} }],
    })
    const uses = defaultClassFeatureUses(char)
    // Primary clerigo war ainda funciona
    expect(uses.find(u => u.id === 'clerigo-war-priest')).toBeDefined()
    // Druida sem druid_circle não ganha natural recovery
    expect(uses.find(u => u.id === 'druida-natural-recovery')).toBeUndefined()
  })
})
