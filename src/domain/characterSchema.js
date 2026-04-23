/**
 * Schema Zod para validar personagens ao carregar/importar.
 * Passthrough em objetos intermediários para tolerar campos extras
 * (e.g., campos adicionados em versões futuras que ainda não migraram).
 */

import { z } from 'zod'

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

const combatSchema = z.object({
  maxHp: z.number().int().min(0),
  currentHp: z.number().int().min(0),
  tempHp: z.number().int().min(0).default(0),
  armorClass: z.number().int().min(0),
  speed: z.number().int().min(0).default(30),
  hitDice: z.string().default('1d8'),
  deathSaves: z.object({
    successes: z.number().int().min(0).max(3).default(0),
    failures:  z.number().int().min(0).max(3).default(0),
  }).default({ successes: 0, failures: 0 }),
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
}).passthrough()

export function parseCharacter(raw) {
  return characterSchema.parse(raw)
}

export function safeParseCharacter(raw) {
  return characterSchema.safeParse(raw)
}
