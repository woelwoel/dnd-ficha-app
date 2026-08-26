import { describe, it, expect } from 'vitest'
import equip from '../../../public/srd-data/homebrew-class-equipment-pt.json'
import phbEquip from '../../../public/srd-data/phb-class-equipment-pt.json'
import { BLOOD_HUNTER } from '../../systems/dnd5e/domain/bloodHunter'
import { resolveClassEquipmentItems } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'

const bh = equip[BLOOD_HUNTER]

/** Valores de `pick` que a UI de equipamento sabe resolver. */
const PICKS_VALIDOS = new Set(
  JSON.stringify(phbEquip).match(/"pick":"[^"]+"/g).map(m => m.split('"')[3])
)

describe('equipamento inicial do Caçador de Sangue', () => {
  it('existe no catálogo de terceiros', () => {
    expect(bh).toBeDefined()
    expect(bh.choices.length).toBeGreaterThan(0)
  })

  it('tem as três escolhas do PDF', () => {
    expect(bh.choices.map(c => c.id)).toEqual([
      'cacador_de_sangue_arma',
      'cacador_de_sangue_secundaria',
      'cacador_de_sangue_armadura',
    ])
    for (const c of bh.choices) {
      expect(c.options.map(o => o.value), c.id).toEqual(['a', 'b'])
    }
  })

  it('inclui o pacote de explorador como item fixo', () => {
    expect(bh.fixed.map(i => i.name)).toContain('Pacote de Explorador')
  })

  /**
   * `pick` fora do vocabulário existente vira um item que a UI não sabe
   * resolver — o jogador escolhe a opção e não recebe arma nenhuma.
   */
  it('só usa valores de pick que a UI conhece', () => {
    const todos = JSON.stringify(bh).match(/"pick":"[^"]+"/g) ?? []
    for (const p of todos) {
      expect(PICKS_VALIDOS, p).toContain(p.split('"')[3])
    }
  })
})

describe('o wizard resolve o equipamento escolhido', () => {
  function draft(escolhas, picks = {}) {
    return {
      class: BLOOD_HUNTER,
      classEquipmentChoice: 'equipment',
      classEquipmentChoices: escolhas,
      classEquipmentPicks: picks,
    }
  }

  it('entrega os itens da opção escolhida', () => {
    const itens = resolveClassEquipmentItems(
      draft({
        cacador_de_sangue_arma: 'b',
        cacador_de_sangue_secundaria: 'a',
        cacador_de_sangue_armadura: 'a',
      }, {
        'cacador_de_sangue_arma:b:0': 'Clava',
        'cacador_de_sangue_arma:b:1': 'Adaga',
      }),
      equip
    )
    const nomes = itens.map(i => i.name)
    expect(nomes).toContain('Besta Leve')
    expect(nomes).toContain('Couro Batido')
    expect(nomes).toContain('Pacote de Explorador')
  })

  it('não entrega nada quando o jogador optou por ouro', () => {
    const d = draft({ cacador_de_sangue_armadura: 'a' })
    d.classEquipmentChoice = 'gold'
    expect(resolveClassEquipmentItems(d, equip)).toEqual([])
  })
})
