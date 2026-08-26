import { describe, it, expect } from 'vitest'
import { isRulesetPickerEnabled } from '../../systems/dnd5e/rulesetFlag'

describe('isRulesetPickerEnabled', () => {
  it('liga com ?ruleset=2024', () => {
    expect(isRulesetPickerEnabled('?ruleset=2024')).toBe(true)
  })

  it('fica desligado sem o parâmetro', () => {
    expect(isRulesetPickerEnabled('')).toBe(false)
    expect(isRulesetPickerEnabled('?outra=coisa')).toBe(false)
  })

  it('não liga com valor diferente', () => {
    expect(isRulesetPickerEnabled('?ruleset=2014')).toBe(false)
    expect(isRulesetPickerEnabled('?ruleset=sim')).toBe(false)
  })

  it('convive com outros parâmetros', () => {
    expect(isRulesetPickerEnabled('?adm=1&ruleset=2024')).toBe(true)
  })
})
