import { describe, it, expect, vi } from 'vitest'
import { renderWithSheetContext, makeCharacter } from './helpers/sheetV2TestContext'
import { DiceAccentSync } from '../systems/dnd5e/components/CharacterSheet/v2/DiceAccentSync'

describe('DiceAccentSync', () => {
  it('seta o accent da classe ao montar e limpa ao desmontar', () => {
    const setDiceAccent = vi.fn()
    const character = makeCharacter({
      info: { ...makeCharacter().info, class: 'guerreiro' },
    })
    const { unmount } = renderWithSheetContext(<DiceAccentSync />, {
      character, dice: { setDiceAccent },
    })
    expect(setDiceAccent).toHaveBeenCalledWith('#d9a06a') // CLASS_ACCENTS.guerreiro
    unmount()
    expect(setDiceAccent).toHaveBeenLastCalledWith(null)
  })

  it('classe desconhecida usa o fallback do classAccentOf', () => {
    const setDiceAccent = vi.fn()
    const { unmount } = renderWithSheetContext(<DiceAccentSync />, {
      character: makeCharacter(), // class: 'fighter' (índice inexistente em pt)
      dice: { setDiceAccent },
    })
    expect(setDiceAccent).toHaveBeenCalledWith('#4fc7ab')
    unmount()
  })
})
