/**
 * Transforma phb-races-pt.json e phb-classes-pt.json:
 *   - Adiciona campo `summary` (descrição curta de 1-2 frases)
 *   - Renomeia `description` → `fullDescription`
 *   - Adiciona campo `topics` (array de {title, desc}) a partir de
 *     `traits` (raças) ou `level1_features` (classes)
 *
 * Mantém retrocompatibilidade: traits e level1_features permanecem intactos.
 *
 * Uso: node scripts/add_topics_and_summary.js
 */

const fs   = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'public', 'srd-data')

/* ── Resumos por raça ───────────────────────────────────────────────────── */
const RACE_SUMMARIES = {
  'anao':       'Guerreiros robustos das montanhas, com resistência excepcional, visão no escuro e proficiência com armas e ferramentas anãs.',
  'elfo':       'Seres graciosos e de longa vida, com visão no escuro, resistência a encantamentos e afinidade natural com arcos e espadas.',
  'halfling':   'Pequenos e incrivelmente sortudos, com coragem surpreendente, pés silenciosos e dom para escapar de situações perigosas.',
  'humano':     'A raça mais versátil e numerosa, ganha +1 em todos os atributos e se adapta a qualquer função, cultura e região.',
  'draconato':  'Guerreiros orgulhosos com herança dracônica, capazes de exalar energia elemental e resistir ao seu próprio tipo de dano.',
  'gnomo':      'Inventivos e curiosos, com ilusão inata, resistência à magia mental e afinidade com engenhocas e a natureza.',
  'meio-elfo':  'Diplomáticos naturais que combinam versatilidade humana com graça élfica, ganhando +2 em Carisma e proficiências extras à escolha.',
  'meio-orc':   'Sobreviventes tenaces com força e resistência excepcionais, capazes de se manter de pé quando qualquer outro personagem cairia.',
  'tiefling':   'Descendentes de linhagem infernal com resistência ao fogo, visão no escuro e magias de encantamento e escuridão inatas.',
}

/* ── Resumos por classe ─────────────────────────────────────────────────── */
const CLASS_SUMMARIES = {
  'barbaro':     'Guerreiros furiosos que entram em fúria primal para causar dano massivo e resistir a qualquer coisa.',
  'bardo':       'Artistas versáteis que combinam magia, perícias e Inspiração Bárdica para apoiar o grupo em qualquer situação.',
  'bruxo':       'Conjuradores que firmaram pactos com entidades do além, recuperando magia com descansos curtos.',
  'clerigo':     'Campeões divinos que canalizam poder dos deuses para curar aliados, destruir mortos-vivos e invocar milagres.',
  'druida':      'Guardiões da natureza que se transformam em animais e controlam forças elementais com magia primordial.',
  'feiticeiro':  'Conjuradores com magia inata no sangue, capaz de manipular e potencializar feitiços com Metamagia.',
  'guerreiro':   'Mestres do combate que superam todos no número de ataques, manobras e capacidade de recuperação.',
  'ladino':      'Especialistas em furtividade e precisão que aplicam Ataque Furtivo para causar dano explosivo.',
  'mago':        'Estudiosos da magia arcana com o maior arsenal de magias e capacidade de preparar qualquer feitiço.',
  'monge':       'Artistas marciais que canalizam ki para golpes devastadores, deflexão de projéteis e mobilidade extrema.',
  'paladino':    'Guerreiros sagrados que combinam combate marcial com cura, auras protetoras e magias divinas.',
  'patrulheiro': 'Rastreadores e caçadores que dominam terrenos selvagens e são especialistas contra inimigos específicos.',
}

/* ── Transformação de raças ─────────────────────────────────────────────── */
function transformRace(race) {
  const { description, traits = [], subraces = [], ...rest } = race

  // topics: traits com name → title (mantém name para retrocompatibilidade)
  const topics = traits.map(t => ({
    title: t.name,
    desc:  t.desc || '',
  }))

  // subraces: mesma transformação recursiva
  const transformedSubraces = subraces.map(sr => {
    const { description: srDesc, traits: srTraits = [], ...srRest } = sr
    return {
      ...srRest,
      fullDescription: srDesc || '',
      topics: (srTraits).map(t => ({ title: t.name, desc: t.desc || '' })),
      traits: srTraits,   // mantém para retrocompatibilidade
    }
  })

  return {
    ...rest,
    summary:         RACE_SUMMARIES[race.index] || '',
    fullDescription: description || '',
    topics,
    traits,          // mantém para retrocompatibilidade
    subraces:        transformedSubraces,
  }
}

/* ── Transformação de classes ───────────────────────────────────────────── */
function transformClass(cls) {
  const { description, level1_features = [], ...rest } = cls

  const topics = level1_features.map(f => ({
    title: f.name,
    desc:  f.desc || '',
  }))

  return {
    ...rest,
    summary:         CLASS_SUMMARIES[cls.index] || '',
    fullDescription: description || '',
    topics,
    level1_features,   // mantém para retrocompatibilidade
  }
}

/* ── Main ───────────────────────────────────────────────────────────────── */
function processFile(filename, transformFn, label) {
  const filePath = path.join(DATA_DIR, filename)
  const data     = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const updated  = data.map(transformFn)
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8')
  console.log(`✓ ${label}: ${updated.length} entradas processadas → ${filename}`)
}

processFile('phb-races-pt.json',   transformRace,  'Raças')
processFile('phb-classes-pt.json', transformClass, 'Classes')

console.log('\nPronto! Campos adicionados: summary, fullDescription, topics')
console.log('Campos mantidos: description → removido, traits/level1_features → intactos')
