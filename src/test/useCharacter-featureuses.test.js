import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCharacter } from '../systems/dnd5e/hooks/useCharacter'

describe('useCharacter — spend/regain aceitam lista explícita', () => {
  it('spendFeatureUse(id, list) usa a lista passada e persiste o uso', () => {
    const base = { info: { class: 'bruxo', level: 6 }, combat: { classFeatureUses: [] }, attributes: {} }
    const { result } = renderHook(() => useCharacter(base))
    const list = [{ id: 'bruxo-sub-insondavel-1-x', name: 'Tentáculo', max: 3, used: 0, recharge: 'long', source: 'bruxo' }]
    act(() => result.current.spendFeatureUse('bruxo-sub-insondavel-1-x', list))
    const saved = result.current.character.combat.classFeatureUses.find(u => u.id === 'bruxo-sub-insondavel-1-x')
    expect(saved.used).toBe(1)
  })

  it('gasto SEM lista (ex.: ManeuversPanel) não zera tracker de subclasse persistido', () => {
    // Guerreiro Mestre de Combate 3 (dado de superioridade = tracker hardcoded)
    // com um tracker de subclasse já gasto persistido (id fora dos defaults deste
    // hook, pois depende de classChoices). Gastar o dado sem passar lista NÃO
    // pode descartar o `used` do tracker de subclasse.
    const base = {
      info: { class: 'guerreiro', level: 3, chosenFeatures: { martial_archetype: 'mestre_combate' } },
      attributes: {},
      combat: { classFeatureUses: [
        { id: 'guerreiro-sub-arcano-2-x', name: 'Feature de subclasse', max: 2, used: 1, recharge: 'long', source: 'guerreiro' },
      ] },
    }
    const { result } = renderHook(() => useCharacter(base))
    act(() => result.current.spendFeatureUse('guerreiro-superiority-dice')) // sem lista
    const sub = result.current.character.combat.classFeatureUses.find(u => u.id === 'guerreiro-sub-arcano-2-x')
    expect(sub).toBeTruthy()
    expect(sub.used).toBe(1) // preservado
  })
})

/**
 * Pools grandes (Imposição das Mãos, Ki, Pontos de Feitiçaria) gastam N pontos
 * chamando `spendFeatureUse` N vezes DENTRO DO MESMO handler — sempre com a
 * mesma lista, capturada no render. A lista é uma FOTO: seu `used` congela no
 * valor de antes do clique. Quem manda no `used` tem que ser o `prev` do
 * setState, senão as N chamadas gravam todas o mesmo `used + 1` e o pool cai
 * de 1 ponto só. Da lista queremos a ESTRUTURA (ids/max/recharge — é ela que
 * conhece os trackers de subclasse), nunca o `used`.
 */
describe('useCharacter — gasto múltiplo no mesmo tick (pools grandes)', () => {
  const paladino = () => ({
    info: { class: 'paladino', level: 2 },
    attributes: {},
    combat: { classFeatureUses: [] },
  })
  const loh = (used = 0) => ([
    { id: 'paladino-lay-on-hands', name: 'Imposição das Mãos', max: 10, used, recharge: 'long', source: 'paladino' },
  ])
  const find = result => result.current.character.combat.classFeatureUses
    .find(u => u.id === 'paladino-lay-on-hands')

  it('gastar 5 pontos com a mesma lista soma 5 usos', () => {
    const { result } = renderHook(() => useCharacter(paladino()))
    const list = loh(0)
    act(() => {
      for (let i = 0; i < 5; i++) result.current.spendFeatureUse('paladino-lay-on-hands', list)
    })
    expect(find(result).used).toBe(5)
  })

  it('recuperar 3 pontos com a mesma lista devolve 3 usos', () => {
    const { result } = renderHook(() => useCharacter({
      ...paladino(),
      combat: { classFeatureUses: loh(8) },
    }))
    const list = loh(8)
    act(() => {
      for (let i = 0; i < 3; i++) result.current.regainFeatureUse('paladino-lay-on-hands', list)
    })
    expect(find(result).used).toBe(5)
  })

  it('gasto não regride o `used` já persistido quando a lista está velha', () => {
    // Lista de um render anterior (used 0) contra ficha que já gastou 4.
    const { result } = renderHook(() => useCharacter({
      ...paladino(),
      combat: { classFeatureUses: loh(4) },
    }))
    act(() => result.current.spendFeatureUse('paladino-lay-on-hands', loh(0)))
    expect(find(result).used).toBe(5)
  })
})
