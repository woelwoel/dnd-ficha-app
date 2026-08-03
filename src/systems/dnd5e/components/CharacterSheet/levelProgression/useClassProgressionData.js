// src/components/CharacterSheet/levelProgression/useClassProgressionData.js
// Hook que entrega as 3 fontes de dados da progressão de classes: progressões
// 1-20, escolhas de feature por nível e regras de multiclasse.
//
// Tudo vem do SrdProvider, que já COMPÕE as fontes (PHB + Tasha + Xanathar).
// Antes este hook dava `fetch` nos JSONs do PHB direto, por fora do provider —
// e era por isso que subir de nível só oferecia conteúdo do livro básico
// (nenhuma subclasse de Tasha/Xanathar) enquanto o wizard de criação, que lê do
// provider, oferecia tudo. A progressão do Artífice, que só existe em Tasha,
// nem aparecia: o painel dizia "dados de progressão não encontrados".
import { useSrd, useLazySrdDataset } from '../../../data/SrdProvider'

export function useClassProgressionData() {
  const { progression, classChoices, ready } = useSrd()
  // Regras de multiclasse só interessam a quem abre o seletor — dataset lazy.
  const mcRules = useLazySrdDataset('multiclass')

  return {
    // `null` enquanto o core não terminou: é assim que o painel distingue
    // "ainda carregando" de "esta classe não tem progressão".
    allProgressions: ready ? (progression ?? {}) : null,
    classChoices: classChoices ?? {},
    mcRules: mcRules ?? {},
  }
}
