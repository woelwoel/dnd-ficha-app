/**
 * Condições D&D 5e (PHB p.290–296) + Exaustão (p.291).
 *
 * Fonte única de verdade — consumida por SheetCombatBar, ConditionsTracker,
 * tooltips, etc. Cada entrada traz `rule` em texto curto compatível com
 * tooltip de UI (1-3 linhas).
 */
export const CONDITIONS = [
  {
    id: 'blinded',
    label: 'Cego',
    icon: '👁️‍🗨️',
    rule: 'Falha em testes que dependem da visão. Ataques contra você têm vantagem; seus ataques têm desvantagem. (PHB p.290)',
  },
  {
    id: 'charmed',
    label: 'Enfeitiçado',
    icon: '💜',
    rule: 'Não pode atacar quem o enfeitiçou nem mirar nele com habilidades danosas. O encantador tem vantagem em testes sociais com você. (PHB p.290)',
  },
  {
    id: 'deafened',
    label: 'Surdo',
    icon: '🔇',
    rule: 'Falha em testes que dependem da audição. (PHB p.290)',
  },
  {
    id: 'frightened',
    label: 'Amedrontado',
    icon: '😱',
    rule: 'Desvantagem em testes e ataques enquanto a fonte do medo estiver à vista. Não pode se aproximar voluntariamente. (PHB p.290)',
  },
  {
    id: 'grappled',
    label: 'Agarrado',
    icon: '🤜',
    rule: 'Velocidade = 0; bônus de velocidade não se aplicam. Termina se o agarrador for incapacitado ou empurrado pra fora do alcance. (PHB p.290)',
  },
  {
    id: 'incapacitated',
    label: 'Incapacitado',
    icon: '💢',
    rule: 'Não pode tomar ações nem reações. (PHB p.290)',
  },
  {
    id: 'invisible',
    label: 'Invisível',
    icon: '👻',
    rule: 'Não pode ser visto sem magia ou sentido especial. Ataques contra você têm desvantagem; seus ataques têm vantagem. (PHB p.291)',
  },
  {
    id: 'paralyzed',
    label: 'Paralisado',
    icon: '⚡',
    rule: 'Incapacitado, não fala. Falha automática em salvas de FOR e DES. Ataques contra você têm vantagem; acertos a até 1,5 m são críticos. (PHB p.291)',
  },
  {
    id: 'petrified',
    label: 'Petrificado',
    icon: '🪨',
    rule: 'Transformado em pedra. Incapacitado, falha em salvas de FOR/DES, resistência a todo dano, imune a veneno e doença. (PHB p.291)',
  },
  {
    id: 'poisoned',
    label: 'Envenenado',
    icon: '🟢',
    rule: 'Desvantagem em ataques e testes de habilidade. (PHB p.292)',
  },
  {
    id: 'prone',
    label: 'Prostrado',
    icon: '⬇️',
    rule: 'Move-se só rastejando (gasta dobro de movimento pra levantar). Desvantagem em ataques. Ataques contra você têm vantagem a 1,5 m, desvantagem à distância. (PHB p.292)',
  },
  {
    id: 'restrained',
    label: 'Imobilizado',
    icon: '🔗',
    rule: 'Velocidade = 0. Ataques contra você têm vantagem; seus ataques e salvas de DES têm desvantagem. (PHB p.292)',
  },
  {
    id: 'stunned',
    label: 'Atordoado',
    icon: '💫',
    rule: 'Incapacitado, não se move, fala balbuciante. Falha em salvas de FOR/DES; ataques contra você têm vantagem. (PHB p.292)',
  },
  {
    id: 'unconscious',
    label: 'Inconsciente',
    icon: '💤',
    rule: 'Incapacitado, cai prostrado, larga o que segura. Falha em salvas de FOR/DES; ataques contra você têm vantagem; acertos a 1,5 m são críticos. (PHB p.292)',
  },
]

/** Lookup por id — útil pra chips a partir do array `combat.conditions`. */
export const CONDITIONS_BY_ID = Object.fromEntries(CONDITIONS.map(c => [c.id, c]))

/** Descrições de exaustão por nível (PHB p.291). */
export const EXHAUSTION_EFFECTS = [
  'Sem efeito',
  'Desvantagem em testes de habilidade',
  'Velocidade reduzida à metade',
  'Desv. em ataques e testes de resistência',
  'Máximo de PV reduzido à metade',
  'Velocidade reduzida a 0',
  'Morte',
]
