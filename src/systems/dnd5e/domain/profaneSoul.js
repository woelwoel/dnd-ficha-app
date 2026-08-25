/**
 * Ordem da Alma Profana (Caçador de Sangue, fonte `homebrew`).
 *
 * A única Ordem que conjura. Usa **Magia de Pacto** no estilo do Bruxo — todos
 * os espaços do mesmo nível, recuperados em descanso curto ou longo — mas com
 * **tabela própria** (A Alma Profana), que NÃO é a do Bruxo: no 20º nível são
 * 3 espaços de 4º, contra 4 de 5º do Bruxo.
 *
 * O atributo de conjuração é **Sabedoria**, não Carisma. É o mesmo atributo
 * das maldições de sangue, o que mantém a classe com um atributo mental só.
 *
 * Puro (sem React).
 */

import { bloodHunterLevel, bloodHunterOrder } from './bloodHunter'

export const PROFANE_SOUL = 'alma-profana'
export const PATRON_CHOICE_ID = 'cacador_de_sangue_patron'

/**
 * Os seis patronos oferecidos pelo PDF de 2016. Cada um reforça o Ritual
 * Vermelho (Foco Ritual, 3º) e concede uma magia rara no 7º e outra no 15º.
 */
export const PATRONS = {
  arquifada: {
    name: 'O Arquifada',
    riteFocus: 'Se você causar dano de ritual a uma criatura, ela perde qualquer bônus de meia cobertura ou de três quartos, e também invisibilidade, até o início do seu próximo turno.',
    arcana7: 'Nublar',
    arcana15: 'Lentidão',
  },
  corruptor: {
    name: 'O Corruptor',
    riteFocus: 'Ao usar o Ritual das Chamas, se você rolar 1 no dado de dano do ritual, pode rolar de novo. Só uma nova rolagem por ataque.',
    arcana7: 'Raio Ardente',
    arcana15: 'Bola de Fogo',
  },
  'grande-antigo': {
    name: 'O Grande Antigo',
    riteFocus: 'Sempre que você acertar um golpe crítico, a criatura deve passar num teste de resistência de Sabedoria contra a CD das suas magias ou fica amedrontada até o fim do seu próximo turno.',
    arcana7: 'Detectar Pensamentos',
    arcana15: 'Velocidade',
  },
  imortal: {
    name: 'O Imortal',
    riteFocus: 'Sempre que você reduzir uma criatura hostil a 0 pontos de vida com um ataque com arma, você recupera pontos de vida iguais ao dado do Ritual Vermelho.',
    arcana7: 'Cegueira/Surdez',
    arcana15: 'Rogar Maldição',
  },
  celestial: {
    name: 'O Celestial',
    riteFocus: 'Você pode gastar um uso de Sangue Maldito como ação bônus para curar uma criatura a até 18 metros, que recupera pontos de vida iguais ao seu dado de Ritual Vermelho rolado duas vezes + seu modificador de Sabedoria (mínimo de 1).',
    arcana7: 'Restauração Menor',
    arcana15: 'Reviver',
  },
  hexblade: {
    name: 'O Hexblade',
    riteFocus: 'Sempre que você atingir uma criatura com uma maldição de sangue, seu próximo ataque contra ela tem margem de crítico de 19 a 20.',
    arcana7: 'Marca da Punição',
    arcana15: 'Piscar',
  },
}

/**
 * Tabela A Alma Profana, indexada pelo nível de caçador de sangue (3 a 20).
 * `[truques, magiasConhecidas, espaços, nívelDoEspaço]`
 */
const TABLE = {
  3:  [2, 2, 1, 1],
  4:  [2, 2, 1, 1],
  5:  [2, 3, 2, 1],
  6:  [2, 3, 2, 1],
  7:  [2, 4, 2, 2],
  8:  [2, 4, 2, 2],
  9:  [2, 5, 2, 2],
  10: [3, 5, 2, 2],
  11: [3, 6, 2, 3],
  12: [3, 6, 2, 3],
  13: [3, 7, 2, 3],
  14: [3, 7, 3, 3],
  15: [3, 8, 3, 3],
  16: [3, 8, 3, 3],
  17: [3, 9, 3, 4],
  18: [3, 9, 3, 4],
  19: [3, 10, 3, 4],
  20: [3, 11, 3, 4],
}

/** Linha da tabela para o personagem, ou null se não conjura. */
function row(character) {
  if (bloodHunterOrder(character) !== PROFANE_SOUL) return null
  const nivel = Math.min(20, bloodHunterLevel(character))
  return TABLE[nivel] ?? null
}

/** Patrono escolhido, ou null. */
export function profaneSoulPatron(character) {
  if (bloodHunterOrder(character) !== PROFANE_SOUL) return null
  const chosen = character?.info?.chosenFeatures ?? character?.chosenFeatures ?? {}
  return chosen[PATRON_CHOICE_ID] ?? null
}

/** Espaços de pacto `{ qty, slotLevel }`, ou null. */
export function profaneSoulPactSlots(character) {
  const r = row(character)
  return r ? { qty: r[2], slotLevel: r[3] } : null
}

/** Truques de bruxo conhecidos. */
export function profaneSoulCantrips(character) {
  return row(character)?.[0] ?? 0
}

/** Magias de bruxo conhecidas, de 1º nível ou superior. */
export function profaneSoulSpellsKnown(character) {
  return row(character)?.[1] ?? 0
}

/** Modificador de atributo (PHB p.13). */
function modOf(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2)
}

/** Bônus de proficiência pelo nível TOTAL de personagem (PHB p.15). */
function proficiencyBonus(character) {
  const base = Number(character?.info?.level) || 0
  const extra = (character?.info?.multiclasses ?? [])
    .reduce((sum, mc) => sum + (Number(mc?.level) || 0), 0)
  return Math.floor((Math.max(1, base + extra) - 1) / 4) + 2
}

/** CD das magias = 8 + proficiência + modificador de Sabedoria. */
export function profaneSoulSaveDC(character) {
  if (!row(character)) return null
  return 8 + proficiencyBonus(character) + modOf(character?.attributes?.wis)
}

/** Ataque de magia = proficiência + modificador de Sabedoria. */
export function profaneSoulAttackBonus(character) {
  if (!row(character)) return null
  return proficiencyBonus(character) + modOf(character?.attributes?.wis)
}
