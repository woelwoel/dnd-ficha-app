import { describe, it, expect } from 'vitest'
import progressao from '../../../public/srd-data/homebrew-class-progression-pt.json'

describe('progressão do Caçador de Sangue', () => {
  const bh = progressao['cacador-de-sangue']

  it('cobre os 20 níveis, em ordem, sem buraco', () => {
    expect(bh.levels).toHaveLength(20)
    expect(bh.levels.map(l => l.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  it('tem o bônus de proficiência certo em cada nível', () => {
    for (const l of bh.levels) {
      expect(l.prof, `nível ${l.level}`).toBe(Math.floor((l.level - 1) / 4) + 2)
    }
  })

  it('concede as features de abertura nos níveis certos', () => {
    const nomes = n => bh.levels[n - 1].features.map(f => f.name)
    expect(nomes(1)).toEqual(['Perdição do Caçador', 'Ritual Vermelho'])
    expect(nomes(2)).toEqual(['Estilo de Luta', 'Sangue Maldito'])
    expect(nomes(3)).toEqual(['Ordem do Caçador de Sangue'])
    expect(nomes(5)).toEqual(['Ataque Extra'])
    expect(nomes(20)).toEqual(['Maestria Sanguinária'])
  })

  it('mantém o nível 13 vazio, como na tabela original', () => {
    expect(bh.levels[12].features).toEqual([])
  })

  it('põe Incremento no Valor de Habilidade nos cinco níveis do PHB', () => {
    const comAsi = bh.levels
      .filter(l => l.features.some(f => f.name === 'Incremento no Valor de Habilidade'))
      .map(l => l.level)
    expect(comAsi).toEqual([4, 8, 12, 16, 19])
  })

  it('escala Sangue Maldito nos níveis 6, 11 e 17', () => {
    const comEscala = bh.levels
      .filter(l => l.features.some(f => /^Sangue Maldito \(\d\)$/.test(f.name)))
      .map(l => l.level)
    expect(comEscala).toEqual([6, 11, 17])
  })

  it('dá descrição de verdade a toda feature — ficha sem texto é ficha quebrada', () => {
    for (const l of bh.levels) {
      for (const f of l.features) {
        expect(f.desc.length, `${f.name} (nv ${l.level})`).toBeGreaterThan(40)
      }
    }
  })

  it('repete o bloco de identidade da classe', () => {
    expect(bh.hit_die).toBe(10)
    expect(bh.saving_throws).toEqual(['Força', 'Sabedoria'])
    expect(bh.skill_choices.count).toBe(2)
  })
})
