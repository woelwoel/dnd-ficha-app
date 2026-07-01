import { describe, it, expect } from 'vitest'
import { roleStyle, ROLE_DEFINITIONS, ROLE_ORDER } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/class-roles'

const ALL_ROLES = [
  'DANO CORPO A CORPO', 'DANO À DISTÂNCIA', 'DANO MÁGICO', 'CURA', 'SUPORTE',
  'TANQUE', 'CONTROLE', 'UTILIDADE', 'FURTIVIDADE', 'INVOCAÇÃO',
]

describe('class-roles', () => {
  it('roleStyle retorna classes de cor para cada papel conhecido', () => {
    for (const role of ALL_ROLES) {
      const cls = roleStyle(role)
      expect(typeof cls).toBe('string')
      expect(cls.length).toBeGreaterThan(0)
    }
  })

  it('roleStyle usa vermelho pra dano corpo a corpo e verde pra cura', () => {
    expect(roleStyle('DANO CORPO A CORPO')).toContain('red')
    expect(roleStyle('CURA')).toContain('green')
  })

  it('roleStyle tem fallback neutro pra papel desconhecido', () => {
    expect(roleStyle('QUALQUER COISA')).toContain('parchment')
  })

  it('ROLE_DEFINITIONS tem frase pra todos os 10 papéis', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_DEFINITIONS[role]).toBeTruthy()
      expect(ROLE_DEFINITIONS[role].length).toBeGreaterThan(10)
    }
  })

  it('ROLE_ORDER lista os 10 papéis', () => {
    expect([...ROLE_ORDER].sort()).toEqual([...ALL_ROLES].sort())
  })
})
