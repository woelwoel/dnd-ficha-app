// src/systems/envelope.js
import { z } from 'zod'

/** Sistema assumido quando uma ficha não declara `system` (fichas legadas). */
export const DEFAULT_SYSTEM = 'dnd5e'

/**
 * Schema do "envelope": os campos que a casca conhece de QUALQUER ficha,
 * independente do sistema. O corpo específico (atributos, combate, magias) é
 * validado pelo módulo do sistema via getSystemCore(system).parseCharacter.
 * passthrough() preserva o corpo intacto.
 */
const envelopeSchema = z.object({
  id: z.string(),
  system: z.string().default(DEFAULT_SYSTEM),
  meta: z.object({}).passthrough().optional(),
  ownerId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  shortId: z.string().nullable().optional(),
  lastOpenedAt: z.number().nullable().optional(),
  version: z.number().nullable().optional(),
}).passthrough()

export function parseEnvelope(raw) {
  return envelopeSchema.safeParse(raw)
}

/** Lê o sistema de um objeto cru, caindo no default quando ausente/inválido. */
export function systemOf(raw) {
  return (raw && typeof raw.system === 'string' && raw.system) || DEFAULT_SYSTEM
}
