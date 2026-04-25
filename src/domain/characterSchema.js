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
 */
export const SCHEMA_VERSION = 3

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
  settings: settingsSchema.optional(),
  creationMethod: z.string().optional(),
}).passthrough()

const multiclassSchema = z.object({
  class: z.string(),
  level: z.number().int().min(1).max(20),
}).passthrough()

/**
 * Para cada nível com ASI/Feat (4, 8, 12, 16, 19 + variantes de classe),
 * registra a escolha. PHB p.165: é mutuamente exclusivo (um OU outro).
 * Chave = nível em que ocorreu, valor = 'asi' | 'feat'.
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
   * Slots usados por nível de magia. Validado em `safeParseCharacter` contra
   * o máximo computado a partir de classes/níveis.
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

const traitsSchema = z.object({
  personalityTraits: z.string().default(''),
  ideals: z.string().default(''),
  bonds: z.string().default(''),
  flaws: z.string().default(''),
  featuresAndTraits: z.string().default(''),
  notes: z.string().default(''),
}).passthrough()

export const characterSchema = z.object({
  id: z.string().min(1),
  meta: metaSchema,
  info: infoSchema,
  attributes: abilitiesSchema,
  appliedRacialBonuses: z.record(z.number()).default({}),
  combat: combatSchema,
  proficiencies: proficienciesSchema,
  spellcasting: spellcastingSchema,
  inventory: inventorySchema,
  traits: traitsSchema,
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
