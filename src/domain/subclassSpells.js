/**
 * Motor genérico de magias concedidas por subclasse.
 *
 * Várias classes 5e ganham magias automaticamente da subclasse em níveis
 * específicos. A semântica varia entre dois grupos:
 *
 *  GRUPO A — "Sempre Preparadas" (Cleric/Paladin/Druid Land):
 *    - Marcamos `alwaysPrepared: true` + `prepared: true`.
 *    - PHB: "essas magias contam como preparadas e NÃO contam pro limite".
 *    - UI: contagem de preparadas deve EXCLUIR essas.
 *
 *  GRUPO B — "Expanded Spell List" (Warlock):
 *    - Marcamos `source: 'patron'` mas SEM alwaysPrepared.
 *    - PHB: "essas magias contam como magias de bruxo pra você" — entram
 *      como conhecidas adicionais (não gastam slot do limite known).
 *
 * Para cada classe, mantemos uma tabela `(subclassKey → tier[] → [indices])`
 * + a lista de níveis em que os tiers disparam. As tabelas estão vazias para
 * Paladino/Druida/Bruxo no PR atual — adicionadas em PRs subsequentes.
 */

import { getClericDomainSpellIndices } from './rules'

const CLERIC_DOMAIN_LEVELS = [1, 3, 5, 7, 9]

/* ── Paladin — Oath Spells (PHB p.84) — tiers em 3, 5, 9, 13, 17 ──── */
const PALADIN_OATH_LEVELS = [3, 5, 9, 13, 17]
const PALADIN_OATH_SPELLS = {
  // TODO: validar índices em phb-spells-pt.json (PR 2).
  // 'devocao':    [[],[],[],[],[]],
  // 'os_antigos': [[],[],[],[],[]],
  // 'vinganca':   [[],[],[],[],[]],
}

/* ── Druid Circle of the Land (PHB p.69) — tiers 3, 5, 7, 9 ──────── */
const DRUID_LAND_LEVELS = [3, 5, 7, 9]
const DRUID_LAND_SPELLS = {
  // TODO: precisa de sub-escolha druid_land_type + tabela (PR 3).
}

/* ── Warlock Expanded List (PHB p.108) — tiers 1, 3, 5, 7, 9 ─────── */
const WARLOCK_PATRON_LEVELS = [1, 3, 5, 7, 9]
const WARLOCK_PATRON_SPELLS = {
  // TODO: (PR 4) semântica "known" diferente das demais.
}

function labelFor(classIndex, subclassKey) {
  if (classIndex === 'clerigo')  return `Domínio: ${subclassKey}`
  if (classIndex === 'paladino') return `Juramento: ${subclassKey}`
  if (classIndex === 'druida')   return `Círculo da Terra (${subclassKey})`
  if (classIndex === 'bruxo')    return `Patrono: ${subclassKey}`
  return null
}

/**
 * Retorna `{ indices, alwaysPrepared, source, label }` para um nível EXATO.
 * Usado por level-up (só queremos as magias do tier que acabou de desbloquear).
 */
export function getSubclassSpellsForLevel({ classIndex, chosenFeatures, classLevel }) {
  if (!chosenFeatures) return { indices: [] }

  if (classIndex === 'clerigo') {
    const domain = chosenFeatures.divine_domain
    if (!domain || !CLERIC_DOMAIN_LEVELS.includes(classLevel)) return { indices: [] }
    return {
      indices: getClericDomainSpellIndices(domain, classLevel),
      alwaysPrepared: true,
      source: 'domain',
      label: labelFor(classIndex, domain),
    }
  }

  if (classIndex === 'paladino') {
    const oath = chosenFeatures.sacred_oath
    if (!oath || !PALADIN_OATH_LEVELS.includes(classLevel)) return { indices: [] }
    const tier = PALADIN_OATH_LEVELS.indexOf(classLevel)
    return {
      indices: PALADIN_OATH_SPELLS[oath]?.[tier] ?? [],
      alwaysPrepared: true,
      source: 'oath',
      label: labelFor(classIndex, oath),
    }
  }

  if (classIndex === 'druida') {
    if (chosenFeatures.druid_circle !== 'terra') return { indices: [] }
    const land = chosenFeatures.druid_land_type
    if (!land || !DRUID_LAND_LEVELS.includes(classLevel)) return { indices: [] }
    const tier = DRUID_LAND_LEVELS.indexOf(classLevel)
    return {
      indices: DRUID_LAND_SPELLS[land]?.[tier] ?? [],
      alwaysPrepared: true,
      source: 'circle',
      label: labelFor(classIndex, land),
    }
  }

  if (classIndex === 'bruxo') {
    const patron = chosenFeatures.patron
    if (!patron || !WARLOCK_PATRON_LEVELS.includes(classLevel)) return { indices: [] }
    const tier = WARLOCK_PATRON_LEVELS.indexOf(classLevel)
    return {
      indices: WARLOCK_PATRON_SPELLS[patron]?.[tier] ?? [],
      alwaysPrepared: false,
      source: 'patron',
      expandsKnownList: true,
      label: labelFor(classIndex, patron),
    }
  }

  return { indices: [] }
}

/**
 * Acumula todas as magias da subclasse até `classLevel` (inclusive). Usado
 * pelo wizard que constrói o personagem direto em qualquer nível.
 */
export function getAllSubclassSpellsUpToLevel({ classIndex, chosenFeatures, classLevel }) {
  const out = []
  for (let lvl = 1; lvl <= classLevel; lvl++) {
    const { indices = [], alwaysPrepared, source, label } = getSubclassSpellsForLevel({
      classIndex, chosenFeatures, classLevel: lvl,
    })
    for (const idx of indices) {
      out.push({ index: idx, alwaysPrepared, source, label, grantedAtLevel: lvl })
    }
  }
  return out
}

export function mapSrdSpellToCharacter(srdSpell, { source, alwaysPrepared, label } = {}) {
  if (!srdSpell) return null
  return {
    index: srdSpell.index,
    name:  srdSpell.name,
    level: srdSpell.level,
    school: typeof srdSpell.school === 'object' ? (srdSpell.school?.name ?? '') : (srdSpell.school ?? ''),
    castingTime:   srdSpell.casting_time ?? '',
    range:         srdSpell.range ?? '',
    duration:      srdSpell.duration ?? '',
    concentration: srdSpell.concentration ?? false,
    components:    Array.isArray(srdSpell.components) ? srdSpell.components.join(', ') : (srdSpell.components ?? ''),
    desc:          srdSpell.desc ?? '',
    ritual:        srdSpell.ritual ?? false,
    source:        source ?? 'PHB-PT',
    ...(alwaysPrepared ? { alwaysPrepared: true, prepared: true } : {}),
    ...(label ? { sourceLabel: label } : {}),
  }
}

/**
 * Drop-in para o antigo `enrichWithClericDomainSpells` — agora cobre
 * cleric/paladin/druid/warlock de forma uniforme.
 */
export function enrichWithSubclassSpells({ patch, classIndex, chosenFeatures, srdSpells }) {
  if (patch.multiclassIndex != null) return patch

  // newChoices vence chosenFeatures (escolha feita neste mesmo level-up).
  const effectiveChoices = { ...(chosenFeatures ?? {}), ...(patch.newChoices ?? {}) }
  const { indices = [], alwaysPrepared, source, label } = getSubclassSpellsForLevel({
    classIndex, chosenFeatures: effectiveChoices, classLevel: patch.newLevel,
  })
  if (indices.length === 0) return patch

  const granted = indices
    .map(idx => srdSpells?.find(s => s.index === idx))
    .filter(Boolean)
    .map(s => mapSrdSpellToCharacter(s, { source, alwaysPrepared, label }))

  if (granted.length === 0) return patch

  return {
    ...patch,
    bonusSpells: [...(patch.bonusSpells ?? []), ...granted],
  }
}

/**
 * Injeta magias de subclasse no personagem inteiro (usado pelo wizard,
 * que constrói o character de uma vez sem level-ups intermediários).
 * Idempotente: ignora magias já presentes (mesma `index`).
 */
export function injectSubclassSpellsAtBuild(character, srdSpells) {
  if (!character || !srdSpells) return character

  const grantList = []
  const classIndex = character.info?.class
  const classLevel = character.info?.level ?? 1
  const chosenFeatures = character.info?.chosenFeatures ?? {}
  grantList.push(...getAllSubclassSpellsUpToLevel({ classIndex, chosenFeatures, classLevel }))

  for (const mc of character.info?.multiclasses ?? []) {
    grantList.push(...getAllSubclassSpellsUpToLevel({
      classIndex: mc.class,
      chosenFeatures: mc.chosenFeatures ?? {},
      classLevel: mc.level ?? 1,
    }))
  }

  if (grantList.length === 0) return character

  const existing = character.spellcasting?.spells ?? []
  const seen = new Set(existing.map(s => s.index))

  const added = []
  for (const g of grantList) {
    if (seen.has(g.index)) continue
    const srd = srdSpells.find(s => s.index === g.index)
    if (!srd) continue
    const mapped = mapSrdSpellToCharacter(srd, {
      source: g.source,
      alwaysPrepared: g.alwaysPrepared,
      label: g.label,
    })
    added.push(mapped)
    seen.add(g.index)
  }

  if (added.length === 0) return character

  return {
    ...character,
    spellcasting: {
      ...character.spellcasting,
      spells: [...existing, ...added],
    },
  }
}
