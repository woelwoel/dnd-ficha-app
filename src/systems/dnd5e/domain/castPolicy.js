// @ts-check
/**
 * Política de conjuração ESPECIAL de uma magia — o que dá pra gastar pra
 * conjurá-la — somando as duas fontes que fogem do padrão: talento
 * (`featSpells`) e traço racial (`racialSpells`).
 *
 * Nada disso é persistido na magia: a ficha guarda só PROVENIÊNCIA
 * (`featGrants`/`raceGrants`) e a política é resolvida ao vivo. Mudar a
 * declaração muda o comportamento de ficha salva sem migração.
 */
import { getCastPolicy } from './featSpells'
import { RACIAL_SPELL_DEFS, racialTrackerId } from './racialSpells'

/** Uma política por concessão RACIAL da magia. */
function racialParts(spell) {
  const refs = spell?.raceGrants ?? []
  const out = []
  for (const ref of refs) {
    const def = RACIAL_SPELL_DEFS[ref.raceKey]
    const grant = def?.grants?.[ref.grantIdx]
    if (!grant) {
      // `grantIdx` é persistido: editar a declaração pode orfanar ficha salva.
      // Avisa em DEV — throw derrubaria a ficha (isto roda por linha, a cada
      // render).
      if (import.meta.env?.DEV) {
        console.warn(`getSpellCastPolicy: grant racial órfão (${ref.raceKey}#${ref.grantIdx})`)
      }
      continue
    }
    // A raça só TIRA os espaços quando a magia existe apenas por causa dela.
    const slots = !spell.raceCreated
    if (grant.atWill || spell.level === 0) {
      out.push({ slots, atWill: true, ritualOnly: false, freeCast: [] })
      continue
    }
    out.push({
      slots,
      atWill: false,
      ritualOnly: false,
      freeCast: grant.freeCast
        ? [{
            recharge: grant.freeCast,
            trackerId: racialTrackerId(ref.raceKey, spell.index),
            source: 'raca',
            label: def.label,
            castAtLevel: grant.castAtLevel ?? spell.level,
          }]
        : [],
    })
  }
  return out
}

/** Política do talento, normalizada pro mesmo formato (rótulo + origem). */
function featPart(spell, character) {
  const p = getCastPolicy(spell, character)
  if (!p) return null
  const featName = idx => (character?.info?.feats ?? []).find(f => f.index === idx)?.name ?? idx
  return {
    slots: p.slots,
    atWill: p.atWill,
    ritualOnly: p.ritualOnly,
    freeCast: (p.freeCast ?? []).map(fc => ({
      recharge: fc.recharge,
      trackerId: fc.trackerId,
      source: 'feat',
      label: `Talento: ${featName(fc.featIndex)}`,
      castAtLevel: spell.level,
    })),
  }
}

/**
 * União das políticas. `null` quando a magia não tem proveniência especial —
 * o caller usa o comportamento padrão (espaços da classe).
 */
export function getSpellCastPolicy(spell, character) {
  const parts = [featPart(spell, character), ...racialParts(spell)].filter(Boolean)
  if (parts.length === 0) return null
  return {
    slots:      parts.some(p => p.slots),
    atWill:     parts.some(p => p.atWill),
    ritualOnly: parts.every(p => p.ritualOnly),
    freeCast:   parts.flatMap(p => p.freeCast),
  }
}

/**
 * Trackers de conjuração especial (1×/descanso), derivados das magias que a
 * ficha JÁ tem — por isso o rótulo sai do nome da própria magia e o mesmo
 * laço serve talento e raça.
 *
 * Mora fora de `defaultClassFeatureUses` de propósito: `rules.js` é importado
 * por `subclassSpells`, que é importado por `featSpells` — importar a política
 * lá dentro fecharia um ciclo. Quem compõe é a `CharacterSheet`.
 */
export function specialCastingUses(character) {
  const out = []
  for (const spell of character?.spellcasting?.spells ?? []) {
    const policy = getSpellCastPolicy(spell, character)
    for (const fc of policy?.freeCast ?? []) {
      out.push({
        id: fc.trackerId,
        name: `${spell.name} (${fc.label})`,
        max: 1,
        used: 0,
        recharge: fc.recharge,
        source: fc.source,
      })
    }
  }
  return out
}
