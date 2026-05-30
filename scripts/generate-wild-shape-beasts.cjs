/**
 * Gera `public/srd-data/wild-shape-beasts-pt.json` — catálogo enxuto de
 * bestas SRD adequadas pra Forma Selvagem do Druida (PHB p.66).
 *
 * Filtra `5e-SRD-Monsters.json` por `type === 'beast'` e CR ≤ 1 (limite
 * do druida fora do Círculo da Lua é CR 1 a partir do nv 8). Traduz
 * nomes pra PT-BR usando o dicionário inline. Mantém só os campos que
 * o painel precisa.
 *
 * Run: node scripts/generate-wild-shape-beasts.cjs
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'public', 'srd-data', '5e-SRD-Monsters.json')
const OUT = path.join(__dirname, '..', 'public', 'srd-data', 'wild-shape-beasts-pt.json')

// PT-BR ← EN. Cobre todas as bestas SRD CR ≤ 1. Bestas com nome ausente
// ficam com nome em inglês + log de aviso.
const NAME_PT = {
  'Ape':              'Macaco',
  'Axe Beak':         'Bico-Machado',
  'Baboon':           'Babuíno',
  'Badger':           'Texugo',
  'Bat':              'Morcego',
  'Black Bear':       'Urso Negro',
  'Blood Hawk':       'Falcão Sanguíneo',
  'Boar':             'Javali',
  'Brown Bear':       'Urso Pardo',
  'Camel':            'Camelo',
  'Cat':              'Gato',
  'Constrictor Snake':'Cobra Constritora',
  'Crab':             'Caranguejo',
  'Crocodile':        'Crocodilo',
  'Deer':             'Cervo',
  'Dire Wolf':        'Lobo Atroz',
  'Draft Horse':      'Cavalo de Carga',
  'Eagle':            'Águia',
  'Elk':              'Alce',
  'Flying Snake':     'Cobra Voadora',
  'Frog':             'Sapo',
  'Giant Badger':     'Texugo Gigante',
  'Giant Bat':        'Morcego Gigante',
  'Giant Centipede':  'Centopeia Gigante',
  'Giant Crab':       'Caranguejo Gigante',
  'Giant Eagle':      'Águia Gigante',
  'Giant Fire Beetle':'Besouro de Fogo Gigante',
  'Giant Frog':       'Sapo Gigante',
  'Giant Goat':       'Cabra Gigante',
  'Giant Hyena':      'Hiena Gigante',
  'Giant Lizard':     'Lagarto Gigante',
  'Giant Octopus':    'Polvo Gigante',
  'Giant Owl':        'Coruja Gigante',
  'Giant Poisonous Snake': 'Cobra Peçonhenta Gigante',
  'Giant Rat':        'Rato Gigante',
  'Giant Sea Horse':  'Cavalo-Marinho Gigante',
  'Giant Spider':     'Aranha Gigante',
  'Giant Toad':       'Sapo-Gigante',
  'Giant Vulture':    'Abutre Gigante',
  'Giant Wasp':       'Vespa Gigante',
  'Giant Weasel':     'Doninha Gigante',
  'Giant Wolf Spider':'Aranha-Lobo Gigante',
  'Goat':             'Cabra',
  'Hawk':             'Falcão',
  'Hyena':            'Hiena',
  'Jackal':           'Chacal',
  'Lion':             'Leão',
  'Lizard':           'Lagarto',
  'Mastiff':          'Mastim',
  'Mule':             'Mula',
  'Octopus':          'Polvo',
  'Owl':              'Coruja',
  'Panther':          'Pantera',
  'Pony':             'Pônei',
  'Poisonous Snake':  'Cobra Peçonhenta',
  'Quipper':          'Quipper',
  'Rat':              'Rato',
  'Raven':            'Corvo',
  'Reef Shark':       'Tubarão de Recife',
  'Riding Horse':     'Cavalo de Montaria',
  'Scorpion':         'Escorpião',
  'Sea Horse':        'Cavalo-Marinho',
  'Spider':           'Aranha',
  'Swarm of Bats':    'Enxame de Morcegos',
  'Swarm of Rats':    'Enxame de Ratos',
  'Swarm of Ravens':  'Enxame de Corvos',
  'Tiger':            'Tigre',
  'Vulture':          'Abutre',
  'Warhorse':         'Cavalo de Guerra',
  'Weasel':           'Doninha',
  'Wolf':             'Lobo',
  'Giant Rat (Diseased)': 'Rato Gigante (Doente)',
  'Stirge':           'Estirge',
}

// Velocidades EN → PT
const SPEED_PT = {
  walk:   'caminhar',
  fly:    'voar',
  swim:   'nadar',
  climb:  'escalar',
  burrow: 'cavar',
}

const DAMAGE_PT = {
  bludgeoning: 'concussão',
  piercing:    'perfuração',
  slashing:    'corte',
  acid:        'ácido',
  cold:        'frio',
  fire:        'fogo',
  poison:      'veneno',
  thunder:     'trovão',
  lightning:   'elétrico',
  radiant:     'radiante',
  necrotic:    'necrótico',
  psychic:     'psíquico',
  force:       'força',
}

const SIZE_PT = {
  Tiny:       'Minúsculo',
  Small:      'Pequeno',
  Medium:     'Médio',
  Large:      'Grande',
  Huge:       'Enorme',
  Gargantuan: 'Colossal',
}

/** Normaliza CR (0.125, 0.25, 0.5, 1, ...) em string fração legível. */
function crLabel(cr) {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25)  return '1/4'
  if (cr === 0.5)   return '1/2'
  return String(cr)
}

/** Parse velocidade "40 ft." → 12 (metros). 1 ft ≈ 0.3 m, mas D&D PT-BR
 *  geralmente usa 1.5m por casa de 5ft. Mantemos string original + valor numérico em pés. */
function parseSpeedFt(s) {
  if (!s) return 0
  const m = String(s).match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

function translateSpeed(speedObj) {
  const out = {}
  for (const [k, v] of Object.entries(speedObj || {})) {
    const ft = parseSpeedFt(v)
    out[k] = { ft, m: Math.round(ft * 0.3), label: SPEED_PT[k] ?? k }
  }
  return out
}

function translateAttacks(actions) {
  if (!Array.isArray(actions)) return []
  return actions
    .filter(a => a.attack_bonus != null && Array.isArray(a.damage) && a.damage.length > 0)
    .map(a => {
      const dmg = a.damage[0]
      const dmgTypeEn = dmg?.damage_type?.index ?? 'bludgeoning'
      return {
        name: a.name,
        attackBonus: a.attack_bonus,
        damageDice: dmg.damage_dice,
        damageType: DAMAGE_PT[dmgTypeEn] ?? dmgTypeEn,
        desc: a.desc, // mantém em EN; tradução completa seria grande
      }
    })
}

function translateTraits(specials) {
  if (!Array.isArray(specials)) return []
  return specials.map(t => ({ name: t.name, desc: t.desc }))
}

function reach(beast) {
  // Maioria das bestas tem reach 5ft, exceto algumas (giant ape, etc.)
  // Não está estruturado no JSON; deixamos null se não detectar.
  return null
}

function main() {
  const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'))
  const beasts = raw.filter(m => m.type === 'beast' && m.challenge_rating <= 1)
  const missing = []

  const out = beasts.map(b => {
    const name = NAME_PT[b.name] ?? b.name
    if (!NAME_PT[b.name]) missing.push(b.name)
    const ac = Array.isArray(b.armor_class) && b.armor_class[0]
      ? b.armor_class[0].value
      : (typeof b.armor_class === 'number' ? b.armor_class : 10)

    return {
      index:           b.index,
      name,
      nameEn:          b.name,
      cr:              b.challenge_rating,
      crLabel:         crLabel(b.challenge_rating),
      size:            SIZE_PT[b.size] ?? b.size,
      ac,
      hp:              b.hit_points,
      hitDice:         b.hit_points_roll ?? b.hit_dice,
      speed:           translateSpeed(b.speed),
      // Atributos da besta — usados no stat block
      str: b.strength, dex: b.dexterity, con: b.constitution,
      int: b.intelligence, wis: b.wisdom, cha: b.charisma,
      senses:          b.senses ?? {},
      // Resistências/imunidades (raras em bestas mas existem)
      damageResistances: b.damage_resistances ?? [],
      damageImmunities:  b.damage_immunities ?? [],
      conditionImmunities: (b.condition_immunities ?? []).map(c => c.name ?? c),
      attacks:         translateAttacks(b.actions),
      traits:          translateTraits(b.special_abilities),
    }
  })

  // Ordena por CR asc, depois nome
  out.sort((a, b) => a.cr - b.cr || a.name.localeCompare(b.name, 'pt-BR'))

  fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), beasts: out }, null, 2), 'utf8')
  console.log(`✓ ${out.length} bestas escritas em ${path.relative(process.cwd(), OUT)}`)
  if (missing.length) {
    console.warn(`⚠ Sem tradução PT-BR (${missing.length}):`, missing.join(', '))
  }
}

main()
