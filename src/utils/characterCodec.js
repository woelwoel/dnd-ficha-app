// src/utils/characterCodec.js
// Camada de dispatch: a casca valida só o envelope e delega o corpo da ficha
// pro módulo do sistema. Mantém storage.js agnóstico a sistema.
import { getSystemCore } from '../systems'
import { parseEnvelope, systemOf } from '../systems/envelope'

/**
 * Valida uma ficha crua escolhendo o validador pelo `system`. Mesma forma de
 * retorno do zod safeParse: { success, data } | { success:false, error }.
 * Sistema não registrado → failure graciosa (caller trata como ficha rejeitada
 * via reportError; não derruba a lista).
 */
export function parseCharacterDispatch(raw) {
  const env = parseEnvelope(raw)
  if (!env.success) return env

  const sys = systemOf(raw)
  const core = getSystemCore(sys)
  if (!core) {
    return {
      success: false,
      error: { issues: [{ path: ['system'], message: `sistema não registrado: ${sys}` }] },
    }
  }
  return core.parseCharacter(raw)
}

/** Migração incremental escolhida pelo sistema. Desconhecido → raw intocado. */
export function migrateCharacterDispatch(raw) {
  const core = getSystemCore(systemOf(raw))
  return core ? core.migrate(raw) : raw
}
