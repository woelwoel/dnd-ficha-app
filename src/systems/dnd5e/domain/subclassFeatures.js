// src/systems/dnd5e/domain/subclassFeatures.js

/**
 * Parser das features de subclasse, que vivem como blob de texto na `desc` da
 * opção escolhida (formato `• Nv N — Nome: desc`, 100% consistente em PHB+Tasha).
 * Ver docs/superpowers/specs/2026-06-30-features-subclasse-por-nivel-design.md.
 */
import { getModifier, ATTR_NAME_TO_KEY } from '../utils/calculations'

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

const ATTR_PT = 'Força|Destreza|Constituição|Inteligência|Sabedoria|Carisma'

/**
 * Detecta usos limitados a partir do texto da feature. Conservador de propósito:
 * só padrões de alta confiança; sem match → null (feature só-texto, sem tracker).
 */
export function detectFeatureUses(text = '', { attributes = {}, profBonus = 2 } = {}) {
  const t = String(text)
  // Recarga: "descanso curto" (inclui "curto ou longo") → short; senão long.
  const recharge = /descanso\s+curto/i.test(t) ? 'short' : 'long'
  // Indício de que o número é de USOS (e não dano/alcance/etc.).
  const isUses = /(usos?\s*=|usos?\s+iguais?|igual ao|vezes igual|uma vez)/i.test(t)

  // 1) "1×/descanso..." ou "uma vez ... descanso...": uso único por descanso.
  // Vem ANTES do padrão de bônus de proficiência: um "uma vez por descanso"
  // explícito é evidência mais forte de contagem de usos do que uma menção
  // incidental a "bônus de proficiência" (que muitas vezes é bônus de dano —
  // ex.: Maldição do Hexblade). Evita o falso positivo de max = profBonus.
  if (/1\s*[×x]\s*\/?\s*desc/i.test(t) || /uma vez[\s\S]*?descanso/i.test(t)) {
    return { max: 1, recharge }
  }
  // 2) usos = bônus de proficiência
  if (isUses && /b[oô]nus\s+de\s+profici[êe]ncia/i.test(t)) {
    return { max: Math.max(1, profBonus), recharge }
  }
  // 3) modificador de atributo (com indício de usos)
  const mod = t.match(new RegExp(`m[oó]d(?:ificador)?\\.?\\s+(?:de\\s+)?(${ATTR_PT})`, 'i'))
  if (isUses && mod) {
    const name = mod[1].charAt(0).toUpperCase() + mod[1].slice(1).toLowerCase()
    const key = ATTR_NAME_TO_KEY[name]
    return { max: Math.max(1, getModifier(attributes?.[key] ?? 10)), recharge }
  }
  return null
}

/** Ids de choices que representam SELEÇÃO de subclasse (PHB + Tasha + Artífice). */
export const SUBCLASS_CHOICE_IDS = new Set([
  'primal_path', 'bard_college', 'divine_domain', 'druid_circle',
  'martial_archetype', 'monastic_tradition', 'sacred_oath', 'ranger_archetype',
  'roguish_archetype', 'sorcerous_origin', 'arcane_tradition', 'patron',
  'artificer_specialization',
])

const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/**
 * Cards de feature de subclasse da classe, até `level`. Lê a opção escolhida no
 * catálogo, parseia, filtra por nível e devolve cards com id estável e único.
 * @returns {Array<{id,name,desc,level,source}>}
 */
export function getSubclassFeatureCards({ classIndex, chosenFeatures, classChoices, level, classLabel }) {
  const choices = classChoices?.[classIndex]?.choices ?? []
  const out = []
  for (const ch of choices) {
    if (!SUBCLASS_CHOICE_IDS.has(ch.id)) continue
    const chosen = chosenFeatures?.[ch.id]
    if (!chosen) continue
    const opt = (ch.options ?? []).find(o => o.value === chosen)
    if (!opt) continue
    const { features } = parseSubclassFeatures(opt.desc)
    const seen = {}
    for (const f of features) {
      if (f.level > level) continue
      const name = f.name ?? `${opt.name} (Nv ${f.level})`
      let id = `${classIndex}-sub-${slug(chosen)}-${f.level}-${slug(name)}`
      if (seen[id]) id = `${id}-${(seen[id] += 1)}`   // desempate em colisão
      else seen[id] = 1
      out.push({ id, name, desc: f.desc, level: f.level, source: `${classLabel ?? classIndex} · ${opt.name}` })
    }
  }
  return out
}
