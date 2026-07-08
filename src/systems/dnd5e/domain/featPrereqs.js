/**
 * Pré-requisitos de talento por RAÇA (talentos raciais do Xanathar).
 * O match aceita tanto o índice da raça quanto o da sub-raça da ficha —
 * "elfo-negro-drow" é sub-raça de "elfo", mas conta como raça pro prereq.
 */
const RACE_LABEL = {
  anao: 'Anão', elfo: 'Elfo', halfling: 'Halfling', humano: 'Humano',
  draconato: 'Draconato', gnomo: 'Gnomo', 'meio-elfo': 'Meio-Elfo',
  'meio-orc': 'Meio-Orc', tiefling: 'Tiefling',
  'alto-elfo': 'Alto Elfo', 'elfo-da-floresta': 'Elfo da Floresta',
  'elfo-negro-drow': 'Drow',
}

/**
 * true se a ficha satisfaz um prereq `{ type: 'race', races: [...] }`.
 * Prereqs de outros tipos (ou ausentes) nunca bloqueiam AQUI — cada picker
 * continua tratando ability/spellcasting/proficiency do jeito que já trata.
 */
export function meetsRacePrereq(prereq, { race, subrace } = {}) {
  if (!prereq || prereq.type !== 'race') return true
  return (prereq.races ?? []).some(r => r === race || r === subrace)
}

/** Rótulo legível do prereq de raça: "Anão ou Halfling". */
export function formatRacePrereq(prereq) {
  return (prereq?.races ?? []).map(r => RACE_LABEL[r] ?? r).join(' ou ')
}
