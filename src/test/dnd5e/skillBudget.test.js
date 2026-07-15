import { describe, it, expect } from 'vitest'
import { racialSkillCount, skillBudget } from '../../systems/dnd5e/domain/skillBudget'

const bardo = { skill_choices: { count: 3 } }
// Recorte do phb-multiclass-pt.json: o número é quantas perícias a classe
// concede a QUEM ENTRA nela por multiclasse (PHB p.164).
const MC = {
  ladino:      { proficiencies: { skills: 1 } },
  patrulheiro: { proficiencies: { skills: 1 } },
  barbaro:     { proficiencies: { skills: 0 } },
}

describe('racialSkillCount', () => {
  it('Humano Variante ganha 1 perícia à escolha', () => {
    expect(racialSkillCount('humano', 'tracos-raciais-alternativos')).toBe(1)
  })

  it('Meio-Elfo ganha 2 (Versatilidade)', () => {
    expect(racialSkillCount('meio-elfo', '')).toBe(2)
  })

  it('humano comum não ganha nenhuma', () => {
    expect(racialSkillCount('humano', '')).toBe(0)
  })

  it('raça sem perícia racial devolve 0', () => {
    expect(racialSkillCount('anao', 'anao-da-colina')).toBe(0)
    expect(racialSkillCount(undefined, undefined)).toBe(0)
  })
})

describe('skillBudget', () => {
  it('classe pura, raça sem perícia: só o orçamento da classe', () => {
    const info = { race: 'humano', subrace: '', multiclasses: [] }
    expect(skillBudget({ classData: bardo, info, multiclassData: MC })).toBe(3)
  })

  it('bardo Humano Variante: 3 da classe + 1 da raça = 4', () => {
    const info = { race: 'humano', subrace: 'tracos-raciais-alternativos', multiclasses: [] }
    expect(skillBudget({ classData: bardo, info, multiclassData: MC })).toBe(4)
  })

  it('bardo Meio-Elfo: 3 + 2 = 5', () => {
    const info = { race: 'meio-elfo', subrace: '', multiclasses: [] }
    expect(skillBudget({ classData: bardo, info, multiclassData: MC })).toBe(5)
  })

  it('multiclasse soma o que a classe de entrada concede', () => {
    const info = { race: 'humano', subrace: '', multiclasses: [{ class: 'ladino', level: 1 }] }
    expect(skillBudget({ classData: bardo, info, multiclassData: MC })).toBe(4)
  })

  it('multiclasse que não concede perícia não muda o orçamento', () => {
    const info = { race: 'humano', subrace: '', multiclasses: [{ class: 'barbaro', level: 1 }] }
    expect(skillBudget({ classData: bardo, info, multiclassData: MC })).toBe(3)
  })

  it('raça e multiclasses acumulam', () => {
    const info = {
      race: 'meio-elfo', subrace: '',
      multiclasses: [{ class: 'ladino', level: 1 }, { class: 'patrulheiro', level: 1 }],
    }
    expect(skillBudget({ classData: bardo, info, multiclassData: MC })).toBe(7)
  })

  it('classe sem skill_choices: sem limite conhecido', () => {
    const info = { race: 'humano', subrace: '', multiclasses: [] }
    expect(skillBudget({ classData: null, info, multiclassData: MC })).toBeNull()
    expect(skillBudget({ classData: {}, info, multiclassData: MC })).toBeNull()
  })

  // O dataset de multiclasse é lazy: enquanto não chega, um orçamento
  // "parcial" acusaria excesso numa ficha legal. Melhor não afirmar nada.
  it('multiclasse com dataset ainda não carregado: null em vez de chute', () => {
    const info = { race: 'humano', subrace: '', multiclasses: [{ class: 'ladino', level: 1 }] }
    expect(skillBudget({ classData: bardo, info, multiclassData: {} })).toBeNull()
    expect(skillBudget({ classData: bardo, info, multiclassData: null })).toBeNull()
  })

  it('sem multiclasse, não espera o dataset lazy', () => {
    const info = { race: 'humano', subrace: 'tracos-raciais-alternativos', multiclasses: [] }
    expect(skillBudget({ classData: bardo, info, multiclassData: {} })).toBe(4)
  })
})
