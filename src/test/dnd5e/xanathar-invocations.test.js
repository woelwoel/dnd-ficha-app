import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'

const phb = JSON.parse(readFileSync('public/srd-data/phb-class-choices-pt.json', 'utf8'))
const xge = JSON.parse(readFileSync('public/srd-data/xanathar-class-choices-pt.json', 'utf8'))

const EXPECTED = [
  'aperto_de_hadar', 'arma_de_pacto_aprimorada', 'aspecto_da_lua',
  'dadiva_das_profundezas', 'destruicao_mistica', 'fuga_do_escapista',
  'lanca_da_letargia', 'maldicao_enlouquecedora', 'maldicao_incansavel',
  'manto_de_moscas', 'olhar_fantasmagorico', 'presente_dos_sempre_vivos',
  'sudario_das_sombras', 'tumulo_de_levistus',
]

describe('invocações místicas do XGE', () => {
  const choice = xge.bruxo.choices.find(c => c.id === 'eldritch_invocations')

  it('a choice eldritch_invocations existe com as 14 invocações do XGE', () => {
    expect(choice, 'choice eldritch_invocations').toBeTruthy()
    const vals = choice.options.map(o => o.value)
    for (const v of EXPECTED) expect(vals, v).toContain(v)
    expect(choice.options.length).toBe(14)
  })

  it('toda opção tem name, desc com pré-requisito e tag de combate', () => {
    for (const o of choice.options) {
      expect(o.name?.length, `${o.value} name`).toBeGreaterThan(3)
      expect(o.desc?.length, `${o.value} desc`).toBeGreaterThan(30)
      expect(/Pré-requisito/i.test(o.desc), `${o.value} sem pré-requisito`).toBe(true)
      expect(['essencial', 'situacional'], `${o.value} combat`).toContain(o.combat)
    }
  })

  it('ao compor com o PHB, some às invocações do PHB e são carimbadas xanathar', () => {
    const composed = mergeClassChoices(phb, xge, 'xanathar')
    const ei = composed.bruxo.choices.find(c => c.id === 'eldritch_invocations')
    // mantém o multiSelectByLevel do PHB (a contagem por nível)
    expect(ei.multiSelectByLevel, 'multiSelectByLevel do PHB preservado').toBeTruthy()
    const phbCount = phb.bruxo.choices.find(c => c.id === 'eldritch_invocations').options.length
    expect(ei.options.length).toBe(phbCount + 14)
    for (const v of EXPECTED) {
      const o = ei.options.find(x => x.value === v)
      expect(o?.source, `${v} carimbado`).toBe('xanathar')
    }
  })
})
