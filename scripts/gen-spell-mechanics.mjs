// Gerador do spell-mechanics-pt.json.
//
//   node scripts/gen-spell-mechanics.mjs --draft   # rascunho one-shot (recusa
//                                                  # sobrescrever; --force ignora)
//   node scripts/gen-spell-mechanics.mjs --check   # guard-rail: lista magias
//                                                  # roláveis sem curadoria (exit 1)
//
// O rascunho marca cada entrada com "_draft": true — a CURADORIA remove o
// marcador depois de conferir a entrada contra a prosa (fonte da verdade).
// Depois de curado, o JSON é editado À MÃO; --draft não re-roda por cima.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { keyFromName } from '../src/systems/dnd5e/domain/attributes.js'

const DATA_DIR = 'public/srd-data'
const OUT = `${DATA_DIR}/spell-mechanics-pt.json`

/* ── Heurística de detecção (usada pelo --check E pelo teste unitário) ── */
const DICE_RE = /\d*d\d+/i

export function looksRollable(spell) {
  const text = `${spell.desc ?? ''}\n${spell.higher_level ?? ''}`
  return DICE_RE.test(text)
}

/** Magias roláveis sem entrada no mechanics nem no _ignore. */
export function findUncovered(spells, mechanics) {
  const ignore = new Set(mechanics?._ignore ?? [])
  return spells
    .filter(s => looksRollable(s))
    .filter(s => !mechanics?.[s.index] && !ignore.has(s.index))
    .map(s => s.index)
}

/** Todas as fontes de magia PT presentes (futuras fontes entram sozinhas). */
export function loadSpellSources(dir = DATA_DIR) {
  return readdirSync(dir)
    .filter(f => /-spells-pt\.json$/.test(f))
    .flatMap(f => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))
}

/* ── Rascunho por heurística (só bootstrap; curadoria confere tudo) ──── */
function draftEntry(spell) {
  const desc = spell.desc ?? ''
  const higher = spell.higher_level ?? ''
  const text = `${desc}\n${higher}`
  const entry = {}

  if (/ataque de magia/i.test(text)) entry.attack = true

  const save = text.match(/testes? de resist[êe]ncia de (Força|Destreza|Constituição|Inteligência|Sabedoria|Carisma)/i)
  if (save) {
    entry.save = {
      ability: keyFromName(save[1][0].toUpperCase() + save[1].slice(1).toLowerCase()),
      halfOnSuccess: /metade d(?:esse|o) dano/i.test(text),
    }
  }

  const damage = []
  for (const m of desc.matchAll(/(\d*d\d+(?:\s*\+\s*\d+)?)\s*(?:pontos\s+)?de dano(?:\s+(?:de\s+)?([a-zà-úç]+))?/gi)) {
    damage.push({ dice: m[1].replace(/\s+/g, ''), type: (m[2] ?? '').toLowerCase() })
  }
  if (damage.length) entry.damage = damage

  const heal = desc.match(/recupera[^.]*?(\d*d\d+(?:\s*\+\s*\d+)?)[^.]*?pontos de vida/i)
  if (heal) {
    entry.heal = {
      dice: heal[1].replace(/\s+/g, ''),
      addMod: /modificador de (?:sua )?habilidade de conjura[çc][ãa]o/i.test(desc),
    }
  }

  const up = higher.match(/aumenta(?:m)? em (\d*d\d+(?:\+\d+)?)/i)
  if (up) entry.upcast = { perSlot: up[1] }

  if (spell.level === 0 && /5º n[íi]vel/i.test(text)) entry.cantripScaling = true

  entry._draft = true
  return entry
}

/* ── CLI ─────────────────────────────────────────────────────────────── */
function main() {
  const args = process.argv.slice(2)
  const spells = loadSpellSources()

  if (args.includes('--check')) {
    const mech = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
    const uncovered = findUncovered(spells, mech)
    if (uncovered.length) {
      console.error(`Magias rolaveis sem curadoria (${uncovered.length}) — adicione ao mechanics ou ao _ignore:\n` + uncovered.join('\n'))
      process.exit(1)
    }
    console.log('OK: todas as magias rolaveis estao curadas ou ignoradas.')
    return
  }

  if (args.includes('--draft')) {
    if (existsSync(OUT) && !args.includes('--force')) {
      console.error(`${OUT} ja existe — curadoria manual seria perdida. Use --force se souber o que esta fazendo.`)
      process.exit(1)
    }
    const out = { _ignore: [] }
    for (const s of spells.filter(looksRollable)) out[s.index] = draftEntry(s)
    writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
    console.log(`OK: rascunho com ${Object.keys(out).length - 1} entradas em ${OUT}`)
    return
  }

  console.log('Uso: node scripts/gen-spell-mechanics.mjs --draft | --check')
}

const isCli = process.argv[1]?.endsWith('gen-spell-mechanics.mjs')
if (isCli) main()
