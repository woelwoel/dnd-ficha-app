/**
 * Schema Zod para validar personagens ao carregar/importar.
 *
 * Passthrough em objetos intermediários para tolerar campos extras (e.g.,
 * campos adicionados em versões futuras que ainda não migraram).
 *
 * SCHEMA_VERSION identifica o formato canônico do personagem. Ao bump,
 * escreva uma migração em `migrations/` e rode em `safeParseCharacter`.
 */

import { z } from 'zod'

/**
 * Versão atual do formato de ficha. Incrementar a cada breaking change.
 *
 * Histórico:
 *  - v1 → versão inicial. `combat.hitDice` era string ('1d8').
 *  - v2 → `combat.hitDice` agora pode ser objeto `{ pool: { d6|d8|d10|d12:
 *         { total, used } } }` para suportar HD por classe/multiclasse.
 *         Também introduz `combat.attacks[]` e `combat.concentrating`.
 *  - v3 → `spellcasting.abilitiesByClass` (objeto classIndex → ability key)
 *         para multiclasse híbrida. `combat.classFeatureUses[]` rastreia usos
 *         limitados (Action Surge, Ki, Bardic Inspiration, etc.) com regra de
 *         recarga (short/long/dawn). `info.asiOrFeatByLevel` registra para
 *         cada nível de ASI a escolha do jogador (`asi` ou `feat`).
 *  - v4 → corrige bônus racial de atributo que era descartado na criação
 *         (mismatch nome/abreviação): soma os bônus fixos faltantes em
 *         `attributes` para fichas afetadas (meio-orc, anão, elfo, etc.).
 */
export const SCHEMA_VERSION = 4

/**
 * Limite máximo absoluto (PHB p.13: "ability score maximum is 20" em criação;
 * 30 só é alcançável por efeitos cósmicos como Manual of Bodily Health). Usado
 * apenas como teto de validação tolerante para imports legados — fluxos de UI
 * devem clampar a 20 via `MAX_ATTRIBUTE_VALUE` em `domain/rules.js`.
 */
const HARD_MAX_ABILITY = 30

const abilitiesSchema = z.object({
  str: z.number().int().min(1).max(HARD_MAX_ABILITY),
  dex: z.number().int().min(1).max(HARD_MAX_ABILITY),
  con: z.number().int().min(1).max(HARD_MAX_ABILITY),
  int: z.number().int().min(1).max(HARD_MAX_ABILITY),
  wis: z.number().int().min(1).max(HARD_MAX_ABILITY),
  cha: z.number().int().min(1).max(HARD_MAX_ABILITY),
})

const settingsSchema = z.object({
  allowFeats: z.boolean().default(false),
  allowMulticlass: z.boolean().default(false),
  /**
   * Regras opcionais (Tasha's, etc.). Quando true, `applyRacialChange`
   * aceita um override em `info.racialAsiOverride: { str: 2, con: 1 }`.
   */
  flexibleRacialAsi: z.boolean().default(false),
  /**
   * Fontes de conteúdo ativas na ficha. PHB é implícito; manter sempre
   * presente. Ausência (fichas legadas) = só básico. Ver domain/sources.js.
   */
  sources: z.array(z.string()).default(['phb']),
}).partial().default({})

const metaSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.string().default('1.0'),
  /**
   * Versão do schema do documento. Ausente → assume 1 (legado).
   * Usada por `migrateCharacter` para aplicar migrações incrementais.
   */
  schemaVersion: z.number().int().min(1).default(SCHEMA_VERSION),
  settings: settingsSchema.default({ sources: ['phb'] }),
  creationMethod: z.string().optional(),
}).passthrough()

const multiclassSchema = z.object({
  class: z.string(),
  level: z.number().int().min(1).max(20),
}).passthrough()

/**
 * Para cada ASI/Feat ganho, registra a escolha. PHB p.165: é mutuamente
 * exclusivo (um OU outro).
 *
 * Chave: `"${classIndex}:${classLevel}"` (ex.: "guerreiro:4", "mago:8").
 * ASI é por nível de CLASSE, não nível total — evita colisão em multiclasse
 * quando dois ASIs caem no mesmo nível total combinado.
 *
 * (Compat: chaves antigas como "4" ou "8" — apenas nível total — continuam
 * válidas no schema mas não são geradas mais.)
 */
const asiOrFeatSchema = z.record(z.string(), z.enum(['asi', 'feat']))
  .default({})

const featSchema = z.object({
  index: z.string(),
  name: z.string(),
  /** Nível de personagem em que o feat foi escolhido (rastreabilidade). */
  takenAtLevel: z.number().int().min(1).max(20).optional(),
}).passthrough()

const infoSchema = z.object({
  name: z.string(),
  playerName: z.string().default(''),
  race: z.string().default(''),
  subrace: z.string().default(''),
  class: z.string().default(''),
  subclass: z.string().default(''),
  level: z.number().int().min(1).max(20).default(1),
  multiclasses: z.array(multiclassSchema).default([]),
  chosenFeatures: z.record(z.any()).default({}),
  background: z.string().default(''),
  alignment: z.string().default(''),
  xp: z.number().int().min(0).default(0),
  scoreMethod: z.string().default('manual'),
  feats: z.array(featSchema).default([]),
  asiOrFeatByLevel: asiOrFeatSchema,
  /**
   * Override de ASI racial flexível (Tasha's). Só é aplicado quando
   * `meta.settings.flexibleRacialAsi === true`. Soma deve ser ≤ +3 (+2/+1).
   */
  racialAsiOverride: z.record(z.number().int()).optional(),
}).passthrough()

const hitDicePoolEntrySchema = z.object({
  total: z.number().int().min(0),
  used:  z.number().int().min(0),
}).passthrough()

const concentrationSchema = z.object({
  spellIndex: z.string().nullable().default(null),
  spellName:  z.string().nullable().default(null),
}).passthrough()

/**
 * Uso limitado de feature de classe (PHB cap. 3).
 *
 *  - id          : chave estável (ex.: 'fighter-action-surge', 'monk-ki').
 *  - name        : rótulo PT-BR.
 *  - max         : usos no máximo (recalculado por nível/classe).
 *  - used        : usos consumidos atualmente.
 *  - recharge    : 'short' (descanso curto/longo) | 'long' (só longo) |
 *                  'dawn' (recarga ao amanhecer) | 'manual'.
 *  - source      : classe que concede ('guerreiro', 'monge', ...).
 */
const classFeatureUseSchema = z.object({
  id: z.string(),
  name: z.string(),
  max: z.number().int().min(0),
  used: z.number().int().min(0).default(0),
  recharge: z.enum(['short', 'long', 'dawn', 'manual']).default('long'),
  source: z.string().default(''),
}).passthrough()

const combatSchema = z.object({
  maxHp: z.number().int().min(0),
  currentHp: z.number().int().min(0),
  tempHp: z.number().int().min(0).default(0),
  armorClass: z.number().int().min(0),
  speed: z.number().int().min(0).default(30),
  /**
   * v1 → string (e.g. '1d8').
   * v2+ → { pool: { d8: { total, used }, ... } } — pool por tipo de dado,
   * permitindo multiclasse. `migrateCharacter` v1→v2 converte.
   */
  hitDice: z.union([
    z.string(),
    z.object({
      pool: z.record(z.string(), hitDicePoolEntrySchema).default({}),
    }).passthrough(),
  ]).default('1d8'),
  deathSaves: z.object({
    successes: z.number().int().min(0).max(3).default(0),
    failures:  z.number().int().min(0).max(3).default(0),
  }).default({ successes: 0, failures: 0 }),
  /** PHB p.197: morto após 3 falhas em testes de morte ou massive damage. */
  isDead: z.boolean().default(false),
  /** PHB p.197: estabilizado (a 0 HP, mas não rola testes de morte). */
  isStable: z.boolean().default(false),
  /** PHB p.291: nível de exaustão 0-6. Nível 6 = morte. */
  exhaustion: z.number().int().min(0).max(6).default(0),
  /** PHB p.125: inspiração (vantagem em UMA rolagem). */
  inspiration: z.boolean().default(false),
  /** Condições ativas (PHB Apêndice A): unconscious, prone, charmed, etc. */
  conditions: z.array(z.string()).default([]),
  /** Bárbaro: Rage ativa (PHB p.48). */
  rageActive: z.boolean().default(false),
  /**
   * Druida: Forma Selvagem (PHB p.66). Aceita boolean (legado) ou objeto com
   * dados da besta ativa. Schema solto via passthrough no nível do combat.
   */
  wildShape: z.any().default(false),
  /**
   * Druida: bestas que o personagem já viu e pode assumir via Forma Selvagem
   * (PHB p.66). Guarda o `index` do catálogo wild-shape-beasts-pt.json.
   * Vazio por padrão — druida começa sem nenhuma besta conhecida.
   */
  knownBeasts: z.array(z.string()).default([]),
  /**
   * Ataques registrados na ficha (armas + bônus mágicos). Schema aberto
   * para tolerar dados antigos; campos calculados vêm de `src/utils/attacks`.
   */
  attacks: z.array(z.object({
    id:            z.string(),
    name:          z.string(),
    abilityOverride: z.string().optional(),
    damageDice:    z.string().default('1d4'),
    damageType:    z.string().default(''),
    properties:    z.array(z.string()).default([]),
    proficient:    z.boolean().default(false),
    magicBonus:    z.number().int().default(0),
    versatileDice: z.string().optional(),
    /** Fighting Style aplicável a este ataque (PHB p.72) — escolhido na UI. */
    fightingStyle: z.enum(['archery', 'dueling', 'great-weapon', 'two-weapon', 'none']).default('none'),
    /** Marca golpe off-hand (TWF) para cálculo de dano. */
    offHand:       z.boolean().default(false),
    notes:         z.string().default(''),
  }).passthrough()).default([]),
  /** Magia atualmente em concentração (PHB p.203). Apenas uma por vez. */
  concentrating: concentrationSchema.default({ spellIndex: null, spellName: null }),
  /** Usos limitados de class features (Action Surge, Ki, etc.). */
  classFeatureUses: z.array(classFeatureUseSchema).default([]),
  /**
   * Economia de ação do turno corrente (PHB p.189-193). Ephemeral por
   * turno — resetada pelo botão "↻ Turno" ou descanso curto/longo. Persiste
   * entre reloads pra sobreviver a rolagens em modals/abas.
   *  - action/bonus/reaction: já gastou?
   *  - movementUsed: pés gastos do speed (limpo no reset)
   */
  turnState: z.object({
    actionUsed:    z.boolean().default(false),
    bonusUsed:     z.boolean().default(false),
    reactionUsed:  z.boolean().default(false),
    movementUsed:  z.number().int().min(0).default(0),
  }).default({ actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 }),
  /**
   * Artífice: Infusões (Tasha's, cap. Artífice). `known` guarda os índices das
   * infusões que o personagem conhece; `active` guarda as infundidas
   * atualmente em itens específicos (limitado por nível — ver domain/rules).
   * Vazio por padrão — fichas legadas (sem Artífice) não têm infusões.
   */
  artificerInfusions: z.object({
    known: z.array(z.string()).default([]),
    active: z.array(z.object({
      infusion: z.string(),
      itemId: z.string(),
    })).default([]),
  }).default({ known: [], active: [] }),
}).passthrough()

const proficienciesSchema = z.object({
  savingThrows: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  expertiseSkills: z.array(z.string()).default([]),
  backgroundSkills: z.array(z.string()).default([]),
  armor: z.array(z.string()).default([]),
  weapons: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
}).passthrough()

const spellSchema = z.object({
  index: z.string(),
  name: z.string(),
  level: z.number().int().min(0).max(9),
}).passthrough()

const spellcastingSchema = z.object({
  /**
   * Ability "principal" para a UI (compat). A fonte de verdade em multiclasse
   * é `abilitiesByClass`. Selectors devem cair em abilitiesByClass[primary]
   * quando ambos existem.
   */
  ability: z.string().nullable().default(null),
  /**
   * Mapa classIndex → ability key. Para multiclasse híbrida (Mago+Clérigo),
   * cada classe carrega sua ability de conjuração. Magias guardam `class`
   * para o selector saber qual usar para CD/ataque.
   */
  abilitiesByClass: z.record(z.string()).default({}),
  /**
   * Slots usados por nível de magia. O schema só garante inteiros ≥ 0; o clamp
   * ao MÁXIMO computado (classes/níveis) acontece na leitura, em
   * `clampUsedSlots` (useCharacterCalculations) — não aqui. Um valor acima do
   * máximo persiste no JSONB mas é inócuo (a UI sempre re-clampa ao ler).
   */
  usedSlots: z.record(z.number().int().min(0)).default({}),
  /** Slots de Pact Magic do Bruxo usados (separado de usedSlots). */
  pactSlotsUsed: z.number().int().min(0).default(0),
  /**
   * Grimório do Mago (PHB p.114): magias *conhecidas* mas não necessariamente
   * preparadas. `spells` é o pool universal (preparadas/conhecidas conforme
   * a classe); `spellbook` é apenas o repositório do Mago.
   */
  spellbook: z.array(spellSchema.extend({
    class: z.string().optional(),
  })).default([]),
  spells: z.array(spellSchema.extend({
    /** Classe que dá acesso (importante p/ DC quando multiclasse). */
    class: z.string().optional(),
    /** Marcado como preparado (mago/clérigo/druida/paladino). */
    prepared: z.boolean().optional(),
  })).default([]),
}).passthrough()

const currencySchema = z.object({
  cp: z.number().int().min(0).default(0),
  sp: z.number().int().min(0).default(0),
  ep: z.number().int().min(0).default(0),
  gp: z.number().int().min(0).default(0),
  pp: z.number().int().min(0).default(0),
}).passthrough()

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  qty: z.number().int().min(0).default(1),
  /** Bônus mágico em atributo (ex: Belt of Giant Strength = { str: 21 fixo }). */
  abilityOverride: z.record(z.number().int().min(1).max(HARD_MAX_ABILITY)).optional(),
  abilityBonus:    z.record(z.number().int()).optional(),
}).passthrough()

const inventorySchema = z.object({
  currency: currencySchema,
  items: z.array(itemSchema).default([]),
}).passthrough()

/**
 * Entrada do diário de sessões — uma anotação datada (sessão de jogo,
 * resumo de evento, plano pra próxima vez). Cada entrada tem um id
 * estável (timestamp serve) e título opcional.
 */
const sessionEntrySchema = z.object({
  id: z.string(),
  createdAt: z.number().int(),  // epoch ms
  title: z.string().default(''),
  body: z.string().default(''),
}).passthrough()

const traitsSchema = z.object({
  personalityTraits: z.string().default(''),
  ideals: z.string().default(''),
  bonds: z.string().default(''),
  flaws: z.string().default(''),
  featuresAndTraits: z.string().default(''),
  notes: z.string().default(''),
  /**
   * Diário de sessões — array de anotações datadas. Coexiste com
   * `notes` (textarea livre) — `notes` serve pra info persistente
   * (NPCs/locais/backstory), `sessionEntries` pra crônica por sessão.
   */
  sessionEntries: z.array(sessionEntrySchema).default([]),
}).passthrough()

export const characterSchema = z.object({
  id: z.string().min(1),
  system: z.string().default('dnd5e'),
  // Vínculo com mesa (Postgres `characters.campaign_id`). Null/undefined = pessoal.
  // Exposto via `rowToCharacter` em `storage.js`; persistido fora de `data` no
  // Postgres mas espelhado no objeto pra leitura cliente.
  campaignId: z.string().nullable().optional(),
  // Owner da ficha (Postgres `characters.owner_id`). Read-only no cliente —
  // usado pelo `CharacterSheet` pra detectar "modo leitura" quando DM abre
  // ficha de jogador. Tipado como string em vez de uuid pra tolerar testes
  // e payloads legados.
  ownerId: z.string().nullable().optional(),
  meta: metaSchema,
  info: infoSchema,
  attributes: abilitiesSchema,
  appliedRacialBonuses: z.record(z.number()).default({}),
  combat: combatSchema,
  proficiencies: proficienciesSchema,
  spellcasting: spellcastingSchema,
  inventory: inventorySchema,
  traits: traitsSchema.optional().default({}),
}).passthrough().superRefine((ch, ctx) => {
  // PHB p.15: nível total ≤ 20.
  const primary = ch.info?.level ?? 0
  const mc = (ch.info?.multiclasses ?? []).reduce((s, m) => s + (m.level ?? 0), 0)
  if (primary + mc > 20) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nível total (classe primária + multiclasses) não pode exceder 20',
      path: ['info', 'level'],
    })
  }

  // currentHp não pode exceder maxHp + tempHp (limite lógico).
  const max = ch.combat?.maxHp ?? 0
  const cur = ch.combat?.currentHp ?? 0
  if (cur > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `currentHp (${cur}) não pode exceder maxHp (${max})`,
      path: ['combat', 'currentHp'],
    })
  }

  // Death saves: só fazem sentido com 0 HP.
  // (Permitimos > 0, pois o jogador pode "deixar marcado" entre quedas.)

  // isDead exige currentHp = 0 (não dá pra estar "morto com HP").
  if (ch.combat?.isDead && (ch.combat?.currentHp ?? 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'isDead=true requer currentHp=0',
      path: ['combat', 'isDead'],
    })
  }
  // isStable só faz sentido com 0 HP (estabilizado = caído mas sem rolar).
  if (ch.combat?.isStable && (ch.combat?.currentHp ?? 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'isStable=true requer currentHp=0',
      path: ['combat', 'isStable'],
    })
  }
  // isStable + isDead é incoerente.
  if (ch.combat?.isStable && ch.combat?.isDead) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'isStable e isDead não podem ambos ser true',
      path: ['combat', 'isDead'],
    })
  }

  // Tasha's: soma do override flexível ≤ +3.
  const override = ch.info?.racialAsiOverride
  if (ch.meta?.settings?.flexibleRacialAsi && override) {
    const sum = Object.values(override).reduce((s, v) => s + (Number(v) || 0), 0)
    if (sum > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'racialAsiOverride: soma máxima é +3 (Tasha\'s: +2 e +1)',
        path: ['info', 'racialAsiOverride'],
      })
    }
  }
})

export function parseCharacter(raw) {
  return characterSchema.parse(migrateCharacter(raw))
}

export function safeParseCharacter(raw) {
  return characterSchema.safeParse(migrateCharacter(raw))
}

/**
 * Aplica migrações incrementais entre schemaVersion lido no documento
 * e `SCHEMA_VERSION` atual. Idempotente: se já está na versão atual,
 * devolve o mesmo objeto.
 *
 * Como adicionar uma migração nova:
 *   1. Incremente `SCHEMA_VERSION` para N.
 *   2. Adicione um case para `from === N-1` que produz o formato de N.
 */
export function migrateCharacter(raw) {
  if (!raw || typeof raw !== 'object') return raw
  const current = raw.meta?.schemaVersion ?? 1
  if (current >= SCHEMA_VERSION) return raw

  let doc = raw
  for (let v = current; v < SCHEMA_VERSION; v++) {
    if (typeof console !== 'undefined' && console.info) {
      console.info(`[characterSchema] migrando v${v} → v${v + 1}`)
    }
    if (v === 1) doc = migrateV1ToV2(doc)
    if (v === 2) doc = migrateV2ToV3(doc)
    if (v === 3) doc = migrateV3ToV4(doc)
  }
  return {
    ...doc,
    meta: { ...(doc.meta ?? {}), schemaVersion: SCHEMA_VERSION },
  }
}

/**
 * v1 → v2: converte `combat.hitDice: '1d8'` em `{ pool: { d8: { total, used } } }`.
 * O total vem do nível primário (ou 1 para fichas muito legadas); `used` = 0.
 * Strings malformadas caem em `d8` como fallback seguro.
 * Também garante defaults para `attacks` e `concentrating`.
 */
function migrateV1ToV2(doc) {
  const hd = doc.combat?.hitDice
  const level = doc.info?.level ?? 1
  let poolObj
  if (hd && typeof hd === 'object' && hd.pool) {
    poolObj = hd
  } else if (typeof hd === 'string') {
    const match = hd.match(/d(\d+)/i)
    const die = match ? `d${match[1]}` : 'd8'
    poolObj = { pool: { [die]: { total: Math.max(1, level), used: 0 } } }
  } else {
    poolObj = { pool: { d8: { total: Math.max(1, level), used: 0 } } }
  }
  return {
    ...doc,
    combat: {
      ...(doc.combat ?? {}),
      hitDice: poolObj,
      attacks: doc.combat?.attacks ?? [],
      concentrating: doc.combat?.concentrating ?? { spellIndex: null, spellName: null },
    },
  }
}

/**
 * v2 → v3:
 *  - cria `spellcasting.abilitiesByClass` a partir de `spellcasting.ability`
 *    + classe primária (heurística para fichas single-class antigas);
 *  - inicializa `spellcasting.pactSlotsUsed = 0` se ausente;
 *  - cria `spellcasting.spellbook = []` (não tenta inferir);
 *  - inicializa `combat.classFeatureUses = []`;
 *  - inicializa `info.feats = []` se ausente e `info.asiOrFeatByLevel = {}`.
 */
function migrateV2ToV3(doc) {
  const abilitiesByClass = doc.spellcasting?.abilitiesByClass ?? {}
  const ability = doc.spellcasting?.ability
  const primaryClass = doc.info?.class
  if (ability && primaryClass && !abilitiesByClass[primaryClass]) {
    abilitiesByClass[primaryClass] = String(ability).toLowerCase().slice(0, 3)
  }
  return {
    ...doc,
    info: {
      ...(doc.info ?? {}),
      feats: doc.info?.feats ?? [],
      asiOrFeatByLevel: doc.info?.asiOrFeatByLevel ?? {},
    },
    combat: {
      ...(doc.combat ?? {}),
      classFeatureUses: doc.combat?.classFeatureUses ?? [],
      // Reescreve attacks com defaults de v3.
      attacks: (doc.combat?.attacks ?? []).map(a => ({
        fightingStyle: 'none',
        offHand: false,
        ...a,
      })),
    },
    spellcasting: {
      ...(doc.spellcasting ?? {}),
      abilitiesByClass,
      pactSlotsUsed: doc.spellcasting?.pactSlotsUsed ?? 0,
      spellbook: doc.spellcasting?.spellbook ?? [],
    },
  }
}

/**
 * v3 → v4: corrige bônus racial de atributo que era descartado na criação.
 *
 * `computeBonuses` casava `ability_bonuses` por abreviação ("FOR") enquanto o
 * dado usa nome completo ("Força"), então toda raça padrão (meio-orc, anão,
 * elfo, draconato...) tinha o bônus FIXO silenciosamente perdido. Como os
 * atributos são congelados na criação, fichas antigas precisam ser corrigidas.
 *
 * Soma o que falta entre o bônus fixo esperado e o já aplicado
 * (`appliedRacialBonuses`). Idempotente: depois de aplicar, o aplicado iguala
 * o esperado, e o gate de schemaVersion impede re-execução. Não mexe em
 * escolhas livres (humano variante / meio-elfo) nem subtrai.
 */
// Snapshot CONGELADO dos bônus raciais FIXOS de atributo (SRD PHB), usado só
// pela migração — determinístico, independente do JSON vivo. Variante humano
// (tracos-raciais-alternativos) substitui o +1-em-tudo do humano base por
// escolhas livres, então não soma nada fixo aqui.
const V4_RACE_BONUS = {
  anao: { con: 2 }, elfo: { dex: 2 }, halfling: { dex: 2 },
  humano: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
  draconato: { str: 2, cha: 1 }, gnomo: { int: 2 },
  'meio-elfo': { cha: 2 }, 'meio-orc': { str: 2, con: 1 },
  tiefling: { int: 1, cha: 2 },
}
const V4_SUBRACE_BONUS = {
  'anao-da-colina': { wis: 1 }, 'anao-da-montanha': { str: 2 }, duergar: { str: 1 },
  'alto-elfo': { int: 1 }, 'elfo-da-floresta': { wis: 1 }, 'elfo-negro-drow': { cha: 1 },
  'pes-leves': { cha: 1 }, robusto: { con: 1 },
  'gnomo-da-floresta': { dex: 1 }, 'gnomo-das-rochas': { con: 1 },
}
const V4_VARIANT_HUMAN = 'tracos-raciais-alternativos'

function expectedFixedBonusesV4(race, subrace) {
  if (subrace === V4_VARIANT_HUMAN) return {}   // variante: só escolhas livres
  const out = { ...(V4_RACE_BONUS[race] ?? {}) }
  for (const [k, v] of Object.entries(V4_SUBRACE_BONUS[subrace] ?? {})) {
    out[k] = (out[k] ?? 0) + v
  }
  return out
}

function migrateV3ToV4(doc) {
  const expected = expectedFixedBonusesV4(doc.info?.race, doc.info?.subrace)
  const applied = { ...(doc.appliedRacialBonuses ?? {}) }
  const attrs = { ...(doc.attributes ?? {}) }
  let changed = false

  for (const [key, amount] of Object.entries(expected)) {
    const have = applied[key] ?? 0
    const delta = amount - have
    if (delta > 0) {
      attrs[key] = Math.min(30, (attrs[key] ?? 10) + delta)
      applied[key] = have + delta
      changed = true
    }
  }

  if (!changed) return doc
  return { ...doc, attributes: attrs, appliedRacialBonuses: applied }
}
