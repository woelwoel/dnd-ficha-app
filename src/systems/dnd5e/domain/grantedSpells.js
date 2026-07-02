// @ts-check
/**
 * Magias concedidas por features (DADOS, não regra). O motor (rules.js)
 * consome estes objetos via syncGrantedSpells. Adicionar uma feature nova
 * que concede magias = adicionar dado aqui (ou em JSON futuro), sem tocar
 * no motor.
 */

export const PACT_FAMILIAR_SPELL = Object.freeze({
  index: 'find-familiar',
  name: 'Achar Familiar',
  level: 1,
  school: 'Conjuração',
  ritual: true,
  concentration: false,
  desc: 'Você evoca um espírito familiar que assume a forma de um animal.',
})

/* ── Consciência Primordial (Patrulheiro, Tasha) — magias concedidas ──
 * Feature opcional que SUBSTITUI Consciência Primeva e concede magias em
 * 3/5/9/13/17, cada uma conjurável 1×/descanso longo sem gastar espaço
 * (a regra do "1× grátis" fica na desc do card; aqui elas entram como
 * sempre-preparadas, espelhando o padrão das magias de arquétipo).
 * Objetos mínimos como PACT_FAMILIAR_SPELL; tag sourceLabel permite
 * adicionar/remover ao ligar/desligar o toggle. */
export const PRIMAL_AWARENESS_LABEL = 'Consciência Primordial'
export const PRIMAL_AWARENESS_GRANTS = [
  { level: 3,  spell: { index: 'falar-com-animais',      name: 'Falar com Animais',       level: 1, school: 'Adivinhação', ritual: true,  concentration: false, desc: 'Você compreende e se comunica verbalmente com bestas pela duração.' } },
  { level: 5,  spell: { index: 'sentido-bestial',        name: 'Sentido Bestial',         level: 2, school: 'Adivinhação', ritual: true,  concentration: true,  desc: 'Por meio de uma besta tocada, você percebe o que ela percebe enquanto durar.' } },
  { level: 9,  spell: { index: 'falar-com-plantas',      name: 'Falar com Plantas',       level: 3, school: 'Transmutação', ritual: false, concentration: false, desc: 'Você imbui plantas a até 9m com percepção e capacidade de conversar com você.' } },
  { level: 13, spell: { index: 'localizar-criatura',     name: 'Localizar Criatura',      level: 4, school: 'Adivinhação', ritual: false, concentration: true,  desc: 'Você sente a direção de uma criatura conhecida, se estiver a até 300m.' } },
  { level: 17, spell: { index: 'comunhao-com-a-natureza', name: 'Comunhão com a Natureza', level: 5, school: 'Adivinhação', ritual: true,  concentration: false, desc: 'Você se sintoniza à natureza e ganha conhecimento do território ao redor.' } },
].map(g => ({ ...g, spell: { ...g.spell, alwaysPrepared: true, prepared: true, source: 'optional-feature', sourceLabel: PRIMAL_AWARENESS_LABEL } }))
