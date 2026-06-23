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
  // Juramento de Devoção (PHB p.85)
  devocao: [
    ['protecao-contra-o-bem-e-mal', 'santuario'],          // 3
    ['restauracao-menor',           'zona-da-verdade'],    // 5
    ['farol-de-esperanca',          'dissipar-magia'],     // 9
    ['liberdade-de-movimento',      'guardiao-da-fe'],     // 13
    ['comunhao',                    'coluna-de-chamas'],   // 17 (Flame Strike)
  ],
  // Juramento dos Anciões (PHB p.86)
  os_antigos: [
    ['golpe-constritor',         'falar-com-animais'],        // 3 (Ensnaring Strike)
    ['passo-nebuloso',           'raio-lunar'],               // 5 (Misty Step, Moonbeam)
    ['crescimento-de-planta',    'protecao-contra-energia'],  // 9
    ['tempestade-de-gelo',       'pele-de-pedra'],            // 13
    ['comunhao-com-a-natureza',  'caminhar-em-arvores'],      // 17 (Tree Stride)
  ],
  // Juramento de Vingança (PHB p.88)
  vinganca: [
    ['perdicao',          'marca-do-cacador'],          // 3 (Bane, Hunter's Mark)
    ['imobilizar-pessoa', 'passo-nebuloso'],            // 5 (Hold Person, Misty Step)
    ['velocidade',        'protecao-contra-energia'],   // 9 (Haste)
    ['banimento',         'porta-dimensional'],         // 13
    ['imobilizar-monstro','escrutinio'],                // 17 (Hold Monster, Scrying)
  ],
}

/* ── Druid Circle of the Land (PHB p.69) — tiers 3, 5, 7, 9 ──────── */
const DRUID_LAND_LEVELS = [3, 5, 7, 9]
const DRUID_LAND_SPELLS = {
  artico: [
    ['imobilizar-pessoa',       'crescer-espinhos'],       // 3 (Hold Person, Spike Growth)
    ['tempestade-de-neve',      'lentidao'],               // 5 (Sleet Storm, Slow)
    ['liberdade-de-movimento',  'tempestade-de-gelo'],     // 7
    ['comunhao-com-a-natureza', 'cone-de-frio'],           // 9
  ],
  costa: [
    ['imagem-espelhada',       'passo-nebuloso'],          // 3 (Mirror Image, Misty Step)
    ['respirar-na-agua',       'andar-na-agua'],           // 5
    ['controlar-agua',         'liberdade-de-movimento'],  // 7
    ['conjurar-elemental',     'escrutinio'],              // 9
  ],
  deserto: [
    ['nublar',                'silencio'],                 // 3 (Blur, Silence)
    ['criar-alimentos',       'protecao-contra-energia'],  // 5
    ['malogro',               'terreno-alucinogeno'],      // 7 (Blight, Hall. Terrain)
    ['praga-de-insetos',      'parede-de-pedra'],          // 9
  ],
  floresta: [
    ['pele-de-arvore',         'patas-de-aranha'],         // 3 (Barkskin, Spider Climb)
    ['chamada-do-relampago',   'crescimento-de-planta'],   // 5
    ['adivinhacao',            'liberdade-de-movimento'],  // 7
    ['comunhao-com-a-natureza','caminhar-em-arvores'],     // 9 (Tree Stride)
  ],
  montanha: [
    ['patas-de-aranha',     'crescer-espinhos'],           // 3 (Spider Climb, Spike Growth)
    ['relampago',           'moldar-rochas'],              // 5 (Lightning Bolt; Meld Into Stone faltando no SRD-PT, usa Stone Shape como proxy)
    ['moldar-rochas',       'pele-de-pedra'],              // 7 (Stone Shape, Stoneskin)
    ['criar-passagem',      'parede-de-pedra'],            // 9 (Passwall, Wall of Stone)
  ],
  pantano: [
    ['escuridao',                'flecha-acida-de-melf'],  // 3 (Darkness, Melf's Acid Arrow)
    ['andar-na-agua',            'nevoa-fetida'],          // 5 (Water Walk, Stinking Cloud)
    ['liberdade-de-movimento',   'localizar-criatura'],    // 7
    ['praga-de-insetos',         'escrutinio'],            // 9
  ],
  pradaria: [
    ['invisibilidade',         'passar-sem-rastro'],       // 3
    ['luz-do-dia',             'velocidade'],              // 5 (Daylight, Haste)
    ['adivinhacao',            'liberdade-de-movimento'],  // 7
    ['sonho',                  'praga-de-insetos'],        // 9 (Dream, Insect Plague)
  ],
  submontano: [
    ['patas-de-aranha',        'teia'],                    // 3 (Spider Climb, Web)
    ['forma-gasosa',           'nevoa-fetida'],            // 5 (Gaseous Form, Stinking Cloud)
    ['invisibilidade-maior',   'moldar-rochas'],           // 7 (Greater Invis., Stone Shape)
    ['nevoa-mortal',           'praga-de-insetos'],        // 9 (Cloudkill, Insect Plague)
  ],
}

/* ── Warlock Expanded List (PHB p.108) — tiers 1, 3, 5, 7, 9 ───────
 * Semântica diferente das outras três: NÃO são "always prepared".
 * Entram na lista expandida de magias do bruxo — funcionam como se fossem
 * da lista do bruxo pra ele, e ainda assim ocupam slot de "magia conhecida"
 * quando o bruxo decide aprendê-las. Marcamos `source: 'patron'` e
 * `expandsKnownList: true`, sem `alwaysPrepared`. A injeção atual adiciona
 * elas à lista de spells do personagem — uma futura iteração pode tratar
 * elas como "disponíveis para aprender" em vez de já aprendidas.
 */
const WARLOCK_PATRON_LEVELS = [1, 3, 5, 7, 9]
const WARLOCK_PATRON_SPELLS = {
  // Patrono Feérico — Archfey (PHB p.109)
  feerico: [
    ['fogo-das-fadas',       'sono'],                     // 1
    ['acalmar-emocoes',      'forca-fantasmagorica'],     // 3 (lvl 2 spells)
    ['piscar',               'crescimento-de-planta'],    // 5 (lvl 3)
    ['dominar-besta',        'invisibilidade-maior'],     // 7 (lvl 4)
    ['dominar-pessoa',       'similaridade'],             // 9 (lvl 5, Seeming)
  ],
  // Patrono Infernal — Fiend (PHB p.109)
  infernal: [
    ['maos-flamejantes',  'comando'],                     // 1
    ['cegueirasurdez',    'raio-ardente'],                // 3
    ['bola-de-fogo',      'nevoa-fetida'],                // 5
    ['escudo-de-fogo',    'muralha-de-fogo'],             // 7
    ['coluna-de-chamas',  'consagrar'],                   // 9 (Flame Strike, Hallow)
  ],
  // Patrono do Grande Antigo (PHB p.110)
  grande_antigo: [
    ['sussurros-dissonantes',     'riso-histerico-de-tasha'],   // 1
    ['detectar-pensamentos',      'forca-fantasmagorica'],      // 3
    ['clarividencia',             'enviar-mensagem'],           // 5 (Sending)
    ['dominar-besta',             'tentaculos-negros-de-evard'],// 7
    ['dominar-pessoa',            'telecinesia'],               // 9
  ],
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
    // PHB p.108: lista expandida = magias adicionais que NÃO contam pro limite
    // de conhecidas. UX-wise isso é equivalente a "always available / doesn't
    // count" — usamos alwaysPrepared=true (que a UI já trata excluindo do
    // contador). O label indica fonte ("Patrono: feerico").
    return {
      indices: WARLOCK_PATRON_SPELLS[patron]?.[tier] ?? [],
      alwaysPrepared: true,
      source: 'patron',
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
