/**
 * Mutagênicos da Ordem do Mutante (Caçador de Sangue, fonte `homebrew`).
 *
 * O caçador prepara elixires num descanso curto e os bebe com uma ação bônus.
 * Cada fórmula dá um benefício e um efeito colateral, e a intensidade escala
 * pelo **nível de mutação** = nível de caçador de sangue ÷ 4, arredondado
 * para cima.
 *
 * Puro (sem React). Quatro eixos são numéricos e entram nos derivados da
 * ficha — atributo, CA, deslocamento e iniciativa. Os demais (resistências,
 * vantagem/desvantagem em testes, visão no escuro, faixa de crítico,
 * regeneração e imunidades a condição) o motor não modela hoje e ficam como
 * texto no painel, declarados em `effect`/`sideEffect`.
 */

import { BLOOD_HUNTER, bloodHunterLevel, bloodHunterOrder } from './bloodHunter'

/** Ordem do Mutante e o id da escolha de fórmulas. */
export const MUTANT = 'mutante'
export const FORMULAS_CHOICE_ID = 'cacador_de_sangue_mutagen_formulas'

/**
 * As 15 fórmulas do PDF.
 *
 * `attr`, `ac`, `speed` e `initiative` são os eixos VIVOS; quando presentes,
 * o valor é uma função do nível de mutação (`ml`) e do nível de classe.
 * Fórmula sem esses campos é puramente textual — de propósito.
 */
export const MUTAGENS = {
  eter: {
    name: 'Éter',
    prereq: 11,
    effect: 'Você ganha deslocamento de voo de 6 metros.',
    sideEffect: 'Você tem desvantagem em todos os testes de Força e de Destreza.',
  },
  celeridade: {
    name: 'Celeridade',
    prereq: 3,
    effect: 'Sua Destreza e o teto dela aumentam pelo seu nível de mutação.',
    sideEffect: 'Sua Sabedoria diminui pelo seu nível de mutação.',
    attr: ml => ({ dex: ml, wis: -ml }),
  },
  familiarizado: {
    name: 'Familiarizado',
    prereq: 3,
    effect: 'Você tem vantagem em testes de Inteligência.',
    sideEffect: 'Você tem desvantagem em testes de Carisma.',
  },
  crueldade: {
    name: 'Crueldade',
    prereq: 11,
    effect: 'Você ganha uma ação bônus no seu turno, utilizável apenas para a ação de Ataque com armas.',
    sideEffect: 'Você tem desvantagem em testes de resistência.',
  },
  impermeavel: {
    name: 'Impermeável',
    prereq: 3,
    effect: 'Você ganha resistência a dano perfurante.',
    sideEffect: 'Você ganha vulnerabilidade a dano cortante.',
  },
  mobilidade: {
    name: 'Mobilidade',
    prereq: 3,
    effect: 'Você fica imune às condições agarrado e impedido. No 11º nível, também à condição paralisado.',
    sideEffect: 'Você recebe uma penalidade na iniciativa igual ao dobro do seu nível de mutação.',
    initiative: ml => -2 * ml,
  },
  'visao-noturna': {
    name: 'Visão Noturna',
    prereq: 3,
    effect: 'Você ganha visão no escuro até 18 metros. Se já tinha visão no escuro, o alcance aumenta em 18 metros.',
    sideEffect: 'Você ganha Sensibilidade à Luz Solar: desvantagem em jogadas de ataque e em testes de Sabedoria (Percepção) baseados em visão sob luz solar direta.',
  },
  potencia: {
    name: 'Potência',
    prereq: 3,
    effect: 'Sua Força e o teto dela aumentam pelo seu nível de mutação.',
    sideEffect: 'Sua Destreza diminui pelo seu nível de mutação.',
    attr: ml => ({ str: ml, dex: -ml }),
  },
  precisao: {
    name: 'Precisão',
    prereq: 11,
    effect: 'Seus ataques com arma causam crítico com 19 ou 20. A partir do 12º nível, com 18 a 20.',
    sideEffect: 'Toda cura que você recebe é reduzida à metade.',
  },
  rapidez: {
    name: 'Rapidez',
    prereq: 3,
    effect: 'Seu deslocamento aumenta em 4,5 metros. No 15º nível, em 6 metros.',
    sideEffect: 'Você tem desvantagem em testes de Destreza.',
    speed: (ml, nivel) => (nivel >= 15 ? 6 : 4.5),
  },
  reconstrucao: {
    name: 'Reconstrução',
    prereq: 7,
    effect: 'Enquanto consciente e em combate, você regenera pontos de vida iguais ao dobro do seu nível de mutação no início do seu turno, desde que esteja acima de 0.',
    sideEffect: 'Seu deslocamento diminui em 3 metros.',
    speed: () => -3,
  },
  sagacidade: {
    name: 'Sagacidade',
    prereq: 3,
    effect: 'Sua Sabedoria e o teto dela aumentam pelo seu nível de mutação.',
    sideEffect: 'Sua classe de armadura é reduzida pelo seu nível de mutação.',
    attr: ml => ({ wis: ml }),
    ac: ml => -ml,
  },
  protegido: {
    name: 'Protegido',
    prereq: 3,
    effect: 'Você ganha resistência a dano cortante.',
    sideEffect: 'Você ganha vulnerabilidade a dano de concussão.',
  },
  inquebravel: {
    name: 'Inquebrável',
    prereq: 3,
    effect: 'Você ganha resistência a dano de concussão.',
    sideEffect: 'Você ganha vulnerabilidade a dano perfurante.',
  },
  cautela: {
    name: 'Cautela',
    prereq: 3,
    effect: 'Você ganha um bônus na iniciativa igual ao dobro do seu nível de mutação.',
    sideEffect: 'Você tem desvantagem em testes de Sabedoria (Percepção).',
    initiative: ml => 2 * ml,
  },
}

/** Níveis em que uma fórmula é aprendida: 3 no 3º, +1 no 7º, 11º, 15º e 18º. */
const FORMULA_LEVELS = [7, 11, 15, 18]

/** Quantas fórmulas o personagem conhece no nível de classe dado. */
export function formulasKnownAt(level) {
  const lv = Number(level) || 0
  if (lv < 3) return 0
  return 3 + FORMULA_LEVELS.filter(n => lv >= n).length
}

/** É da Ordem do Mutante e já tem a Ordem? */
function isMutant(character) {
  return bloodHunterLevel(character) >= 3 && bloodHunterOrder(character) === MUTANT
}

/** Nível de mutação = nível de caçador de sangue ÷ 4, arredondado para cima. */
export function mutationLevel(character) {
  if (!isMutant(character)) return 0
  return Math.ceil(bloodHunterLevel(character) / 4)
}

/** Escolha gravada: aceita string única, "a,b" (ficha) e array (wizard). */
function pickedValues(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string' && raw.length) return raw.split(',').filter(Boolean)
  return []
}

/** Fórmulas que o personagem aprendeu, na ordem do catálogo, sem repetidos. */
export function knownFormulas(character) {
  const chosen = character?.info?.chosenFeatures ?? character?.chosenFeatures ?? {}
  const picked = new Set(pickedValues(chosen[FORMULAS_CHOICE_ID]))
  return Object.keys(MUTAGENS).filter(k => picked.has(k))
}

/** Fórmulas oferecidas: as que o nível de classe já permite aprender. */
export function availableFormulas(character) {
  const nivel = bloodHunterLevel(character)
  return Object.entries(MUTAGENS)
    .filter(([, m]) => nivel >= m.prereq)
    .map(([key, m]) => ({ key, ...m }))
}

/**
 * Mutagênicos em efeito agora. Descarta chave desconhecida e fórmula cujo
 * pré-requisito de nível o personagem ainda não alcançou — ficha antiga com
 * dado inconsistente não deve conceder benefício indevido.
 */
export function activeMutagens(character) {
  if (!isMutant(character)) return []
  const nivel = bloodHunterLevel(character)
  return (character?.combat?.mutagens ?? [])
    .filter(k => MUTAGENS[k] && nivel >= MUTAGENS[k].prereq)
    .map(k => ({ key: k, ...MUTAGENS[k] }))
}

/** Soma os deltas de um eixo numérico entre os mutagênicos ativos. */
function somaEixo(character, campo) {
  const ml = mutationLevel(character)
  const nivel = bloodHunterLevel(character)
  return activeMutagens(character)
    .filter(m => typeof m[campo] === 'function')
    .reduce((total, m) => total + m[campo](ml, nivel), 0)
}

/**
 * Deltas de atributo dos mutagênicos ativos, por chave (`str`, `dex`, …).
 * Devolve só os atributos tocados — ausência significa "sem alteração".
 */
export function mutagenAttrDeltas(character) {
  const ml = mutationLevel(character)
  const out = {}
  for (const m of activeMutagens(character)) {
    if (typeof m.attr !== 'function') continue
    for (const [chave, delta] of Object.entries(m.attr(ml))) {
      out[chave] = (out[chave] ?? 0) + delta
    }
  }
  return out
}

/** Delta de CA (Sagacidade reduz pelo nível de mutação). */
export function mutagenAcDelta(character) {
  return somaEixo(character, 'ac')
}

/** Delta de deslocamento em METROS (Rapidez soma, Reconstrução tira). */
export function mutagenSpeedDelta(character) {
  return somaEixo(character, 'speed')
}

/** Delta de iniciativa (Cautela soma, Mobilidade tira). */
export function mutagenInitiativeDelta(character) {
  return somaEixo(character, 'initiative')
}

export { BLOOD_HUNTER }
