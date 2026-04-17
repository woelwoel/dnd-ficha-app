// Enriquece phb-spells-pt.json adicionando campo "classes" via mapeamento manual + cross-reference SRD EN
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'public', 'srd-data')

const ptSpells = JSON.parse(readFileSync(path.join(dataDir, 'phb-spells-pt.json'), 'utf-8'))
const enSpells = JSON.parse(readFileSync(path.join(dataDir, '5e-SRD-Spells.json'), 'utf-8'))
const nameMap  = JSON.parse(readFileSync(path.join(__dirname, 'spell-name-map.json'), 'utf-8'))

const CLASS_EN_TO_PT = {
  wizard: 'mago', cleric: 'clerigo', druid: 'druida', paladin: 'paladino',
  ranger: 'patrulheiro', bard: 'bardo', sorcerer: 'feiticeiro', warlock: 'bruxo',
  fighter: 'guerreiro', rogue: 'ladino', monk: 'monge', barbarian: 'barbaro',
}

const enByIndex = {}
for (const s of enSpells) enByIndex[s.index] = s

const SCHOOL_EN_TO_PT = {
  abjuration: 'abjuração', conjuration: 'conjuração', divination: 'adivinhação',
  enchantment: 'encantamento', evocation: 'evocação', illusion: 'ilusão',
  necromancy: 'necromancia', transmutation: 'transmutação',
}

// Classes estáticas para magias PHB-only não presentes no SRD EN
const PHB_ONLY_CLASSES = {
  'Aljava Veloz':                     ['patrulheiro'],
  'Amizade':                          ['bardo', 'feiticeiro', 'bruxo', 'mago'],
  'Aprisionamento':                   ['bruxo', 'mago'],
  'Arca Secreta De Leomund':          ['mago'],
  'Arma Elemental':                   ['paladino', 'patrulheiro'],
  'Arma Mágica':                      ['paladino', 'patrulheiro', 'mago'],
  'Armadura De Agathys':              ['bruxo'],
  'Aura De Pureza':                   ['paladino'],
  'Aura De Vida':                     ['paladino'],
  'Aura De Vitalidade':               ['paladino'],
  'Aura Mágica De Nystul':           ['mago'],
  'Braços De Hadar':                  ['bruxo'],
  'Bruxaria':                         ['bruxo'],
  'Chicote De Espinhos':              ['druida'],
  'Chuva De Meteoros':                ['feiticeiro', 'mago'],
  'Comunhão':                         ['clerigo'],
  'Comunhão Com A Natureza':          ['druida', 'patrulheiro'],
  'Conjurar Rajada':                  ['patrulheiro'],
  'Conjurar Saraivada':               ['patrulheiro'],
  'Cordão De Flechas':                ['patrulheiro'],
  'Coroa Da Loucura':                 ['bardo', 'feiticeiro', 'bruxo', 'mago'],
  'Cão Fiel De Mordenkainen':        ['mago'],
  'Círculo De Poder':                 ['paladino'],
  'Destruição Banidora':              ['paladino'],
  'Destruição Cegante':               ['paladino'],
  'Destruição Colérica':              ['paladino'],
  'Destruição Estonteante':           ['paladino'],
  'Destruição Lancinante':            ['paladino', 'patrulheiro'],
  'Destruição Trovejante':            ['paladino'],
  'Disco Flutuante De Tenser':        ['mago'],
  'Dominar Besta':                    ['druida', 'patrulheiro'],
  'Duelo Compelido':                  ['paladino'],
  'Esfera Congelante De Otiluke':    ['mago'],
  'Esfera Resiliente De Otiluke':    ['mago'],
  'Espada De Mordenkainen':           ['mago'],
  'Flecha Relampejante':              ['patrulheiro'],
  'Flecha Ácida De Melf':            ['mago'],
  'Fome De Hadar':                    ['bruxo'],
  'Forjar Morte':                     ['clerigo', 'bruxo', 'mago'],
  'Força Fantasmagórica':             ['bardo', 'feiticeiro', 'mago'],
  'Globos De Luz':                    ['bardo', 'feiticeiro', 'mago'],
  'Golpe Constritor':                 ['patrulheiro'],
  'Imagem Maior':                     ['bardo', 'feiticeiro', 'bruxo', 'mago'],
  'Invocação Instantânea De Drawmij': ['mago'],
  'Ligação Telepática De Rary':       ['mago'],
  'Localizar Animais Ou Plantas':     ['bardo', 'druida', 'patrulheiro'],
  'Mansão Magnífica De Mordenkainen': ['bardo', 'mago'],
  'Manto Do Cruzado':                 ['paladino'],
  'Marca Da Punição':                 ['paladino'],
  'Marca Do Caçador':                 ['patrulheiro'],
  'Mensagem':                         ['bardo', 'feiticeiro', 'mago'],
  'Mão De Bigby':                    ['mago'],
  'Nuvem De Adagas':                  ['bardo', 'feiticeiro', 'bruxo', 'mago'],
  'Onda Destrutiva':                  ['paladino'],
  'Orbe Cromática':                   ['feiticeiro', 'mago'],
  'Palavra De Poder Curar':           ['bardo', 'clerigo'],
  'Pequena Cabana De Leomund':        ['bardo', 'mago'],
  'Portal Arcano':                    ['feiticeiro', 'bruxo', 'mago'],
  'Proteção Contra Energia':          ['clerigo', 'druida', 'patrulheiro', 'feiticeiro', 'mago'],
  'Proteção Contra Lâminas':          ['bardo', 'feiticeiro', 'bruxo', 'mago'],
  'Raio Adoecente':                   ['feiticeiro', 'mago'],
  'Raio De Bruxa':                    ['feiticeiro', 'bruxo', 'mago'],
  'Remover Maldição':                 ['clerigo', 'paladino', 'bruxo', 'mago'],
  'Riso Histérico De Tasha':          ['bardo', 'mago'],
  'Santuário Particular De Mordenkainen': ['mago'],
  'Saraivada De Espinhos':            ['patrulheiro'],
  'Sentido Bestial':                  ['druida', 'patrulheiro'],
  'Sussurros Dissonantes':            ['bardo'],
  'Telepatia':                        ['mago'],
  'Teletransporte Por Árvores':       ['druida'],
  'Tentáculos Negros De Evard':       ['mago'],
  'Tsunami':                          ['druida'],
  'Vinha Esmagadora':                 ['druida', 'patrulheiro'],
  'Âncora Planar':                    ['bardo', 'clerigo', 'druida', 'mago'],
}

function removeAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
function trigrams(s) {
  const clean = removeAccents(s).replace(/[^a-z0-9]/g, '')
  const set = new Set()
  for (let i = 0; i < clean.length - 2; i++) set.add(clean.slice(i, i + 3))
  return set
}
function similarity(a, b) {
  const ta = trigrams(a), tb = trigrams(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return (2 * inter) / (ta.size + tb.size)
}

const enByLevelSchool = {}
for (const spell of enSpells) {
  const school = SCHOOL_EN_TO_PT[spell.school?.index || spell.school?.name?.toLowerCase() || ''] || ''
  const key = `${spell.level}|${school}`
  if (!enByLevelSchool[key]) enByLevelSchool[key] = []
  enByLevelSchool[key].push(spell)
}

function getClassesForEnSpell(enSpell) {
  return (enSpell?.classes || [])
    .map(c => CLASS_EN_TO_PT[c.index || c.name?.toLowerCase()])
    .filter(Boolean)
}

let byManualMap = 0, byPhbOnly = 0, byFuzzy = 0, noMatch = 0

const enriched = ptSpells.map(ptSpell => {
  // 1) PHB-only hardcoded
  if (PHB_ONLY_CLASSES[ptSpell.name]) {
    byPhbOnly++
    return { ...ptSpell, classes: PHB_ONLY_CLASSES[ptSpell.name] }
  }

  // 2) Mapeamento manual por nome → índice EN
  const enIndex = nameMap[ptSpell.name]
  if (enIndex && enByIndex[enIndex]) {
    byManualMap++
    return { ...ptSpell, classes: getClassesForEnSpell(enByIndex[enIndex]) }
  }

  // 3) Fallback fuzzy por nível + escola
  const schoolPt = ptSpell.school?.toLowerCase() || ''
  const key = `${ptSpell.level}|${schoolPt}`
  const candidates = enByLevelSchool[key] || []
  let bestScore = 0, bestMatch = null
  for (const enSpell of candidates) {
    const score = similarity(ptSpell.name, enSpell.name)
    if (score > bestScore) { bestScore = score; bestMatch = enSpell }
  }
  const threshold = ptSpell.name.length < 8 ? 0.2 : 0.4
  if (bestMatch && bestScore >= threshold) {
    byFuzzy++
    return { ...ptSpell, classes: getClassesForEnSpell(bestMatch) }
  }

  noMatch++
  return { ...ptSpell, classes: [] }
})

writeFileSync(path.join(dataDir, 'phb-spells-pt.json'), JSON.stringify(enriched, null, 2), 'utf-8')

const total = ptSpells.length
console.log(`\n✅ Total: ${total} magias`)
console.log(`  PHB-only hardcoded: ${byPhbOnly}`)
console.log(`  Manual map (SRD EN): ${byManualMap}`)
console.log(`  Fuzzy match        : ${byFuzzy}`)
console.log(`  Sem match          : ${noMatch}`)

const noMatchList = enriched.filter(s => s.classes.length === 0)
if (noMatchList.length > 0) {
  console.log(`\nAinda sem classes (${noMatchList.length}) — provavelmente não estão no SRD:`)
  noMatchList.forEach(s => console.log(`  - "${s.name}" (nv${s.level}, ${s.school})`))
}
