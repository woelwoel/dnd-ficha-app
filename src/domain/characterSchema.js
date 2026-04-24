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
 */
export const SCHEMA_VERSION = 2

const abilitiesSchema = z.object({
  str: z.number().int().min(1).max(30),
  dex: z.number().int().min(1).max(30),
  con: z.number().int().min(1).max(30),
  int: z.number().int().min(1).max(30),
  wis: z.number().int().min(1).max(30),
  cha: z.number().int().min(1).max(30),
})

const settingsSchema = z.object({
  allowFeats: z.boolean().default(false),
  allowMulticlass: z.boolean().default(false),
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
}).passthrough()

const hitDicePoolEntrySchema = z.object({
  total: z.number().int().min(0),
  used:  z.number().int().min(0),
}).passthrough()

const concentrationSchema = z.object({
  spellIndex: z.string().nullable().default(null),
  spellName:  z.string().nullable().default(null),
}).passthrough()

const combatSchema = z.object({
  maxHp: z.number().int().min(0),
  currentHp: z.number().int().min(0),
  tempHp: z.number().int().min(0).default(0),
  armorClass: z.number().int().min(0),
  speed: z.number().int().min(0).default(30),
  /**
   * v1 → string (e.g. '1d8').
   * v2 → { pool: { d8: { total, used }, ... } } — pool por tipo de dado,
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
    notes:         z.string().default(''),
  }).passthrough()).default([]),
  /** Magia atualmente em concentração (PHB p.203). */
  concentrating: concentrationSchema.default({ spellIndex: null, spellName: null }),
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
  ability: z.string().nullable().default(null),
  usedSlots: z.record(z.number().int().min(0)).default({}),
  spells: z.array(spellSchema).default([]),
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
}).passthrough().refine(
  // PHB p.15: nível de personagem é limitado a 20 no total (primário + multiclasses).
  ch => {
    const primary = ch.info?.level ?? 0
    const mc = (ch.info?.multiclasses ?? []).reduce((s, m) => s + (m.level ?? 0), 0)
    return primary + mc <= 20
  },
  { message: 'Nível total (classe primária + multiclasses) não pode exceder 20', path: ['info', 'level'] },
)

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
    console.info(`[characterSchema] migrando v${v} → v${v + 1}`)
    if (v === 1) doc = migrateV1ToV2(doc)
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
    poolObj = hd // já é v2 (idempotente)
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
