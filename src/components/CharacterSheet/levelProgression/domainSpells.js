// src/components/CharacterSheet/levelProgression/domainSpells.js
// DEPRECATED — shim de retrocompatibilidade pros testes existentes.
// Toda a lógica vive agora em `src/domain/subclassSpells.js`, que cobre
// cleric/paladin/druid/warlock de forma uniforme.
import {
  enrichWithSubclassSpells,
  mapSrdSpellToCharacter as _mapSrdSpellToCharacter,
} from '../../../systems/dnd5e/domain/subclassSpells'

/** @deprecated Use enrichWithSubclassSpells. */
export function enrichWithClericDomainSpells(args) {
  return enrichWithSubclassSpells(args)
}

/** @deprecated Use mapSrdSpellToCharacter de subclassSpells. */
export const mapSrdSpellToCharacter = _mapSrdSpellToCharacter
