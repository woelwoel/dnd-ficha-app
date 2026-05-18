// Ordem visual recomendada (Raça primeiro, Revisão último).
// `icon` é renderizado pelo BlockCard. `hint` aparece quando o bloco está vazio
// e não bloqueado — substitui o "preencher..." genérico.
export const BLOCKS = [
  { id: 'race',       label: 'Raça',        icon: '❦', hint: 'escolher linhagem' },
  { id: 'class',      label: 'Classe',      icon: '⚔', hint: 'escolher vocação'  },
  { id: 'background', label: 'Antecedente', icon: '📜', hint: 'definir história'  },
  { id: 'attributes', label: 'Atributos',   icon: '⚖', hint: 'distribuir valores'},
  { id: 'skills',     label: 'Perícias',    icon: '✦', hint: 'escolher talentos' },
  { id: 'spells',     label: 'Magias',      icon: '✷', hint: 'preparar feitiços' },
  { id: 'concept',    label: 'Conceito',    icon: '✎', hint: 'dar nome e cara'   },
  { id: 'review',     label: 'Revisão',     icon: '✧', hint: 'conferir tudo'     },
]
