// @ts-check
/**
 * Magias concedidas por TRAÇO RACIAL (DADOS, não regra).
 *
 * Módulo FOLHA de propósito: não importa nada do domínio, então `rules.js` e
 * qualquer outro consumidor podem lê-lo sem risco de ciclo de import.
 *
 * `grantIdx` (posição ABSOLUTA em `grants`) é persistido na proveniência da
 * magia — REORDENAR `grants` orfana ficha salva. Acrescente no fim.
 *
 * `name` duplica o nome do catálogo de propósito: o tracker precisa de rótulo
 * legível sem ter o catálogo em mão. Um teste guarda a divergência.
 */

export const RACIAL_SPELL_DEFS = Object.freeze({
  'elfo-negro-drow': {
    label: 'Magia Drow',
    ability: 'cha',
    grants: [
      { spell: 'globos-de-luz',  name: 'Globos De Luz',  minLevel: 1, atWill: true },
      { spell: 'fogo-das-fadas', name: 'Fogo Das Fadas', minLevel: 3, freeCast: 'long', castAtLevel: 1 },
      { spell: 'escuridao',      name: 'Escuridão',      minLevel: 5, freeCast: 'long', castAtLevel: 2 },
    ],
  },
  tiefling: {
    label: 'Legado Infernal',
    ability: 'cha',
    grants: [
      { spell: 'taumaturgia',         name: 'Taumaturgia',         minLevel: 1, atWill: true },
      // PHB: "poderá conjurar repreensão infernal COMO UMA MAGIA DE 2° NÍVEL".
      { spell: 'repreensao-infernal', name: 'Repreensão Infernal', minLevel: 3, freeCast: 'long', castAtLevel: 2 },
      { spell: 'escuridao',           name: 'Escuridão',           minLevel: 5, freeCast: 'long', castAtLevel: 2 },
    ],
  },
  duergar: {
    label: 'Magia Duergar',
    ability: 'int', // é o que o texto da raça no app diz
    grants: [
      { spell: 'aumentarreduzir', name: 'Aumentar/Reduzir', minLevel: 3, freeCast: 'long', castAtLevel: 2, note: 'somente a versão Ampliar' },
      { spell: 'invisibilidade',  name: 'Invisibilidade',   minLevel: 5, freeCast: 'long', castAtLevel: 2, note: 'somente sobre si mesmo' },
    ],
  },
  'gnomo-da-floresta': {
    label: 'Ilusionista Nato',
    ability: 'int',
    grants: [
      { spell: 'ilusao-menor', name: 'Ilusão Menor', minLevel: 1, atWill: true },
    ],
  },
})

/** Nível TOTAL — traço racial não é de classe, multiclasse soma. */
export function characterTotalLevel(character) {
  const base = character?.info?.level ?? 0
  return base + (character?.info?.multiclasses ?? []).reduce((s, m) => s + (m.level ?? 0), 0)
}

/** Chave da declaração: sub-raça vence a raça (anão comum ≠ duergar). */
function resolveRaceKey(character) {
  const { race, subrace } = character?.info ?? {}
  if (subrace && RACIAL_SPELL_DEFS[subrace]) return subrace
  if (race && RACIAL_SPELL_DEFS[race]) return race
  return null
}

/**
 * Concessões JÁ LIBERADAS pelo nível, com `grantIdx` absoluto.
 * `null` quando a raça não concede magia nenhuma.
 */
export function getRacialGrants(character) {
  const raceKey = resolveRaceKey(character)
  if (!raceKey) return null
  const def = RACIAL_SPELL_DEFS[raceKey]
  const level = characterTotalLevel(character)
  return {
    raceKey,
    label: def.label,
    ability: def.ability,
    grants: def.grants
      .map((g, grantIdx) => ({ ...g, grantIdx }))
      .filter(g => level >= g.minLevel),
  }
}

export function racialTrackerId(raceKey, spellIndex) {
  return `raca-${raceKey}-${spellIndex}`
}
