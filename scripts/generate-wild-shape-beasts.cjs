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

// Nomes de ataque comuns (PT-BR)
const ATTACK_NAME_PT = {
  'Bite':           'Mordida',
  'Claw':           'Garras',
  'Claws':          'Garras',
  'Beak':           'Bicada',
  'Talons':         'Garras',
  'Gore':           'Chifrada',
  'Tusk':           'Presa',
  'Tusks':          'Presas',
  'Hooves':         'Cascos',
  'Sting':          'Ferrão',
  'Constrict':      'Constrição',
  'Tentacles':      'Tentáculos',
  'Ram':            'Investida',
  'Swarm of Bites': 'Enxame de Mordidas',
  'Bites':          'Mordidas',
  'Proboscis':      'Probóscide',
  'Blood Drain':    'Drenar Sangue',
  'Pincer':         'Pinça',
}

/** Traduz descrição de ataque do SRD com regex. Pattern padrão:
 *  "Melee/Ranged Weapon Attack: +X to hit, reach Y ft. (or range Y/Z ft.), one target. Hit: N (Xdy+z) TYPE damage. [extra clauses]"
 */
function translateAttackDesc(desc) {
  if (!desc) return ''
  let s = desc

  // Cabeçalho
  s = s.replace(/Melee Weapon Attack:/g,  'Ataque corpo a corpo:')
  s = s.replace(/Ranged Weapon Attack:/g, 'Ataque à distância:')
  s = s.replace(/Melee or Ranged Weapon Attack:/g, 'Ataque corpo a corpo ou à distância:')

  // "+X to hit"
  s = s.replace(/\+(\d+) to hit/g, '+$1 pra acertar')

  // "reach 5 ft."
  s = s.replace(/reach (\d+) ft\./g, 'alcance $1 pés')

  // "range 30/120 ft."
  s = s.replace(/range (\d+)\/(\d+) ft\./g, 'distância $1/$2 pés')
  s = s.replace(/range (\d+) ft\./g, 'distância $1 pés')

  // "one target", "one creature" — \b pra não casar com final de "prone" etc.
  s = s.replace(/\bone target\b/g, 'um alvo')
  s = s.replace(/\bone creature\b/g, 'uma criatura')
  s = s.replace(/\bone prone creature\b/g, 'uma criatura caída')
  s = s.replace(/\bcreature\b/g, 'criatura')

  // "Hit: N (XdY+Z) TYPE damage"
  s = s.replace(/Hit: (\d+) \(([^)]+)\) (\w+) damage/g, (_, n, dice, type) => {
    const pt = DAMAGE_PT[type.toLowerCase()] ?? type
    return `Acerto: ${n} (${dice}) de dano ${pt}`
  })
  // "Hit: N TYPE damage" (sem dados — dano fixo, ex: Polvo)
  s = s.replace(/Hit: (\d+) (\w+) damage/g, (_, n, type) => {
    const pt = DAMAGE_PT[type.toLowerCase()] ?? type
    return `Acerto: ${n} de dano ${pt}`
  })

  // "+N (XdY+Z) TYPE damage" (segunda parcela, ex: lobo morde + arrasto)
  s = s.replace(/plus (\d+) \(([^)]+)\) (\w+) damage/g, (_, n, dice, type) => {
    const pt = DAMAGE_PT[type.toLowerCase()] ?? type
    return `mais ${n} (${dice}) de dano ${pt}`
  })

  // Saving throws
  s = s.replace(/DC (\d+) Strength saving throw/g,    'TR de Força CD $1')
  s = s.replace(/DC (\d+) Dexterity saving throw/g,   'TR de Destreza CD $1')
  s = s.replace(/DC (\d+) Constitution saving throw/g,'TR de Constituição CD $1')
  s = s.replace(/DC (\d+) Wisdom saving throw/g,      'TR de Sabedoria CD $1')
  s = s.replace(/DC (\d+) Intelligence saving throw/g,'TR de Inteligência CD $1')
  s = s.replace(/DC (\d+) Charisma saving throw/g,    'TR de Carisma CD $1')

  // Condições comuns
  s = s.replace(/be knocked prone/g, 'cair caída')
  s = s.replace(/knocked prone/g,    'caída')
  s = s.replace(/be (?:grappled|grabbed)/g, 'ficar agarrada')
  s = s.replace(/be poisoned/g,      'ficar envenenada')
  s = s.replace(/be restrained/g,    'ficar restringida')
  s = s.replace(/be paralyzed/g,     'ficar paralisada')
  s = s.replace(/be blinded/g,       'ficar cega')
  s = s.replace(/be stunned/g,       'ficar atordoada')
  s = s.replace(/be frightened/g,    'ficar amedrontada')
  s = s.replace(/be charmed/g,       'ficar enfeitiçada')
  s = s.replace(/be swallowed/g,     'ser engolida')

  // Frases comuns — note: "succeed on a" captura o "a" pra não sobrar.
  s = s.replace(/If the target is a creature,? it must succeed on a /g,
    'Se o alvo for uma criatura, ele precisa passar em ')
  s = s.replace(/must succeed on a /g, 'precisa passar em ')
  s = s.replace(/On a failed save,?/g, 'Em falha,')
  s = s.replace(/On a successful save,?/g, 'Em sucesso,')
  s = s.replace(/On a success,?/g, 'Em sucesso,')
  s = s.replace(/or take/g, 'ou sofrer')
  s = s.replace(/until the (?:grapple|grab) ends/g, 'até o agarre terminar')
  s = s.replace(/escape DC (\d+)/g, 'CD pra escapar $1')

  // Limpa "the X" em casos comuns (substantivos) — sempre vira "não pode".
  // Trata variantes de apostrofe (' reto e ' curvo) com classe de caracteres.
  s = s.replace(/the \w+ can['']?t/g, 'não pode')
  s = s.replace(/the \w+ cannot/g, 'não pode')
  s = s.replace(/it can['']?t/g, 'não pode')
  s = s.replace(/it cannot/g, 'não pode')

  // Agarre / restringir — primeiro a frase completa, depois conectores
  // IMPORTANTE: este bloco precisa rodar ANTES do "the X can" mais genérico,
  // se não o "can't ... another target" some.
  s = s.replace(/the \w+ can'?t (\w+) another target/g, 'não pode usar essa habilidade em outro alvo')
  s = s.replace(/it can'?t (\w+) another target/g, 'não pode usar essa habilidade em outro alvo')
  s = s.replace(/is grappled \(escape DC (\d+)\)/g, 'fica agarrada (CD pra escapar $1)')
  s = s.replace(/the target is grappled \(escape DC (\d+)\)/g, 'o alvo fica agarrado (CD pra escapar $1)')
  s = s.replace(/is grappled/g, 'fica agarrada')
  s = s.replace(/Until this grapple ends,?/g, 'Enquanto agarrada,')
  s = s.replace(/the (?:creature|target) is restrained/g, 'o alvo fica restringido')
  s = s.replace(/is restrained/g, 'fica restringido')
  s = s.replace(/If the target is a creature,?/g, 'Se o alvo for criatura,')
  s = s.replace(/If it is a creature,?/g, 'Se for criatura,')

  // Padrões multi-cláusula (saves com efeito + dano)
  s = s.replace(/must make a /g, 'precisa fazer um ')
  s = s.replace(/taking (\d+) \(([^)]+)\) (\w+) damage on a failed save/g,
    (_, n, dice, type) => `sofrendo ${n} (${dice}) de dano ${DAMAGE_PT[type.toLowerCase()] ?? type} em falha`)
  s = s.replace(/half as much damage on a successful one/g, 'metade do dano em sucesso')
  s = s.replace(/half as much damage/g, 'metade do dano')
  s = s.replace(/to 0 hit points/g, 'a 0 PV')
  s = s.replace(/hit points/g, 'PV')
  s = s.replace(/regaining (\w+)/g, 'recuperar $1')
  s = s.replace(/is stable but poisoned/g, 'fica estabilizada mas envenenada')
  s = s.replace(/is paralyzed while poisoned in this way/g, 'fica paralisada enquanto envenenada dessa forma')
  s = s.replace(/even after/g, 'mesmo após')
  s = s.replace(/for (\d+) hour/g, 'por $1 hora')
  s = s.replace(/for (\d+) minute/g, 'por $1 minuto')
  s = s.replace(/If the (\w+) damage reduces/g, 'Se o dano de $1 reduzir')

  // Conectores soltos no final (após substituições acima)
  s = s.replace(/\bIf\b/g, 'Se')
  s = s.replace(/\bif\b/g, 'se')
  s = s.replace(/\bor\b/g, 'ou')
  s = s.replace(/\band\b/g, 'e')
  s = s.replace(/\bthe target\b/gi, 'o alvo')
  s = s.replace(/\bthe creature\b/gi, 'a criatura')
  s = s.replace(/\bin addition\b/gi, 'além disso')
  s = s.replace(/\bturn\b/g, 'turno')
  s = s.replace(/\bit\b/g, 'ela')
  s = s.replace(/\buse its (\w+)\b/g, 'usar seus $1')
  s = s.replace(/\bon another target\b/g, 'em outro alvo')
  s = s.replace(/\banother target\b/g, 'outro alvo')
  s = s.replace(/\baction\b/g, 'ação')
  s = s.replace(/\bmovement\b/g, 'deslocamento')
  s = s.replace(/\bfeet\b/g, 'pés')
  s = s.replace(/\bfoot\b/g, 'pé')
  s = s.replace(/\bhours?\b/g, 'horas')
  s = s.replace(/\bminutes?\b/g, 'minutos')
  s = s.replace(/\battack\b/g, 'ataque')
  s = s.replace(/\battacks\b/g, 'ataques')
  s = s.replace(/\beach\b/g, 'cada')
  s = s.replace(/\bspending\b/g, 'gastando')
  s = s.replace(/\bonly\b/g, 'apenas')
  s = s.replace(/\bwhile\b/g, 'enquanto')
  s = s.replace(/\bafter\b/g, 'após')
  s = s.replace(/\bfrom\b/g, 'de')
  s = s.replace(/\bincluding\b/g, 'incluindo')
  s = s.replace(/\bcured\b/g, 'curada')
  s = s.replace(/\bthis\b/g, 'isso')
  s = s.replace(/\battached\b/g, 'agarrada')
  s = s.replace(/\bpoison\b/g, 'veneno')
  s = s.replace(/\btentacles\b/g, 'tentáculos')
  s = s.replace(/\bconstrict\b/g, 'constringir')
  s = s.replace(/\bbite\b/g, 'morder')
  s = s.replace(/\bis a\b/g, 'for')
  // Remove "the/The" antes de substantivos comuns (já que tradução fica solta)
  s = s.replace(/\bthe\b/gi, '')
  // Normaliza espaços/pontuação após as substituições
  s = s.replace(/\s{2,}/g, ' ')
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')

  // Limpeza de espaços duplos e pontuação solta
  s = s.replace(/  +/g, ' ')
  s = s.replace(/ ,/g, ',').replace(/ \./g, '.').trim()

  return s
}

function translateAttacks(actions) {
  if (!Array.isArray(actions)) return []
  return actions
    .filter(a => a.attack_bonus != null && Array.isArray(a.damage) && a.damage.length > 0)
    .map(a => {
      const dmg = a.damage[0]
      const dmgTypeEn = dmg?.damage_type?.index ?? 'bludgeoning'
      return {
        name: ATTACK_NAME_PT[a.name] ?? a.name,
        nameEn: a.name,
        attackBonus: a.attack_bonus,
        damageDice: dmg.damage_dice,
        damageType: DAMAGE_PT[dmgTypeEn] ?? dmgTypeEn,
        desc: translateAttackDesc(a.desc),
      }
    })
}

// Traços PT-BR — nome + tradução. Cobre os 28 traços únicos de bestas SRD CR ≤ 1.
const TRAITS_PT = {
  'Pack Tactics': {
    name: 'Táticas de Matilha',
    desc: 'Tem vantagem em jogadas de ataque contra uma criatura se pelo menos um aliado estiver a até 1,5m do alvo e não estiver incapacitado.',
  },
  'Keen Smell': {
    name: 'Olfato Aguçado',
    desc: 'Tem vantagem em testes de Sabedoria (Percepção) que dependam do olfato.',
  },
  'Echolocation': {
    name: 'Ecolocalização',
    desc: 'Não pode usar visão cega enquanto estiver ensurdecida.',
  },
  'Keen Hearing': {
    name: 'Audição Aguçada',
    desc: 'Tem vantagem em testes de Sabedoria (Percepção) que dependam da audição.',
  },
  'Keen Sight': {
    name: 'Visão Aguçada',
    desc: 'Tem vantagem em testes de Sabedoria (Percepção) que dependam da visão.',
  },
  'Charge': {
    name: 'Investida',
    desc: 'Se mover pelo menos 6m em linha reta em direção a um alvo e acertar com um ataque na mesma rodada, o alvo sofre +3 (1d6) de dano extra. Se for criatura, precisa passar em TR de Força CD 11 ou cair caída.',
  },
  'Relentless': {
    name: 'Implacável',
    desc: 'Se sofrer 7 ou menos pontos de dano que a reduziriam a 0 PV, fica com 1 PV.',
  },
  'Amphibious': {
    name: 'Anfíbio',
    desc: 'Respira tanto ar quanto água.',
  },
  'Hold Breath': {
    name: 'Prender Fôlego',
    desc: 'Pode prender o fôlego por 15 minutos.',
  },
  'Keen Hearing and Smell': {
    name: 'Audição e Olfato Aguçados',
    desc: 'Tem vantagem em testes de Sabedoria (Percepção) que dependam da audição ou olfato.',
  },
  'Flyby': {
    name: 'Voo Rasante',
    desc: 'Não provoca ataques de oportunidade ao voar para fora do alcance de um inimigo.',
  },
  'Standing Leap': {
    name: 'Salto Parado',
    desc: 'Salto em distância de até 3m e salto em altura de até 1,5m, com ou sem corrida.',
  },
  'Illumination': {
    name: 'Iluminação',
    desc: 'Emite luz brilhante num raio de 3m e luz fraca por mais 3m.',
  },
  'Sure-Footed': {
    name: 'Pisada Firme',
    desc: 'Tem vantagem em TR de Força e Destreza contra efeitos que a derrubariam.',
  },
  'Rampage': {
    name: 'Massacre',
    desc: 'Ao reduzir uma criatura a 0 PV com ataque corpo a corpo no próprio turno, pode usar ação bônus pra mover metade do deslocamento e fazer um ataque de mordida.',
  },
  'Underwater Camouflage': {
    name: 'Camuflagem Submersa',
    desc: 'Tem vantagem em testes de Destreza (Furtividade) feitos debaixo d\'água.',
  },
  'Water Breathing': {
    name: 'Respiração Aquática',
    desc: 'Só consegue respirar debaixo d\'água.',
  },
  'Keen Hearing and Sight': {
    name: 'Audição e Visão Aguçadas',
    desc: 'Tem vantagem em testes de Sabedoria (Percepção) que dependam da audição ou visão.',
  },
  'Spider Climb': {
    name: 'Escalada de Aranha',
    desc: 'Pode escalar superfícies difíceis, incluindo de cabeça pra baixo em tetos, sem teste.',
  },
  'Web Sense': {
    name: 'Sentido das Teias',
    desc: 'Em contato com uma teia, sabe a localização exata de qualquer criatura em contato com a mesma teia.',
  },
  'Web Walker': {
    name: 'Caminhar em Teias',
    desc: 'Ignora restrições de movimento causadas por teias.',
  },
  'Keen Sight and Smell': {
    name: 'Visão e Olfato Aguçados',
    desc: 'Tem vantagem em testes de Sabedoria (Percepção) que dependam da visão ou olfato.',
  },
  'Pounce': {
    name: 'Bote',
    desc: 'Se mover pelo menos 6m em linha reta em direção a uma criatura e acertar com garras na mesma rodada, o alvo precisa passar em TR de Força CD 13 ou cair caída. Se cair, pode fazer um ataque de mordida como ação bônus.',
  },
  'Running Leap': {
    name: 'Salto com Corrida',
    desc: 'Com 3m de corrida, pode dar salto em distância de até 7,5m.',
  },
  'Beast of Burden': {
    name: 'Animal de Carga',
    desc: 'Conta como animal Grande pra determinar capacidade de carga.',
  },
  'Blood Frenzy': {
    name: 'Frenesi Sanguinário',
    desc: 'Tem vantagem em ataques corpo a corpo contra qualquer criatura que não esteja com PV cheios.',
  },
  'Mimicry': {
    name: 'Mimetismo',
    desc: 'Pode imitar sons simples que tenha ouvido (sussurros, choro de bebê, animais). Uma criatura pode identificar como imitação com teste de Sabedoria (Intuição) CD 10.',
  },
  'Trampling Charge': {
    name: 'Investida Atropeladora',
    desc: 'Se mover pelo menos 6m em linha reta e acertar uma criatura com cascos na mesma rodada, ela precisa passar em TR de Força CD 14 ou cair caída. Se cair, pode fazer um ataque de cascos extra como ação bônus.',
  },
}

function translateTraits(specials) {
  if (!Array.isArray(specials)) return []
  return specials.map(t => {
    const pt = TRAITS_PT[t.name]
    if (pt) return { name: pt.name, nameEn: t.name, desc: pt.desc }
    return { name: t.name, nameEn: t.name, desc: t.desc }
  })
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
