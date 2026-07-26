import { describe, it, expect } from 'vitest'
import {
  excludeOptionsAlreadyPicked, getLeveledChoices,
} from '../../systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers'

/**
 * `excludesOptionsOf` — o segundo Estilo de Combate do Campeão (nv10) não pode
 * repetir o de nível 1 (PHB p.72): "escolhe um SEGUNDO estilo".
 */
const ESTILOS = [
  { value: 'arqueiro', name: 'Arqueiro' },
  { value: 'defesa', name: 'Defesa' },
  { value: 'duelo', name: 'Duelo' },
]

const segundo = {
  id: 'fighting_style_champion', level: 10,
  requires: { martial_archetype: 'campeao' },
  excludesOptionsOf: 'fighting_style',
  options: ESTILOS,
}

describe('excludeOptionsAlreadyPicked', () => {
  it('remove a opção já escolhida na choice de origem', () => {
    const r = excludeOptionsAlreadyPicked(segundo, { fighting_style: 'defesa' })
    expect(r.options.map(o => o.value)).toEqual(['arqueiro', 'duelo'])
  })

  it('não mexe em choices sem o campo', () => {
    const semCampo = { id: 'x', options: ESTILOS }
    expect(excludeOptionsAlreadyPicked(semCampo, { x: 'defesa' })).toBe(semCampo)
  })

  it('sem escolha de origem, oferece tudo', () => {
    expect(excludeOptionsAlreadyPicked(segundo, {}).options).toHaveLength(3)
  })

  it('preserva o valor já escolhido NESTA choice, mesmo que colida', () => {
    // Ficha antiga podia ter gravado o mesmo estilo nas duas; não some da lista
    // (senão o picker renderiza vazio e o jogador não vê o que escolheu).
    const r = excludeOptionsAlreadyPicked(segundo, {
      fighting_style: 'defesa', fighting_style_champion: 'defesa',
    })
    expect(r.options.map(o => o.value)).toContain('defesa')
  })

  it('aceita multiSelect na origem (array e string separada por vírgula)', () => {
    const arr = excludeOptionsAlreadyPicked(segundo, { fighting_style: ['defesa', 'duelo'] })
    expect(arr.options.map(o => o.value)).toEqual(['arqueiro'])
    const csv = excludeOptionsAlreadyPicked(segundo, { fighting_style: 'defesa,duelo' })
    expect(csv.options.map(o => o.value)).toEqual(['arqueiro'])
  })
})

describe('getLeveledChoices aplica excludesOptionsOf', () => {
  const clazz = {
    choices: [
      { id: 'fighting_style', level: 1, options: ESTILOS },
      segundo,
    ],
  }

  it('a escolha do Campeão só aparece com o arquétipo certo', () => {
    const semArquetipo = getLeveledChoices(clazz, 10, { fighting_style: 'defesa' }, ['phb'])
    expect(semArquetipo.map(c => c.id)).toEqual(['fighting_style'])

    const comArquetipo = getLeveledChoices(
      clazz, 10, { fighting_style: 'defesa', martial_archetype: 'campeao' }, ['phb'])
    expect(comArquetipo.map(c => c.id)).toEqual(['fighting_style', 'fighting_style_champion'])
  })

  it('e ela não oferece o estilo já escolhido no nível 1', () => {
    const [, campeao] = getLeveledChoices(
      clazz, 10, { fighting_style: 'defesa', martial_archetype: 'campeao' }, ['phb'])
    expect(campeao.options.map(o => o.value)).toEqual(['arqueiro', 'duelo'])
  })
})
