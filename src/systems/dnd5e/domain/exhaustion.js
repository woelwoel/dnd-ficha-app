/**
 * Exaustão nos dois rulesets.
 *
 *   2014 (PHB p.291)      — tabela de 6 degraus: desvantagens que entram em
 *                           níveis diferentes, deslocamento pela metade e
 *                           depois zero, PV máximo pela metade.
 *   2024 (LdJ 2024 p.368) — acumulativa e uniforme: todo teste de d20 perde
 *                           2 × nível, deslocamento perde 1,5 m × nível.
 *                           Sem desvantagem, sem multiplicador, sem PV.
 *
 * Nos dois, nível 6 mata.
 *
 * `exhaustionEffects` devolve um SHAPE UNIFICADO: os dois ramos preenchem o
 * objeto inteiro, e o que não se aplica sai em valor neutro (false / 1 / 0).
 * Assim o consumidor aplica tudo sem nunca perguntar o ruleset — se cada tela
 * ramificasse por conta própria, o dispatch se espalharia pela UI toda.
 */
import { byRuleset, is2024 } from './ruleset'

export const MAX_EXHAUSTION = 6

function levelOf(character) {
  const raw = Number(character?.combat?.exhaustion) || 0
  return Math.max(0, Math.min(MAX_EXHAUSTION, Math.floor(raw)))
}

const NEUTRO = Object.freeze({
  abilityCheckDisadvantage: false,
  attackDisadvantage: false,
  saveDisadvantage: false,
  speedMultiplier: 1,
  maxHpMultiplier: 1,
  d20Penalty: 0,
  speedPenaltyMeters: 0,
})

function effects2014(lvl) {
  return {
    ...NEUTRO,
    abilityCheckDisadvantage: lvl >= 1,
    attackDisadvantage: lvl >= 3,
    saveDisadvantage: lvl >= 3,
    speedMultiplier: lvl >= 5 ? 0 : (lvl >= 2 ? 0.5 : 1),
    maxHpMultiplier: lvl >= 4 ? 0.5 : 1,
  }
}

function effects2024(lvl) {
  return {
    ...NEUTRO,
    // `-2 * 0` é -0 em JavaScript, e -0 reprova num toEqual contra 0. O
    // `speedPenaltyMeters` abaixo não precisa do mesmo cuidado: o sinal vem
    // do coeficiente -2, então `1.5 * 0` é +0.
    d20Penalty: lvl === 0 ? 0 : -2 * lvl,
    speedPenaltyMeters: 1.5 * lvl,
  }
}

/** Efeitos da exaustão da ficha, no shape unificado. */
export function exhaustionEffects(character) {
  const level = levelOf(character)
  const branch = byRuleset(character, { '2014': effects2014, '2024': effects2024 })
  return { level, dead: level >= MAX_EXHAUSTION, ...branch(level) }
}

const TEXTO_2014 = [
  'Sem efeito',
  'Desvantagem em testes de habilidade',
  'Deslocamento reduzido à metade',
  'Desvantagem em ataques e salvaguardas',
  'PV máximo reduzido à metade',
  'Deslocamento reduzido a 0',
  'Morte',
]

const TEXTO_2024 = [
  'Sem efeito',
  '−2 em testes de d20 · −1,5 m de deslocamento',
  '−4 em testes de d20 · −3 m de deslocamento',
  '−6 em testes de d20 · −4,5 m de deslocamento',
  '−8 em testes de d20 · −6 m de deslocamento',
  '−10 em testes de d20 · −7,5 m de deslocamento',
  'Morte',
]

/** Descrição por nível (índices 0 a 6) do ruleset da ficha. */
export function exhaustionLevelsText(character) {
  return is2024(character) ? TEXTO_2024 : TEXTO_2014
}
