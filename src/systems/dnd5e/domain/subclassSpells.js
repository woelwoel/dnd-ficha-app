/**
 * Motor genérico de magias concedidas por subclasse.
 *
 * Várias classes 5e ganham magias automaticamente da subclasse em níveis
 * específicos. A semântica varia entre dois grupos:
 *
 *  GRUPO A — "Sempre Preparadas" (Cleric/Paladin/Druid Land/Artificer):
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
  // Juramento da Glória (Tasha's p.50) — source: tasha
  gloria: [
    ['raio-guiador',         'heroismo'],                  // 3 (Guiding Bolt)
    ['aprimorar-habilidade', 'arma-magica'],               // 5 (Enhance Ability)
    ['velocidade',           'protecao-contra-energia'],   // 9 (Haste)
    ['compulsao',            'liberdade-de-movimento'],    // 13 (Compulsion, Freedom of Movement)
    ['comunhao',             'coluna-de-chamas'],          // 17 (Commune, Flame Strike)
  ],
  // Juramento da Vigilância — Watchers (Tasha's p.51) — source: tasha
  vigilancia: [
    ['alarme',             'detectar-magia'],              // 3
    ['raio-lunar',         'ver-o-invisivel'],             // 5
    ['contramagica',       'nao-detectar'],                // 9 (Counterspell, Nondetection)
    ['aura-de-pureza',     'banimento'],                   // 13
    ['imobilizar-monstro', 'videncia'],                    // 17 (Hold Monster, Scrying)
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

/* ── Círculos do Caldeirão de Tasha (source: tasha) ────────────────
 * Diferente do Círculo da Terra (que depende de druid_land_type e usa
 * níveis 3/5/7/9), estes círculos concedem "Magias de Círculo" fixas pelo
 * próprio círculo, começando no NÍVEL 2 — tiers em 2, 3, 5, 7, 9. Sempre
 * preparadas, não contam pro limite. Estrelas não tem lista de círculo: o
 * Mapa Estelar concede só Raio Guia (sempre preparada) no nv2; o truque
 * Orientação fica na prosa da subclasse (sistema de truques bônus). */
const DRUID_CIRCLE_LEVELS = [2, 3, 5, 7, 9]
const DRUID_CIRCLE_SPELLS = {
  esporos: [
    ['toque-arrepiante'],                                  // 2 (Chill Touch)
    ['cegueirasurdez',        'repouso-tranquilo'],        // 3 (Blindness/Deafness, Gentle Repose)
    ['animar-mortos',         'forma-gasosa'],             // 5
    ['malogro',               'confusao'],                 // 7 (Blight, Confusion)
    ['nevoa-mortal',          'praga'],                    // 9 (Cloudkill, Contagion)
  ],
  'fogo-selvagem': [
    ['maos-flamejantes',      'curar-ferimentos'],         // 2
    ['esfera-flamejante',     'raio-ardente'],             // 3
    ['crescimento-de-planta', 'revivificar'],              // 5
    ['aura-de-vida',          'escudo-de-fogo'],           // 7 (Aura of Life, Fire Shield)
    ['coluna-de-chamas',      'curar-ferimentos-em-massa'],// 9 (Flame Strike, Mass Cure Wounds)
  ],
  estrelas: [
    ['raio-guiador'],   // 2 (Mapa Estelar: Raio Guia sempre preparada)
    [], [], [], [],     // 3/5/7/9 — sem lista de círculo
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
  // O Insondável — Fathomless (Tasha's p.30) — source: tasha
  insondavel: [
    ['criar-ou-destruir-agua', 'onda-trovejante'],   // 1
    ['lufada-de-vento',        'silencio'],           // 3
    ['nevasca',                'relampago'],          // 5 (Sleet Storm, Lightning Bolt)
    ['controlar-agua',         'conjurar-elemental'], // 7 (Invocar Elemental → Conjure Elemental, água)
    ['cone-de-frio',           'mao-de-bigby'],       // 9 (Cone of Cold, Bigby's Hand)
  ],
}

/* ── O Gênio — The Genie (Tasha's p.31) — source: tasha ─────────────
 * Lista expandida = base (sempre) + magias do tipo de gênio escolhido
 * (bruxo_genie_kind: dao/djinni/ifriti/marid). Combinadas por tier
 * [níveis de bruxo 1/3/5/7/9 = círculos 1–5] no branch do bruxo.
 * OMITIDA: Mesclar-se às Rochas (Meld into Stone, Dao 3º círculo) — magia
 * PHB ausente do catálogo; restaurar quando o catálogo base for completado. */
const GENIE_BASE = [
  ['detectar-o-bem-e-mal'],     // 1 (Detect Evil and Good)
  ['forca-fantasmagorica'],     // 3 (Phantasmal Force)
  ['criar-alimentos'],          // 5 (Create Food and Water)
  ['assassino-fantasmagorico'], // 7 (Phantasmal Killer)
  ['criacao'],                  // 9 (Creation)
]
const GENIE_KIND = {
  // Dao: 1º santuário, 2º crescer espinhos, 3º Mesclar-se às Rochas (OMITIDA,
  // ausente do catálogo), 4º Pele de Pedra (Stoneskin), 5º muralha de pedra.
  dao:    [['santuario'], ['crescer-espinhos'], [], ['pele-de-pedra'], ['muralha-de-pedra']],
  djinni: [['onda-trovejante'], ['lufada-de-vento'], ['muralha-de-vento'], ['invisibilidade-maior'], ['similaridade']],
  ifriti: [['maos-flamejantes'], ['raio-ardente'], ['bola-de-fogo'], ['escudo-de-fogo'], ['coluna-de-chamas']],
  // Marid: 1º nublar (Fog Cloud), 2º Embaçar (Blur — OMITIDA, ausente do
  // catálogo PT), 3º nevasca, 4º controlar água, 5º cone de frio.
  marid:  [['nublar'], [], ['nevasca'], ['controlar-agua'], ['cone-de-frio']],
}

/* ── Origens de Feiticeiro de Tasha (p.46) — tiers 1/3/5/7/9 ────────
 * Magias Psiônicas (Mente Aberrante) e Cronométricas (Alma Cronométrica):
 * "sempre contam como magias de feiticeiro e estão sempre conhecidas, sem
 * contar pro limite" → tratadas como GRUPO A (alwaysPrepared). */
const SORCERER_ORIGIN_LEVELS = [1, 3, 5, 7, 9]
const SORCERER_ORIGIN_SPELLS = {
  mente_aberrante: [
    ['bracos-de-hadar', 'farpa-mental', 'sussurros-dissonantes'], // 1 (inclui truque Farpa Mental)
    ['acalmar-emocoes', 'detectar-pensamentos'],                  // 3
    ['fome-de-hadar',   'enviar-mensagem'],                       // 5 (Hunger of Hadar, Sending)
    ['invocar-aberracao','tentaculos-negros-de-evard'],           // 7
    ['ligacao-telepatica-de-rary', 'telecinesia'],                // 9
  ],
  alma_cronometrica: [
    ['alarme',          'protecao-contra-o-bem-e-mal'],           // 1
    ['auxilio-divino',  'restauracao-menor'],                     // 3 (Aid, Lesser Restoration)
    ['dissipar-magia',  'protecao-contra-energia'],               // 5
    ['invocar-construto','movimentacao-livre'],                   // 7 (Summon Construct, Freedom of Movement)
    ['muralha-de-energia','restauracao-maior'],                   // 9
  ],
}

/* ── Arquétipos de Patrulheiro de Tasha (p.51) — tiers 3/5/9/13/17 ──
 * Magias do arquétipo: sempre preparadas, não contam pro limite. Só
 * magias PHB (todas já no catálogo). */
const RANGER_ARCHETYPE_LEVELS = [3, 5, 9, 13, 17]
const RANGER_ARCHETYPE_SPELLS = {
  andarilho_feerico: [
    ['enfeiticar-pessoa'],  // 3 (Charm Person)
    ['passo-nebuloso'],     // 5 (Misty Step)
    ['dissipar-magia'],     // 9
    ['porta-dimensional'],  // 13 (Dimension Door)
    ['despistar'],          // 17 (Mislead)
  ],
  portador_do_enxame: [
    ['fogo-das-fadas', 'maos-magicas'], // 3 (Faerie Fire, Mage Hand truque)
    ['teia'],                            // 5 (Web)
    ['forma-gasosa'],                    // 9
    ['olho-arcano'],                     // 13 (Arcane Eye)
    ['praga-de-insetos'],                // 17 (Insect Plague)
  ],
}

/* ── Artificer Specialization Spells (Tasha's p.14-18) — tiers 3, 5, 9, 13, 17
 * GRUPO A (always prepared), igual Cleric/Paladin: "Essas magias contam como
 * magias de artífice para você, mas elas não são consideradas entre o número
 * de magia de artífice que você prepara."
 *
 * As magias antes omitidas (achava-se ausentes do catálogo) na verdade existem
 * sob outras slugs e foram restauradas: Ray of Sickness = `raio-adoecente`
 * (Alquimista nv3) e Shield = `escudo-arcano` (Atirador e Ferreiro de Batalha
 * nv3). Todas as magias das tabelas do livro estão representadas.
 */
const ARTIFICER_SPELL_LEVELS = [3, 5, 9, 13, 17]
const ARTIFICER_SUBCLASS_SPELLS = {
  // Alquimista (Tasha's p.14)
  alquimista: [
    ['palavra-curativa',         'raio-adoecente'],          // 3 (Healing Word, Ray of Sickness)
    ['esfera-flamejante',        'flecha-acida-de-melf'],    // 5
    ['forma-gasosa',             'palavra-curativa-em-massa'],// 9
    ['malogro',                  'protecao-contra-a-morte'], // 13
    ['nevoa-mortal',             'reviver-os-mortos'],        // 17
  ],
  // Armeiro (Tasha's p.14-15)
  armeiro: [
    ['misseis-magicos',   'onda-trovejante'],        // 3
    ['reflexos',          'despedacar'],              // 5
    ['padrao-hipnotico',  'relampago'],               // 9
    ['escudo-de-fogo',    'invisibilidade-maior'],    // 13 (Escudo Ardente = Fire Shield)
    ['criar-passagem',    'muralha-de-energia'],      // 17
  ],
  // Atirador (Tasha's p.16)
  atirador: [
    ['escudo-arcano',       'onda-trovejante'],       // 3 (Shield, Thunderwave)
    ['raio-ardente',        'despedacar'],            // 5
    ['bola-de-fogo',        'muralha-de-vento'],      // 9
    ['tempestade-de-gelo',  'muralha-de-fogo'],       // 13 (Tempestade Glacial = Ice Storm)
    ['cone-de-frio',        'muralha-de-energia'],    // 17
  ],
  // Ferreiro de Batalha (Tasha's p.17-18)
  'ferreiro-de-batalha': [
    ['heroismo',              'escudo-arcano'],              // 3 (Heroísmo, Shield)
    ['marca-da-punicao',      'vinculo-protetor'],           // 5 (Vínculo de Proteção = Warding Bond)
    ['aura-de-vitalidade',    'conjurar-rajada'],            // 9 (Invocar Barragem = Conjure Barrage)
    ['aura-de-pureza',        'escudo-de-fogo'],             // 13
    ['destruicao-banidora',   'aura-de-vida'],               // 17 (Banishing Smite + Aura of Life)
  ],
}

function labelFor(classIndex, subclassKey) {
  if (classIndex === 'clerigo')  return `Domínio: ${subclassKey}`
  if (classIndex === 'paladino') return `Juramento: ${subclassKey}`
  if (classIndex === 'druida')   return `Círculo da Terra (${subclassKey})`
  if (classIndex === 'bruxo')    return `Patrono: ${subclassKey}`
  if (classIndex === 'artifice') return `Especialização: ${subclassKey}`
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
    const circle = chosenFeatures.druid_circle
    // Círculos de Tasha: lista fixa por nível [2,3,5,7,9]
    if (DRUID_CIRCLE_SPELLS[circle]) {
      const tier = DRUID_CIRCLE_LEVELS.indexOf(classLevel)
      if (tier < 0) return { indices: [] }
      return {
        indices: DRUID_CIRCLE_SPELLS[circle][tier] ?? [],
        alwaysPrepared: true,
        source: 'circle',
        label: `Círculo: ${circle}`,
      }
    }
    // PHB: Círculo da Terra (depende do tipo de terreno)
    if (circle !== 'terra') return { indices: [] }
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
    // O Gênio combina lista base + magias do tipo de gênio escolhido.
    const indices = patron === 'genio'
      ? [...(GENIE_BASE[tier] ?? []), ...(GENIE_KIND[chosenFeatures.bruxo_genie_kind]?.[tier] ?? [])]
      : (WARLOCK_PATRON_SPELLS[patron]?.[tier] ?? [])
    return {
      indices,
      alwaysPrepared: true,
      source: 'patron',
      label: labelFor(classIndex, patron),
    }
  }

  if (classIndex === 'feiticeiro') {
    const origin = chosenFeatures.sorcerous_origin
    if (!origin || !SORCERER_ORIGIN_LEVELS.includes(classLevel)) return { indices: [] }
    const tier = SORCERER_ORIGIN_LEVELS.indexOf(classLevel)
    return {
      indices: SORCERER_ORIGIN_SPELLS[origin]?.[tier] ?? [],
      alwaysPrepared: true,
      source: 'origin',
      label: `Origem: ${origin}`,
    }
  }

  if (classIndex === 'patrulheiro') {
    const archetype = chosenFeatures.ranger_archetype
    if (!archetype || !RANGER_ARCHETYPE_LEVELS.includes(classLevel)) return { indices: [] }
    const tier = RANGER_ARCHETYPE_LEVELS.indexOf(classLevel)
    return {
      indices: RANGER_ARCHETYPE_SPELLS[archetype]?.[tier] ?? [],
      alwaysPrepared: true,
      source: 'archetype',
      label: `Arquétipo: ${archetype}`,
    }
  }

  if (classIndex === 'artifice') {
    const specialization = chosenFeatures.artificer_specialization
    if (!specialization || !ARTIFICER_SPELL_LEVELS.includes(classLevel)) return { indices: [] }
    const tier = ARTIFICER_SPELL_LEVELS.indexOf(classLevel)
    return {
      indices: ARTIFICER_SUBCLASS_SPELLS[specialization]?.[tier] ?? [],
      alwaysPrepared: true,
      source: 'specialization',
      label: labelFor(classIndex, specialization),
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
