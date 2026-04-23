import { useCallback, useMemo } from 'react'
import { parseBackgroundEquipment } from '../../utils/calculations'
import { generateId } from '../../hooks/useCharacter'
import {
  applyClassChange,
  applyRacialChange,
  applyBackgroundChange,
  addMulticlass,
  removeMulticlass,
  applyLevelUp,
  syncGrantedSpells,
} from '../../domain/rules'

/**
 * Encapsula todos os handlers da ficha que envolvem regras de domínio.
 * Recebe o setter `setCharacter` (já carimba meta.updatedAt) e os datasets SRD.
 */
export function useSheetHandlers({ setCharacter, races, classes, backgrounds }) {
  const handleClassChange = useCallback(newClassIndex => {
    const classData = classes.find(c => c.index === newClassIndex) ?? { index: newClassIndex }
    setCharacter(prev => applyClassChange(prev, classData))
  }, [classes, setCharacter])

  const handleRaceChange = useCallback(idx => {
    setCharacter(prev => applyRacialChange(prev, { race: idx, subrace: '' }, idx, '', races))
  }, [races, setCharacter])

  const handleSubraceChange = useCallback(idx => {
    setCharacter(prev => applyRacialChange(prev, { subrace: idx }, prev.info.race, idx, races))
  }, [races, setCharacter])

  const handleBackgroundChange = useCallback(newBgIndex => {
    setCharacter(prev => applyBackgroundChange(
      prev, newBgIndex, backgrounds, parseBackgroundEquipment, generateId
    ))
  }, [backgrounds, setCharacter])

  const handleAddMulticlass = useCallback(payload => {
    setCharacter(prev => addMulticlass(prev, payload))
  }, [setCharacter])

  const handleRemoveMulticlass = useCallback(idx => {
    setCharacter(prev => removeMulticlass(prev, idx))
  }, [setCharacter])

  const handleApplyLevelUp = useCallback(patch => {
    setCharacter(prev => applyLevelUp(prev, patch))
  }, [setCharacter])

  const handleChosenFeaturesChange = useCallback(newFeatures => {
    setCharacter(prev => syncGrantedSpells({
      ...prev,
      info: { ...prev.info, chosenFeatures: newFeatures },
    }))
  }, [setCharacter])

  return useMemo(() => ({
    handleClassChange,
    handleRaceChange,
    handleSubraceChange,
    handleBackgroundChange,
    handleAddMulticlass,
    handleRemoveMulticlass,
    handleApplyLevelUp,
    handleChosenFeaturesChange,
  }), [
    handleClassChange, handleRaceChange, handleSubraceChange, handleBackgroundChange,
    handleAddMulticlass, handleRemoveMulticlass, handleApplyLevelUp, handleChosenFeaturesChange,
  ])
}
