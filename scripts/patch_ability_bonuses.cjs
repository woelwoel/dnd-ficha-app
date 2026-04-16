/**
 * Preenche os ability_bonuses das raças e sub-raças com os valores
 * corretos do D&D 5e SRD. Os JSONs da extração PDF vieram com arrays vazios.
 *
 * Uso: node scripts/patch_ability_bonuses.cjs
 */

const fs   = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'public', 'srd-data', 'phb-races-pt.json')
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))

/* ── Bônus de atributo por raça (base) ─────────────────────────────── */
const RACE_BONUSES = {
  'anao':     [{ ability: 'Constituição', bonus: 2 }],
  'elfo':     [{ ability: 'Destreza',     bonus: 2 }],
  'halfling': [{ ability: 'Destreza',     bonus: 2 }],
  'humano':   [
    { ability: 'Força',         bonus: 1 },
    { ability: 'Destreza',      bonus: 1 },
    { ability: 'Constituição',  bonus: 1 },
    { ability: 'Inteligência',  bonus: 1 },
    { ability: 'Sabedoria',     bonus: 1 },
    { ability: 'Carisma',       bonus: 1 },
  ],
  'gnomo':    [{ ability: 'Inteligência', bonus: 2 }],
  // draconato, meio-elfo, meio-orc, tiefling já têm bonuses corretos
}

/* ── Bônus de atributo por sub-raça ────────────────────────────────── */
const SUBRACE_BONUSES = {
  'anao-da-colina':    [{ ability: 'Sabedoria',    bonus: 1 }],
  'anao-da-montanha':  [{ ability: 'Força',         bonus: 2 }],
  'duergar':           [{ ability: 'Força',         bonus: 1 }],
  'alto-elfo':         [{ ability: 'Inteligência',  bonus: 1 }],
  'elfo-da-floresta':  [{ ability: 'Sabedoria',     bonus: 1 }],
  'elfo-negro':        [{ ability: 'Carisma',       bonus: 1 }],
  // halfling: Pés Leves e Robusto
  'pes-leves':         [{ ability: 'Carisma',       bonus: 1 }],
  'robusto':           [{ ability: 'Constituição',  bonus: 1 }],
  // humano variante: +1 em 2 atributos à escolha do jogador
  'humano-variante':   [{ ability: '2 à escolha',   bonus: 1 }],
  // gnomo
  'gnomo-da-floresta': [{ ability: 'Destreza',      bonus: 1 }],
  'gnomo-das-rochas':  [{ ability: 'Constituição',  bonus: 1 }],
}

let racePatched    = 0
let subracePatched = 0

const updated = data.map(race => {
  // Patch raça base
  if (RACE_BONUSES[race.index] && race.ability_bonuses.length === 0) {
    race.ability_bonuses = RACE_BONUSES[race.index]
    racePatched++
  }

  // Patch sub-raças
  if (race.subraces?.length) {
    race.subraces = race.subraces.map(sr => {
      // Tenta match exato pelo index, depois pelo index sem prefixo de raça
      const key = Object.keys(SUBRACE_BONUSES).find(k =>
        sr.index === k || sr.index.endsWith(k) || sr.index.includes(k)
      )
      if (key && sr.ability_bonuses.length === 0) {
        sr.ability_bonuses = SUBRACE_BONUSES[key]
        subracePatched++
      }
      return sr
    })
  }

  return race
})

fs.writeFileSync(FILE, JSON.stringify(updated, null, 2), 'utf8')
console.log(`✓ Raças patchadas: ${racePatched}`)
console.log(`✓ Sub-raças patchadas: ${subracePatched}`)
console.log('Resultado:')
updated.forEach(r => {
  const b = r.ability_bonuses.map(x => `+${x.bonus} ${x.ability}`).join(', ') || '(mantido)'
  console.log(`  ${r.name}: ${b}`)
  r.subraces?.forEach(sr => {
    const sb = sr.ability_bonuses.map(x => `+${x.bonus} ${x.ability}`).join(', ') || '(sem patch)'
    console.log(`    └ ${sr.name}: ${sb}`)
  })
})
