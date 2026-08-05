import { describe, it, expect } from 'vitest'
import { validateMagias } from '../systems/dnd5e/hooks/useTabValidation'

/**
 * Conjurador precisa ter o atributo de conjuração definido; não-conjurador não.
 *
 * Este arquivo replicava a função E a lista de classes dentro do próprio teste,
 * então passava verde mesmo que a produção mudasse. Agora importa a real, que
 * consulta `SPELLCASTER_CLASSES` do domínio — se uma classe entrar ou sair
 * daquele conjunto, é aqui que aparece.
 */
describe('validateMagias — nomes PT-BR', () => {
  const makeChar = (cls, ability = null) => ({
    info: { class: cls },
    spellcasting: { ability },
  })

  it('mago sem atributo de conjuração → erro', () => {
    const e = validateMagias(makeChar('mago'))
    expect(e.spellAbility).toBeDefined()
  })

  it('clerigo sem atributo → erro', () => {
    expect(validateMagias(makeChar('clerigo')).spellAbility).toBeDefined()
  })

  it('bruxo sem atributo → erro', () => {
    expect(validateMagias(makeChar('bruxo')).spellAbility).toBeDefined()
  })

  it('patrulheiro sem atributo → erro', () => {
    expect(validateMagias(makeChar('patrulheiro')).spellAbility).toBeDefined()
  })

  it('guerreiro não é conjurador → sem erro', () => {
    expect(validateMagias(makeChar('guerreiro')).spellAbility).toBeUndefined()
  })

  it('ladino não é conjurador → sem erro', () => {
    expect(validateMagias(makeChar('ladino')).spellAbility).toBeUndefined()
  })

  it('mago COM atributo definido → sem erro', () => {
    expect(validateMagias(makeChar('mago', 'int')).spellAbility).toBeUndefined()
  })

  // O catálogo é PT-BR: índice em inglês não pode casar por acidente.
  it('wizard (inglês) NÃO é reconhecido como conjurador', () => {
    expect(validateMagias(makeChar('wizard')).spellAbility).toBeUndefined()
  })

  it('cleric (inglês) NÃO é reconhecido como conjurador', () => {
    expect(validateMagias(makeChar('cleric')).spellAbility).toBeUndefined()
  })

  it('classe ausente → sem erro', () => {
    expect(validateMagias(makeChar(undefined)).spellAbility).toBeUndefined()
  })
})
