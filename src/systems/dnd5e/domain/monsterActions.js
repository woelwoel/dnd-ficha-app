import { parseAndRoll } from '../../../hooks/useDiceRoller'

/**
 * Statblock do SRD → ações que o Mestre pode rolar com um clique.
 *
 * Puro e sem React: recebe o monstro cru e devolve descrições de rolagem. Quem
 * dispara é a UI, pelo mesmo `roll()` que a ficha do jogador usa.
 */

/**
 * Abreviações do SRD → as mesmas que o resto do app usa (PcTacticalCard, ficha).
 * Traduzido aqui, e não na UI, pra CD de monstro e salvaguarda de PJ aparecerem
 * com o mesmo rótulo lado a lado no painel.
 */
const ABILITY_PT = {
  STR: 'FOR', DEX: 'DES', CON: 'CON', INT: 'INT', WIS: 'SAB', CHA: 'CAR',
}

/** Ação sem ataque e sem CD não vira botão (Multiataque, auras, passivas). */
function kindOf(action) {
  if (action?.attack_bonus != null) return 'attack'
  if (action?.dc) return 'save'
  return null
}

/**
 * "metade no sucesso" é decidido por DOIS campos que discordam entre si: 31
 * ações trazem `success_type: 'half'`, mas 36 descrições dizem "half as much".
 * O Sopro de Fogo do dragão vermelho adulto está marcado como `'none'` num
 * efeito que o PHB define como metade.
 *
 * Basta um dos dois afirmar. Confiar só no campo estruturado faria o app
 * aplicar dano CHEIO em quem passou na salvaguarda — errar a favor do monstro,
 * em silêncio, na conta que o jogador não tem como conferir.
 */
function halfOnSave(action) {
  if (action?.dc?.success_type === 'half') return true
  const desc = String(action?.desc ?? '').toLowerCase()
  return desc.includes('half as much') || desc.includes('metade')
}

/**
 * Linhas de dano roláveis. Descarta as 16 entradas de escolha
 * (`{ choose, from }`, tipo "fogo ou gelo") e qualquer notação que o motor de
 * rolagem não saiba ler — botão que erra é pior que botão ausente, e a
 * descrição continua no statblock de qualquer jeito.
 */
function damageOf(action) {
  const linhas = []
  for (const d of action?.damage ?? []) {
    const notation = d?.damage_dice
    if (typeof notation !== 'string' || !notation) continue
    if (!parseAndRoll(notation)) continue
    linhas.push({ notation, type: d?.damage_type?.name ?? null })
  }
  return linhas
}

function build(action, source, seq) {
  const kind = kindOf(action)
  if (!kind) return null
  const bonus = action.attack_bonus
  return {
    id: `${source}-${seq}`,
    source,
    kind,
    name: action.name ?? 'Ação',
    desc: action.desc ?? '',
    attackBonus: kind === 'attack' ? bonus : null,
    attackNotation: kind === 'attack' ? `1d20${bonus >= 0 ? '+' : '-'}${Math.abs(bonus)}` : null,
    save: kind === 'save'
      ? {
        ability: ABILITY_PT[String(action.dc?.dc_type?.name ?? '').toUpperCase()]
          ?? action.dc?.dc_type?.name ?? '?',
        dc: action.dc?.dc_value ?? null,
        half: halfOnSave(action),
      }
      : null,
    damage: damageOf(action),
  }
}

/** @returns {Array} ações roláveis, ações primeiro e lendárias depois. */
export function monsterActions(monster) {
  const out = []
  const listas = [
    ['action', monster?.actions],
    ['legendary', monster?.legendary_actions],
  ]
  for (const [source, lista] of listas) {
    ;(lista ?? []).forEach((a, i) => {
      const built = build(a, source, i)
      if (built) out.push(built)
    })
  }
  return out
}
