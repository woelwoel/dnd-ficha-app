// @ts-check
import { mapSrdSpellToCharacter } from './subclassSpells'

/**
 * Magias concedidas por TRAÇO RACIAL (DADOS, não regra).
 *
 * CUIDADO com ciclo de import: este módulo puxa `subclassSpells`, que puxa
 * `rules.js`. Ou seja, `rules.js` NÃO pode importar daqui — é por isso que os
 * trackers de conjuração especial moram em `castPolicy.js` e são compostos na
 * `CharacterSheet`, e não dentro de `defaultClassFeatureUses`.
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

/**
 * Injeta as magias do traço racial em `spellcasting.spells`.
 *
 * MERGE idempotente por `index`, espelhando `injectFeatSpells`:
 *  - `ability` e `raceCreated` só vão na magia que a RAÇA CRIA. Se o Bruxo
 *    drow já conhecia Escuridão pela classe, o atributo dele continua sendo o
 *    da classe e os espaços continuam valendo (ver `castPolicy`);
 *  - `raceGrants` ACUMULA a referência, nunca sobrescreve;
 *  - nada muda → devolve o MESMO objeto `character`. A ficha abre sem se
 *    marcar como alterada (senão o autosave dispararia a cada abertura).
 */
export function injectRacialSpells(character, srdSpells) {
  if (!character || !srdSpells?.length) return character
  const info = getRacialGrants(character)
  if (!info || info.grants.length === 0) return character

  const spells = character.spellcasting?.spells ?? []
  const order = [...new Set(spells.map(s => s.index))]
  const working = new Map(spells.map(s => [s.index, s]))
  let changed = false

  for (const g of info.grants) {
    const cur = working.get(g.spell)

    if (cur) {
      const refs = cur.raceGrants ?? []
      if (refs.some(r => r.raceKey === info.raceKey && r.grantIdx === g.grantIdx)) continue
      working.set(g.spell, {
        ...cur,
        raceGrants: [...refs, { raceKey: info.raceKey, grantIdx: g.grantIdx }],
      })
      changed = true
      continue
    }

    const srd = srdSpells.find(s => s.index === g.spell)
    if (!srd) continue
    working.set(g.spell, {
      ...mapSrdSpellToCharacter(srd, { source: 'race', alwaysPrepared: true, label: info.label }),
      raceGrants: [{ raceKey: info.raceKey, grantIdx: g.grantIdx }],
      raceCreated: true,
      ability: info.ability,
    })
    order.push(g.spell)
    changed = true
  }

  if (!changed) return character
  return {
    ...character,
    spellcasting: { ...character.spellcasting, spells: order.map(idx => working.get(idx)) },
  }
}
