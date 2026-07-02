/**
 * Typedefs centrais do domínio D&D 5e (JSDoc). A fonte da verdade continua
 * sendo characterSchema.js (Zod) — isto dá checagem de editor/CI (@ts-check)
 * nos módulos puros sem migrar o projeto pra TypeScript. Manter em sincronia
 * com o schema é responsabilidade de quem mudar o schema.
 *
 * @typedef {'str'|'dex'|'con'|'int'|'wis'|'cha'} AbilityKey
 *
 * @typedef {Object} Combat
 * @property {number} [maxHp]
 * @property {number} [currentHp]
 * @property {number} [tempHp]
 * @property {number} [armorClass]
 * @property {number} [speed]        Deslocamento em METROS.
 * @property {string[]} [conditions] IDs de domain/conditions.js.
 * @property {number} [exhaustion]   Nível de exaustão 0-6.
 *
 * @typedef {Object} CharacterInfo
 * @property {string} [class]
 * @property {number} [level]
 * @property {Object.<string, *>} [chosenFeatures]
 *
 * @typedef {Object} Character
 * @property {Partial<Record<AbilityKey, number>>} [attributes]
 * @property {Combat} [combat]
 * @property {CharacterInfo} [info]
 * @property {Object} [spellcasting]
 * @property {Object} [inventory]
 */

export {}
