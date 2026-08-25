import { describe, it, expect } from 'vitest'
import catalogo from '../../../public/srd-data/homebrew-classes-pt.json'
import phbClasses from '../../../public/srd-data/phb-classes-pt.json'

describe('catálogo de classes de terceiros', () => {
  const bh = catalogo.find(c => c.index === 'cacador-de-sangue')

  it('traz o Caçador de Sangue', () => {
    expect(bh).toBeDefined()
    expect(bh.name).toBe('Caçador de Sangue')
  })

  it('tem o bloco de identidade do PDF', () => {
    expect(bh.hit_die).toBe(10)
    expect(bh.saving_throws).toEqual(['Força', 'Sabedoria'])
    expect(bh.skill_choices.count).toBe(2)
    expect(bh.skill_choices.from).toEqual(
      ['Acrobacia', 'Arcanismo', 'Atletismo', 'Intuição', 'Investigação', 'Sobrevivência']
    )
  })

  it('não declara conjuração — a classe base não conjura', () => {
    expect(bh.spellcasting_ability).toBeUndefined()
  })

  it('tem resumo e lore para o modal de informação da classe', () => {
    expect(bh.summary.length).toBeGreaterThan(40)
    expect(bh.fullDescription.length).toBeGreaterThan(200)
  })

  /**
   * Papel fora do vocabulário existente sai sem legenda nas pílulas do modal
   * de classe. O conjunto válido é o que as 12 classes do PHB já usam.
   */
  it('usa apenas papéis que o modal de classe sabe legendar', () => {
    const validos = new Set(phbClasses.flatMap(c => c.roles ?? []))
    expect(bh.roles.length).toBeGreaterThan(0)
    for (const papel of bh.roles) {
      expect(validos, `papel desconhecido: ${papel}`).toContain(papel)
    }
  })
})
