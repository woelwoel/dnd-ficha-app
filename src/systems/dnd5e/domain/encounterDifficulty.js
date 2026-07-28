// src/systems/dnd5e/domain/encounterDifficulty.js
/**
 * Dificuldade de encontro (spec 2026-07-27 Construtor de Encontros).
 *
 * Camada PURA: só números entram e saem. Sem React, sem Supabase, sem catálogo
 * de monstros — quem soma o XP dos monstros é o domínio do encontro.
 *
 * Os limiares e a escada de multiplicadores são do DMG, fora do SRD 5.1. Entram
 * aqui como TABELA DE NÚMEROS, pela decisão de 2026-07-02 (mecânica de jogo não
 * é protegível por copyright, só a expressão do texto). Os valores foram
 * conferidos contra as regras básicas públicas, não escritos de memória.
 */
import { MIN_LEVEL, MAX_LEVEL } from './party'

/** Índice = nível − 1. */
const TABLE = [
  { easy: 25, medium: 50, hard: 75, deadly: 100 },        //  1
  { easy: 50, medium: 100, hard: 150, deadly: 200 },      //  2
  { easy: 75, medium: 150, hard: 225, deadly: 400 },      //  3
  { easy: 125, medium: 250, hard: 375, deadly: 500 },     //  4
  { easy: 250, medium: 500, hard: 750, deadly: 1100 },    //  5
  { easy: 300, medium: 600, hard: 900, deadly: 1400 },    //  6
  { easy: 350, medium: 750, hard: 1100, deadly: 1700 },   //  7
  { easy: 450, medium: 900, hard: 1400, deadly: 2100 },   //  8
  { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },  //  9
  { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },  // 10
  { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },  // 11
  { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 }, // 12
  { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 }, // 13
  { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 }, // 14
  { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 }, // 15
  { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 }, // 16
  { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 }, // 17
  { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 }, // 18
  { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },// 19
  { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },// 20
]

export function thresholdsForLevel(level) {
  const n = Math.floor(Number(level))
  const clamped = Number.isFinite(n)
    ? Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, n))
    : MIN_LEVEL
  return TABLE[clamped - 1]
}

/**
 * Limiar da companhia = soma PERSONAGEM POR PERSONAGEM. Usar nível médio
 * achataria a diferença entre 1/1/5/5 e 3/3/3/3, que têm orçamentos distintos.
 */
export function partyThresholds(levels) {
  return (levels ?? []).reduce((acc, level) => {
    const t = thresholdsForLevel(level)
    return {
      easy: acc.easy + t.easy,
      medium: acc.medium + t.medium,
      hard: acc.hard + t.hard,
      deadly: acc.deadly + t.deadly,
    }
  }, { easy: 0, medium: 0, hard: 0, deadly: 0 })
}

/**
 * Sete posições: o ×0,5 existe porque companhia de 6+ DESCE um degrau, e um
 * monstro solitário contra seis personagens cai abaixo do ×1.
 */
export const MULTIPLIER_LADDER = [0.5, 1, 1.5, 2, 2.5, 3, 4]

/** Posição na escada antes do ajuste por tamanho de grupo. */
function ladderIndexFor(monsterCount) {
  if (monsterCount <= 1) return 1  // ×1
  if (monsterCount === 2) return 2 // ×1,5
  if (monsterCount <= 6) return 3  // ×2
  if (monsterCount <= 10) return 4 // ×2,5
  if (monsterCount <= 14) return 5 // ×3
  return 6                         // ×4
}

/**
 * Multiplicador de encontro. `partySize` 0 (companhia desconhecida) não aplica
 * ajuste nenhum — o bônus de "grupo pequeno" só faz sentido com gente na mesa.
 */
export function encounterMultiplier(monsterCount, partySize) {
  const count = Math.max(0, Math.floor(Number(monsterCount) || 0))
  if (count === 0) return 1
  const size = Math.max(0, Math.floor(Number(partySize) || 0))
  let i = ladderIndexFor(count)
  if (size > 0 && size < 3) i += 1
  else if (size >= 6) i -= 1
  return MULTIPLIER_LADDER[Math.min(MULTIPLIER_LADDER.length - 1, Math.max(0, i))]
}

export const BANDS = ['trivial', 'easy', 'medium', 'hard', 'deadly']

export function adjustedXp(monsterXpTotal, monsterCount, partySize) {
  const xp = Math.max(0, Math.floor(Number(monsterXpTotal) || 0))
  return Math.round(xp * encounterMultiplier(monsterCount, partySize))
}

/**
 * Faixa do encontro. A fronteira é sempre "igual entra na faixa de cima":
 * bater exatamente o limiar mortal é mortal, não difícil.
 * Companhia vazia devolve `null` — sem orçamento não existe faixa, e inventar
 * uma seria pior que admitir que não dá pra saber.
 */
export function difficultyBand(xp, thresholds) {
  if (!thresholds || thresholds.deadly <= 0) return null
  const n = Math.max(0, Math.floor(Number(xp) || 0))
  if (n >= thresholds.deadly) return 'deadly'
  if (n >= thresholds.hard) return 'hard'
  if (n >= thresholds.medium) return 'medium'
  if (n >= thresholds.easy) return 'easy'
  return 'trivial'
}

/** Tudo que a tela precisa, numa chamada só. */
export function summarizeEncounter({ monsterXpTotal = 0, monsterCount = 0, levels = [] } = {}) {
  const partySize = (levels ?? []).length
  const thresholds = partyThresholds(levels)
  const multiplier = encounterMultiplier(monsterCount, partySize)
  const adjusted = adjustedXp(monsterXpTotal, monsterCount, partySize)
  return {
    raw: Math.max(0, Math.floor(Number(monsterXpTotal) || 0)),
    adjusted,
    multiplier,
    partySize,
    thresholds,
    band: difficultyBand(adjusted, thresholds),
  }
}
