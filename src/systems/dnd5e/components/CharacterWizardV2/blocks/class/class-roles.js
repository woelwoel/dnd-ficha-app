// Papéis de foco de classe: cor (pílula) e definição de novato.
// Só existem 8 famílias de cor seguras no tema (index.css remapeia Tailwind);
// INVOCAÇÃO compartilha o verde com CURA de propósito. FURTIVIDADE usa cinza/ink.
const ROLE_STYLES = {
  'DANO CORPO A CORPO': 'border-red-700 bg-red-50 text-red-700',
  'DANO À DISTÂNCIA':   'border-orange-700 bg-orange-50 text-orange-700',
  'DANO MÁGICO':        'border-purple-700 bg-purple-50 text-purple-700',
  'CURA':               'border-green-700 bg-green-50 text-green-700',
  'SUPORTE':            'border-blue-700 bg-blue-50 text-blue-700',
  'TANQUE':             'border-sky-700 bg-sky-50 text-sky-700',
  'CONTROLE':           'border-amber-700 bg-amber-50 text-amber-700',
  'UTILIDADE':          'border-yellow-700 bg-yellow-50 text-yellow-700',
  'FURTIVIDADE':        'border-ink-300 bg-parchment-100 text-ink-500',
  'INVOCAÇÃO':          'border-green-700 bg-green-50 text-green-700',
}

const FALLBACK_STYLE = 'border-parchment-600 bg-parchment-100 text-ink-500'

export const ROLE_DEFINITIONS = {
  'DANO CORPO A CORPO': 'Fica na linha de frente e causa dano de perto (espadas, machados, punhos).',
  'DANO À DISTÂNCIA':   'Causa dano de longe, com arcos, bestas ou armas de arremesso.',
  'DANO MÁGICO':        'Causa dano com magias — fogo, raios, energia arcana.',
  'CURA':               'Restaura pontos de vida e mantém o grupo de pé.',
  'SUPORTE':            'Fortalece aliados e atrapalha inimigos com bênçãos, buffs e ajuda.',
  'TANQUE':             'Aguenta muito dano e protege os aliados segurando os inimigos.',
  'CONTROLE':           'Domina o campo — prende, atordoa ou reposiciona vários inimigos de uma vez.',
  'UTILIDADE':          'Resolve problemas fora do combate: exploração, social, truques variados.',
  'FURTIVIDADE':        'Age nas sombras — esgueira-se, desarma armadilhas, ataca pelas costas.',
  'INVOCAÇÃO':          'Conjura criaturas, espíritos ou constructos que lutam ao seu lado.',
}

export const ROLE_ORDER = Object.keys(ROLE_DEFINITIONS)

export function roleStyle(role) {
  return ROLE_STYLES[role] ?? FALLBACK_STYLE
}
