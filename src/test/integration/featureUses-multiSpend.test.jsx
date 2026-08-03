import { describe, it, expect } from 'vitest'
import { useMemo } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CombatClassActions } from '../../systems/dnd5e/components/CharacterSheet/CombatClassActions'
import { DiceRollerProvider } from '../../context/DiceRollerContext'
import { useCharacter } from '../../systems/dnd5e/hooks/useCharacter'
import { defaultClassFeatureUses, mergeFeatureUses } from '../../systems/dnd5e/domain/rules'

/**
 * Fiação REAL da ficha (SheetContent/ActionsTab): o painel recebe a lista
 * derivada `featureUses` e devolve ela em cada gasto — `spendFeatureUse(id,
 * featureUses)`. É essa fiação que fazia "Gastar 5" tirar 1 ponto só: a lista
 * é a foto do render e não avança entre as N chamadas do mesmo clique.
 *
 * O harness de `classActions.test.jsx` não pega isso porque implementa o
 * gasto com um updater funcional próprio, que sempre lê o estado fresco.
 */
function WiredActions({ initial }) {
  const api = useCharacter(initial)
  const { character } = api
  const featureUses = useMemo(
    () => mergeFeatureUses(character.combat?.classFeatureUses ?? [], defaultClassFeatureUses(character)),
    [character],
  )
  return (
    <DiceRollerProvider>
      <CombatClassActions
        character={character}
        featureUses={featureUses}
        onSpendFeatureUse={id => api.spendFeatureUse(id, featureUses)}
        onRegainFeatureUse={id => api.regainFeatureUse(id, featureUses)}
        onToggleSlot={(lvl, used) => api.toggleSlot(lvl, used)}
      />
    </DiceRollerProvider>
  )
}

function baseCharacter(classIndex, level, extraCombat = {}) {
  const c = {
    info: { name: `Test ${classIndex}`, class: classIndex, level, race: 'humano', multiclasses: [], chosenFeatures: {} },
    attributes: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 16 },
    combat: {
      maxHp: 40, currentHp: 40, tempHp: 0, armorClass: 14, speed: 9,
      attacks: [], deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
      classFeatureUses: [], knownBeasts: [],
      ...extraCombat,
    },
    spellcasting: { ability: null, usedSlots: {}, spells: [] },
  }
  c.combat.classFeatureUses = defaultClassFeatureUses(c)
  return c
}

describe('gasto de N pontos num clique só (fiação da ficha)', () => {
  it('Paladino: "Gastar 5" tira 5 pontos do pool de Imposição das Mãos', async () => {
    const user = userEvent.setup()
    render(<WiredActions initial={baseCharacter('paladino', 3)} />)

    expect(screen.getByText(/Imposição das Mãos/).textContent).toMatch(/15\/15 PV/)
    await user.click(screen.getByRole('button', { name: 'Gastar 5' }))
    expect(screen.getByText(/Imposição das Mãos/).textContent).toMatch(/10\/15 PV/)
  })

  it('Feiticeiro: metamagia de 2 pontos cobra os 2 pontos', async () => {
    const user = userEvent.setup()
    render(<WiredActions initial={baseCharacter('feiticeiro', 5)} />)

    expect(screen.getByText(/Feitiçaria · Pontos:/).textContent).toMatch(/5\/5/)
    await user.click(screen.getByRole('button', { name: /Pungente/ }))
    expect(screen.getByText(/Feitiçaria · Pontos:/).textContent).toMatch(/3\/5/)
  })

  it('Feiticeiro: converter espaço de Nv 2 em pontos devolve 2 pontos', async () => {
    const user = userEvent.setup()
    // Pool com 4 pontos gastos e um espaço de 2º círculo disponível.
    const char = baseCharacter('feiticeiro', 5)
    char.combat.classFeatureUses = char.combat.classFeatureUses.map(u =>
      u.id === 'feiticeiro-sorcery-points' ? { ...u, used: 4 } : u)
    render(<WiredActions initial={char} />)

    await user.click(screen.getByRole('button', { name: 'Conversão Flexível' }))
    expect(screen.getByText(/Feitiçaria · Pontos:/).textContent).toMatch(/1\/5/)
    await user.click(screen.getByRole('button', { name: 'Nv 2 → +2pt' }))
    expect(screen.getByText(/Feitiçaria · Pontos:/).textContent).toMatch(/3\/5/)
  })
})
