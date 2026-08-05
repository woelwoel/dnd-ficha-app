import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useTabValidation } from '../systems/dnd5e/hooks/useTabValidation'
import { CharacterInfo } from '../systems/dnd5e/components/CharacterSheet/CharacterInfo'

/**
 * Fiação do diálogo "Identidade" da ficha v2: o CharacterSheet passa
 * `getTabErrors('ficha')` como `errors` do CharacterInfo. Este teste prova que
 * a mensagem chega à tela já no primeiro render — antes, o gate de "abas
 * tocadas" (alimentado só pelo layout v1) deixava `errors` sempre vazio e
 * nenhum campo inválido era marcado.
 */

const RACES = [
  { index: 'elfo', name: 'Elfo', subraces: [{ index: 'alto-elfo', name: 'Alto Elfo' }] },
  { index: 'humano', name: 'Humano', subraces: [] },
]
const CLASSES = [{ index: 'guerreiro', name: 'Guerreiro' }]
const BACKGROUNDS = [{ index: 'forasteiro', name: 'Forasteiro' }]

const noop = () => {}

function makeCharacter(info = {}) {
  return {
    info: { name: 'Thorin', race: 'humano', subrace: '', class: 'guerreiro', level: 5, ...info },
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 8 },
    combat: { armorClass: 16, maxHp: 40, currentHp: 30 },
    spellcasting: { ability: 'int' },
    proficiencies: { languages: [] },
  }
}

// Réplica mínima da fiação do CharacterSheet → HeaderV2 → CharacterInfo.
function IdentityDialogContent({ character }) {
  const { getTabErrors } = useTabValidation(character, { races: RACES })
  return (
    <CharacterInfo
      info={{ ...character.info, languages: [] }}
      onUpdate={noop}
      races={RACES}
      classes={CLASSES}
      backgrounds={BACKGROUNDS}
      errors={getTabErrors('ficha')}
      onToggleLanguage={noop}
    />
  )
}

describe('diálogo Identidade — campos inválidos', () => {
  it('ficha sem raça mostra a mensagem no primeiro render', () => {
    render(<IdentityDialogContent character={makeCharacter({ race: '' })} />)
    expect(screen.getByText('Raça é obrigatória')).toBeInTheDocument()
  })

  it('ficha sem nome mostra a mensagem no primeiro render', () => {
    render(<IdentityDialogContent character={makeCharacter({ name: '' })} />)
    expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument()
  })

  it('sub-raça obrigatória em branco mostra a mensagem no primeiro render', () => {
    render(<IdentityDialogContent character={makeCharacter({ race: 'elfo', subrace: '' })} />)
    expect(screen.getByText('Sub-raça é obrigatória para Elfo')).toBeInTheDocument()
  })

  it('ficha completa não mostra nenhuma mensagem de erro', () => {
    render(<IdentityDialogContent character={makeCharacter()} />)
    expect(screen.queryByText(/é obrigatóri/)).not.toBeInTheDocument()
  })
})
