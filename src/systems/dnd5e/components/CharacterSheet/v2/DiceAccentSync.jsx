import { useEffect } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useDiceRoller } from '../../../../../hooks/useDiceRoller'
import { classAccentOf } from './classAccents'

/**
 * Sincroniza a cor dos dados 3D com o accent da classe enquanto a ficha v2
 * está montada; ao sair da ficha, volta pro colorset padrão do app.
 */
export function DiceAccentSync() {
  const { character } = useCharacterContext()
  const { setDiceAccent } = useDiceRoller()
  const classIndex = character?.info?.class
  useEffect(() => {
    setDiceAccent(classAccentOf(classIndex))
    return () => setDiceAccent(null)
  }, [classIndex, setDiceAccent])
  return null
}
