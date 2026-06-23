// Ordem visual recomendada. Conceito (nome) vem PRIMEIRO em Fundamentos
// pra dar engajamento emocional cedo — jogador novo quer nomear o
// personagem antes de mexer em raça/classe (decisão de UX da audit).
// `icon` é renderizado pelo BlockCard. `hint` aparece quando o bloco está vazio
// e não bloqueado — substitui o "preencher..." genérico.
// `group` agrupa blocos em capítulos exibidos na tela do wizard.
// Atributos vem ANTES de Classe: o aumento de atributo (ASI) ao subir de nível
// é distribuído no bloco Classe, e alocar isso sem saber os atributos base é
// cego. Por isso Atributos sobe pra Fundamentos, logo após Raça (de quem
// depende pelo bônus racial) e antes de Classe.
export const BLOCKS = [
  { id: 'concept',    group: 'fundamentos', label: 'Conceito',    icon: '✎', hint: 'dar nome e cara'   },
  { id: 'race',       group: 'fundamentos', label: 'Raça',        icon: '❦', hint: 'escolher linhagem' },
  { id: 'attributes', group: 'fundamentos', label: 'Atributos',   icon: '⚖', hint: 'distribuir valores'},
  { id: 'class',      group: 'fundamentos', label: 'Classe',      icon: '⚔', hint: 'escolher vocação'  },
  { id: 'background', group: 'fundamentos', label: 'Antecedente', icon: '☰', hint: 'definir história'  },
  { id: 'skills',     group: 'construcao',  label: 'Perícias',    icon: '✦', hint: 'escolher talentos' },
  { id: 'spells',     group: 'construcao',  label: 'Magias',      icon: '✷', hint: 'preparar feitiços' },
  { id: 'review',     group: 'acabamento',  label: 'Revisão',     icon: '✧', hint: 'conferir tudo'     },
]

// Capítulos exibidos no grid do wizard. Ordem importa.
export const GROUPS = [
  {
    id: 'fundamentos',
    title: 'Fundamentos',
    subtitle: 'Quem é seu herói',
    roman: 'I',
  },
  {
    id: 'construcao',
    title: 'Construção',
    subtitle: 'Como ele se sai em jogo',
    roman: 'II',
  },
  {
    id: 'acabamento',
    title: 'Acabamento',
    subtitle: 'Revisão final',
    roman: 'III',
  },
]
