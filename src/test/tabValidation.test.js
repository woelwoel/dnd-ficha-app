import { describe, it, expect } from 'vitest'

// Replica da lógica de validateMagias
function validateMagias(character) {
  const errors = {}
  const SPELLCASTERS = ['bardo','clerigo','druida','paladino','patrulheiro','feiticeiro','bruxo','mago']
  const cls = character.info.class?.toLowerCase()
  if (cls && SPELLCASTERS.includes(cls) && !character.spellcasting.ability) {
    errors.spellAbility = 'Defina o atributo de conjuração na aba Magias'
  }
  return errors
}

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

  // Garante que nomes em inglês NÃO são reconhecidos (comportamento novo)
  it('wizard (inglês) NÃO é reconhecido como conjurador', () => {
    expect(validateMagias(makeChar('wizard')).spellAbility).toBeUndefined()
  })

  it('cleric (inglês) NÃO é reconhecido como conjurador', () => {
    expect(validateMagias(makeChar('cleric')).spellAbility).toBeUndefined()
  })
})
