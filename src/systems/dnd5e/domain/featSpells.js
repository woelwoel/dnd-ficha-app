/**
 * Motor de magias concedidas por TALENTO (spec 2026-07-15).
 *
 * Espelha o subclassSpells.js: declaração no domínio + injeção na criação
 * (build) e no level-up (bonusSpells). Diferenças importantes:
 *  - MERGE, nunca skip: magia já presente ganha proveniência do talento
 *    (featIndex/featGrant e ability se ausente) em vez de ser descartada;
 *  - roda TAMBÉM em level-up de multiclasse (ASI de MC pode virar talento);
 *  - regras de conjuração (freeCast/atWill/ritualOnly/slots) derivam AO VIVO
 *    das declarações via getCastPolicy — nunca são persistidas na magia.
 *
 * `picks[i]` do spellChoices alinha com o i-ésimo grant `choose` do talento
 * (ordinal entre os choose, não índice absoluto em grants).
 *
 * NOTA: `mapSrdSpellToCharacter` (de subclassSpells.js) será importado aqui
 * pela Task 4 (injectFeatSpells/enrichWithFeatSpells) — omitido neste PR
 * porque ainda não é usado (lint reclama de import sem uso).
 */

const SIX_CASTER_LISTS = ['bardo', 'bruxo', 'clerigo', 'druida', 'feiticeiro', 'mago']

// Atributo de conjuração por lista de classe (modo 'byList')
export const LIST_ABILITY = {
  bardo: 'cha', bruxo: 'cha', feiticeiro: 'cha',
  clerigo: 'wis', druida: 'wis',
  mago: 'int', artifice: 'int',
}

export const FEAT_SPELL_GRANTS = {
  // ── Tasha ──────────────────────────────────────────────────────────
  'tocado-pelas-fadas': {
    ability: 'chosenAttr',
    grants: [
      { fixed: 'passo-nebuloso', freeCast: 'long', slots: 'always' },
      { choose: { count: 1, level: 1, schools: ['adivinhação', 'encantamento'] },
        freeCast: 'long', slots: 'always' },
    ],
  },
  'tocado-pelas-sombras': {
    ability: 'chosenAttr',
    grants: [
      { fixed: 'invisibilidade', freeCast: 'long', slots: 'always' },
      { choose: { count: 1, level: 1, schools: ['ilusão', 'necromancia'] },
        freeCast: 'long', slots: 'always' },
    ],
  },
  'iniciado-artifice': {
    ability: 'int',
    grants: [
      { choose: { count: 1, level: 0, list: 'artifice' } },
      // Texto explícito: "pode conjurar essa magia utilizando qualquer
      // espaço de magia que você possua" → slots incondicionais.
      { choose: { count: 1, level: 1, list: 'artifice' }, freeCast: 'long', slots: 'always' },
    ],
  },
  telepatico: {
    ability: 'chosenAttr',
    grants: [
      { fixed: 'detectar-pensamentos', freeCast: 'long', slots: 'always' },
    ],
  },
  telecinetico: {
    ability: 'chosenAttr',
    grants: [
      { fixed: 'maos-magicas' }, // truque — à vontade por natureza
    ],
  },
  // ── PHB ────────────────────────────────────────────────────────────
  'iniciado-em-magia': {
    ability: 'byList',
    pickList: SIX_CASTER_LISTS,
    grants: [
      { choose: { count: 2, level: 0, fromList: true } },
      // Sage Advice: slot permitido apenas se a classe escolhida no talento
      // for uma das classes do personagem.
      { choose: { count: 1, level: 1, fromList: true }, freeCast: 'long', slots: 'classMatch' },
    ],
  },
  'conjurador-de-ritual': {
    ability: 'byList',
    pickList: SIX_CASTER_LISTS,
    grants: [
      { choose: { count: 2, level: 1, ritual: true, fromList: true }, ritualOnly: true },
    ],
  },
  'atirador-de-magia': {
    ability: 'byList',
    // RAW lista as seis classes, mas bardo e clérigo não têm truque com jogada
    // de ataque (Chama Sagrada e Escárnio Viciante são salvaguarda) — oferecer
    // essas listas criaria um beco sem saída: count:1 nunca satisfeito.
    pickList: ['bruxo', 'druida', 'feiticeiro', 'mago'],
    grants: [
      { choose: { count: 1, level: 0, attack: true, fromList: true } },
    ],
  },
  // ── Xanathar (talentos raciais) ────────────────────────────────────
  'magia-do-elfo-da-floresta': {
    ability: 'wis',
    grants: [
      { choose: { count: 1, level: 0, list: 'druida' } },
      { fixed: 'passos-longos',     freeCast: 'long', slots: 'never' },
      // Índice canônico; 'passos-sem-pegadas' é duplicata a remover (task à parte).
      { fixed: 'passar-sem-rastro', freeCast: 'long', slots: 'never' },
    ],
  },
  'teleporte-das-fadas': {
    ability: 'int',
    grants: [
      { fixed: 'passo-nebuloso', freeCast: 'short', slots: 'never' },
    ],
  },
  'alta-magia-drow': {
    ability: 'cha',
    grants: [
      { fixed: 'detectar-magia',  atWill: true },
      { fixed: 'levitacao',       freeCast: 'long', slots: 'never' },
      { fixed: 'dissipar-magia',  freeCast: 'long', slots: 'never' },
    ],
  },
}

export function getFeatSpellDef(featIndex) {
  return FEAT_SPELL_GRANTS[featIndex] ?? null
}

/**
 * Resolve o atributo de conjuração das magias do talento.
 * @param def  declaração (getFeatSpellDef)
 * @param feat entrada persistida { chosenAttr?, spellChoices? } (info.feats[])
 */
export function resolveFeatAbility(def, feat) {
  if (!def?.ability) return null
  if (def.ability === 'chosenAttr') return feat?.chosenAttr ?? null
  if (def.ability === 'byList') return LIST_ABILITY[feat?.spellChoices?.list] ?? null
  return def.ability
}

/**
 * Grants `choose` de um talento, com AMBOS os índices: `grantIdx` (posição
 * absoluta em grants — é o `featGrant` persistido) e `ordinal` (posição entre
 * os choose — é o índice em `spellChoices.picks`). Divergem sempre que uma
 * fixa vem antes de um choose (Tocado pelas Fadas/Sombras).
 */
export function getChooseGrants(featIndex) {
  const def = getFeatSpellDef(featIndex)
  if (!def) return []
  let ordinal = 0
  return (def.grants ?? []).flatMap((g, grantIdx) =>
    g.choose ? [{ grantIdx, ordinal: ordinal++, choose: g.choose, grant: g }] : []
  )
}

/**
 * Escolhas completas? Sem def → true. Com pickList, exige `list`; cada grant
 * `choose` exige `picks[ordinal].length === count` (estrito: over-pick também
 * é incompleto).
 */
export function isFeatSpellChoiceComplete(featIndex, spellChoices) {
  const def = getFeatSpellDef(featIndex)
  if (!def) return true
  if (def.pickList && !spellChoices?.list) return false
  return getChooseGrants(featIndex).every(
    ({ ordinal, choose }) => (spellChoices?.picks?.[ordinal]?.length ?? 0) === choose.count
  )
}
