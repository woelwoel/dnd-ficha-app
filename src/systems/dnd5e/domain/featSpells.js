/**
 * Motor de magias concedidas por TALENTO (spec 2026-07-15).
 *
 * Espelha o subclassSpells.js: declaração no domínio + injeção na criação
 * (build) e no level-up (bonusSpells). Diferenças importantes:
 *  - MERGE, nunca skip: magia já presente ACUMULA a proveniência do talento
 *    (mais uma entrada em `featGrants`, e ability se ausente) em vez de ser
 *    descartada — a mesma magia pode vir de mais de um talento;
 *  - roda TAMBÉM em level-up de multiclasse (ASI de MC pode virar talento);
 *  - regras de conjuração (freeCast/atWill/ritualOnly/slots) derivam AO VIVO
 *    das declarações via getCastPolicy — nunca são persistidas na magia.
 *
 * `picks[i]` do spellChoices alinha com o i-ésimo grant `choose` do talento
 * (ordinal entre os choose, não índice absoluto em grants).
 */

import { mapSrdSpellToCharacter } from './subclassSpells'

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

/**
 * Candidatas de um grant `choose`. `list` = classe escolhida no pickList
 * (irrelevante quando o grant tem `list` fixa). `spellMechanics` é
 * OBRIGATÓRIO para grants com `attack: true` — sem ele, lança.
 */
export function resolveFeatSpellOptions(featIndex, grantIdx, { list = null, srdSpells = [], spellMechanics = null } = {}) {
  const def = getFeatSpellDef(featIndex)
  const grant = def?.grants?.[grantIdx]
  if (!grant?.choose) return []
  const c = grant.choose
  const wantList = c.list ?? (c.fromList ? list : null)
  if (c.fromList && !wantList) return []
  // `spellMechanics` é lazy (SrdProvider): `undefined` é estado real de
  // carregamento. Falhar alto — lista vazia silenciosa é indistinguível de
  // "nenhuma opção válida" na UI. Quem chama gate no dataset, não no [].
  if (c.attack && !spellMechanics) {
    throw new Error(`resolveFeatSpellOptions: grant com attack:true exige spellMechanics (${featIndex}#${grantIdx})`)
  }
  return srdSpells.filter(s => {
    if (s.level !== c.level) return false
    if (c.schools && !c.schools.includes(s.school)) return false
    if (c.ritual && !s.ritual) return false
    if (wantList && !(s.classes ?? []).includes(wantList)) return false
    if (c.attack && spellMechanics[s.index]?.attack !== true) return false
    return true
  })
}

/**
 * Política de UM grant. Extraída de getCastPolicy pra que a união sobre
 * `featGrants` reuse exatamente a mesma lógica por concessão.
 */
function policyForGrant(ref, spell, character) {
  const def = getFeatSpellDef(ref.featIndex)
  const grant = def?.grants?.[ref.featGrant]
  if (!grant) {
    // `featGrant` é persistido: editar uma declaração pode orfanar fichas
    // salvas. Avisa em DEV — throw derrubaria a ficha inteira (isso roda por
    // linha, a cada render).
    if (import.meta.env?.DEV) {
      console.warn(`getCastPolicy: featGrant órfão (${ref.featIndex}#${ref.featGrant})`)
    }
    return null
  }
  if (grant.ritualOnly) return { slots: false, ritualOnly: true, atWill: false, freeCast: null }
  if (grant.atWill)     return { slots: false, ritualOnly: false, atWill: true, freeCast: null }
  if (spell.level === 0) return { slots: false, ritualOnly: false, atWill: true, freeCast: null }

  const freeCast = grant.freeCast
    ? { recharge: grant.freeCast, trackerId: `feat-${ref.featIndex}-${spell.index}` }
    : null

  const policy = grant.slots ?? 'always'
  let slots
  if (policy === 'always') slots = true
  else if (policy === 'never') slots = false
  else if (policy === 'classMatch') {
    const feat = (character?.info?.feats ?? []).find(f => f.index === ref.featIndex)
    const list = feat?.spellChoices?.list ?? null
    const classes = [character?.info?.class, ...(character?.info?.multiclasses ?? []).map(m => m.class)]
      .filter(Boolean)
    slots = classes.includes(list)
  } else {
    throw new Error(`getCastPolicy: política de slots desconhecida '${policy}' (${ref.featIndex}#${ref.featGrant})`)
  }
  return { slots, ritualOnly: false, atWill: false, freeCast }
}

/**
 * Política de conjuração de uma magia de talento, derivada AO VIVO das
 * declarações (nada disso é persistido na magia). Retorna null pra magia que
 * não veio de talento — o caller usa o comportamento padrão.
 *
 * UNIÃO sobre `featGrants`: dois talentos podem conceder a MESMA magia com
 * políticas diferentes (Passo Nebuloso via Tocado pelas Fadas + Teleporte das
 * Fadas; Detectar Magia via Alta Magia Drow + Tocado pelas Fadas). O jogador
 * tem os dois benefícios, então `slots`/`atWill` são OR, `ritualOnly` é AND
 * (só é ritual-only se TODA concessão for), e `freeCast` é uma LISTA — cada
 * concessão tem seu próprio tracker independente.
 *
 * `slots: 'classMatch'` reavalia a cada chamada: multiclassar depois de pegar
 * o talento muda o resultado (Sage Advice, Iniciado em Magia).
 */
export function getCastPolicy(spell, character) {
  const refs = spell?.featGrants ?? []
  const policies = refs.map(ref => policyForGrant(ref, spell, character)).filter(Boolean)
  if (policies.length === 0) return null
  return {
    slots:      policies.some(p => p.slots),
    ritualOnly: policies.every(p => p.ritualOnly),
    atWill:     policies.some(p => p.atWill),
    freeCast:   policies.map(p => p.freeCast).filter(Boolean),
  }
}

/**
 * Refs `{ index, grantIdx }` das magias concedidas por UM feat persistido.
 * `grantIdx` é a posição ABSOLUTA em `def.grants` (o que vai pro `featGrant`
 * persistido); `picks[ordinal]` alinha com o i-ésimo grant `choose`
 * (getChooseGrants faz a tradução ordinal→grantIdx).
 */
function getGrantedSpellRefs(def, feat) {
  const out = []
  for (const [grantIdx, g] of def.grants.entries()) {
    if (g.fixed) out.push({ index: g.fixed, grantIdx })
  }
  for (const { grantIdx, ordinal } of getChooseGrants(feat.index)) {
    for (const idx of feat?.spellChoices?.picks?.[ordinal] ?? []) {
      out.push({ index: idx, grantIdx })
    }
  }
  return out
}

/**
 * Injeta as magias de TODOS os talentos do personagem (info.feats) em
 * `spellcasting.spells`. MERGE idempotente: usa um único mapa de trabalho
 * (`working`, index→spell) seedado com as magias existentes — uma magia
 * criada por um talento fica visível pro próximo talento do MESMO loop,
 * então dois talentos concedendo a mesma magia (ex.: Passo Nebuloso via
 * Tocado pelas Fadas + Teleporte das Fadas) acumulam no mesmo objeto em vez
 * de duplicar. `featGrants` ACUMULA a referência (nunca sobrescreve);
 * `ability` só é setado se ainda ausente. Nada muda → retorna o MESMO
 * objeto `character` (identidade preservada, útil pra idempotência).
 *
 * Usado no build do wizard e no retrofit da ficha (plano 2).
 */
export function injectFeatSpells(character, srdSpells) {
  if (!character || !srdSpells?.length) return character

  const spells = character.spellcasting?.spells ?? []
  const order = spells.map(s => s.index)
  const working = new Map(spells.map(s => [s.index, s]))
  let changed = false

  const hasRef = (refs, featIndex, grantIdx) =>
    refs.some(r => r.featIndex === featIndex && r.featGrant === grantIdx)

  for (const feat of character.info?.feats ?? []) {
    const def = getFeatSpellDef(feat.index)
    if (!def) continue
    const ability = resolveFeatAbility(def, feat)
    const label = `Talento: ${feat.name}`

    for (const ref of getGrantedSpellRefs(def, feat)) {
      const cur = working.get(ref.index)

      if (cur) {
        const refs = cur.featGrants ?? []
        if (hasRef(refs, feat.index, ref.grantIdx)) continue   // idempotente
        working.set(ref.index, {
          ...cur,
          featGrants: [...refs, { featIndex: feat.index, featGrant: ref.grantIdx }],
          ...(cur.ability == null && ability ? { ability } : {}),
        })
        changed = true
        continue
      }

      const srd = srdSpells.find(s => s.index === ref.index)
      if (!srd) continue
      working.set(ref.index, {
        ...mapSrdSpellToCharacter(srd, { source: 'feat', alwaysPrepared: true, label }),
        featGrants: [{ featIndex: feat.index, featGrant: ref.grantIdx }],
        ...(ability ? { ability } : {}),
      })
      order.push(ref.index)
      changed = true
    }
  }

  if (!changed) return character

  return {
    ...character,
    spellcasting: { ...character.spellcasting, spells: order.map(idx => working.get(idx)) },
  }
}
