/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'

/**
 * Contexto da ficha. Carrega tudo que o conteúdo da Sheet precisa:
 *
 *   - character / setCharacter (estado)
 *   - calc (derivados memoizados)
 *   - classData + dados de SRD pré-resolvidos (races/classes/backgrounds)
 *   - updaters (30+ setters/handlers de useCharacter)
 *   - handlers (de useSheetHandlers — racial/class/background changes)
 *   - fichaErrors + featureUses
 *   - onNavigateToSpells (callback de UI)
 *
 * Componentes filhos podem consumir via useCharacterContext() em vez de
 * receber 10-15 props diretas. Pré-requisito para o item 9 (quebrar
 * god-components em sub-componentes focados — eles podem puxar do
 * contexto direto sem precisar passar props pela árvore inteira).
 */
const CharacterCtx = createContext(null)

export function CharacterProvider({ value, children }) {
  return <CharacterCtx.Provider value={value}>{children}</CharacterCtx.Provider>
}

export function useCharacterContext() {
  const ctx = useContext(CharacterCtx)
  if (ctx == null) {
    throw new Error('useCharacterContext deve ser usado dentro de <CharacterProvider>')
  }
  return ctx
}

/**
 * Versão tolerante: devolve `null` fora do provider em vez de lançar. Para
 * componentes genéricos que ENFEITAM a ficha quando estão dentro dela, mas
 * também funcionam soltos (ex.: EditDialog pegando o accent da classe).
 */
export function useOptionalCharacterContext() {
  return useContext(CharacterCtx)
}
