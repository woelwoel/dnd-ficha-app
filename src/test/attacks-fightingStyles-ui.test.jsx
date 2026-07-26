import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderWithSheetContext, makeCharacter, makeCalc, makeDice } from './helpers/sheetV2TestContext'
import { DiceRollerContext } from '../hooks/useDiceRoller'
import { ActionsTab } from '../systems/dnd5e/components/CharacterSheet/v2/ActionsTab'
import { Attacks } from '../systems/dnd5e/components/CharacterSheet/Attacks'

/**
 * O estilo do personagem tem de chegar na LINHA de ataque das duas fichas.
 * Arco longo, DES 13 (+1), BP 5 → +6 sem estilo, +8 com Arqueiro.
 */
const ARCO = {
  id: 'atk1', name: 'Arco Longo', damageDice: '1d8', damageType: 'perfurante',
  properties: ['ranged'], proficient: true,
}

function charComArco() {
  const ch = makeCharacter()
  ch.combat = { ...ch.combat, attacks: [ARCO] }
  return ch
}

describe('estilo de combate na linha de ataque (ficha v2)', () => {
  it('sem estilo, o bônus é só atributo + proficiência', () => {
    renderWithSheetContext(<ActionsTab />, { character: charComArco() })
    expect(screen.getByText('+6')).toBeInTheDocument()
  })

  it('com Arqueiro, a linha mostra o +2 do estilo', () => {
    renderWithSheetContext(<ActionsTab />, {
      character: charComArco(),
      calc: makeCalc({ fightingStyles: ['archery'] }),
    })
    expect(screen.getByText('+8')).toBeInTheDocument()
  })
})

describe('estilo de combate na linha de ataque (ficha v1)', () => {
  const attrs = { str: 20, dex: 13, con: 18, int: 18, wis: 9, cha: 8 }

  const renderV1 = props => render(
    <DiceRollerContext.Provider value={makeDice()}>
      <Attacks attacks={[ARCO]} attributes={attrs} profBonus={5} {...props} />
    </DiceRollerContext.Provider>
  )

  it('sem estilo, o bônus é só atributo + proficiência', () => {
    renderV1({})
    expect(screen.getAllByText('+6').length).toBeGreaterThan(0)
  })

  it('com Arqueiro, a linha mostra o +2 do estilo', () => {
    renderV1({ fightingStyles: ['archery'] })
    expect(screen.getAllByText('+8').length).toBeGreaterThan(0)
  })
})
