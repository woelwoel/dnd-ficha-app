// src/systems/dnd5e/domain/subclassFeatures.js

/**
 * Parser das features de subclasse, que vivem como blob de texto na `desc` da
 * opção escolhida (formato `• Nv N — Nome: desc`, 100% consistente em PHB+Tasha).
 * Ver docs/superpowers/specs/2026-06-30-features-subclasse-por-nivel-design.md.
 */

/**
 * Texto antes desta marca = flavor da subclasse; depois = bullets por nível.
 * Aceita variantes com qualificador entre "Features" e "por nível", ex.:
 * "Features de Domínio por nível:", "Features de Juramento por nível:",
 * "Features de Patrono por nível:".
 */
const SECTION_MARKER = /Features?(?:\s+de\s+\S+)?\s+por\s+n[íi]vel\s*:?/i

// "Nv 6 — resto" / "Nível 6 - resto" (aceita travessão —, – ou -).
const BULLET_HEAD = /^N(?:v|ível)\s*(\d+)\s*[—–-]\s*([\s\S]*)$/i

// "Nome: desc" com Nome curto e sem ponto no meio (formato PHB limpo).
const NAMED = /^([^:.]{1,40}):\s*([\s\S]+)$/

export function parseSubclassFeatures(optionDesc = '') {
  const text = String(optionDesc)
  const m = text.match(SECTION_MARKER)
  const summary = (m ? text.slice(0, m.index) : text).trim()
  const body = m ? text.slice(m.index + m[0].length) : ''

  const features = []
  for (const chunk of body.split('•').map(s => s.trim()).filter(Boolean)) {
    const head = chunk.match(BULLET_HEAD)
    if (!head) continue
    const level = Number(head[1])
    const rest = head[2].trim()
    const named = rest.match(NAMED)
    if (named) {
      features.push({ level, name: named[1].trim(), desc: named[2].trim() })
    } else {
      features.push({ level, name: null, desc: rest })
    }
  }
  return { summary, features }
}
