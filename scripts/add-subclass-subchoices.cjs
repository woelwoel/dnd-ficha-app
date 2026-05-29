/**
 * Adiciona sub-escolhas condicionais (com `requires`) a subclasses que
 * exigem picks adicionais — mesmo padrão das Manobras do Mestre de Combate.
 *
 * Adições:
 *  - Bárbaro Caminho do Totem — 3 sub-picks (totem em nv 3, 6 e 14).
 *  - Patrulheiro Caçador — 4 sub-picks (Presa nv 3, Defesa nv 7, Múltiplos
 *    nv 11, Superior nv 15).
 *  - Patrulheiro Mestre das Bestas — 1 sub-pick (besta companheira nv 3).
 *
 * Idempotente: só adiciona se o id ainda não existir na lista de choices.
 */
const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'public', 'srd-data', 'phb-class-choices-pt.json')
const json = JSON.parse(fs.readFileSync(FILE, 'utf8'))

/* ── Totens do Bárbaro (PHB p.50) ─────────────────────────── */
const TOTEMS_3 = [
  { value: 'urso',   name: 'Urso',   desc: 'Enquanto em Fúria: resistência a todo tipo de dano EXCETO psíquico. O espírito do urso te torna durável o suficiente para enfrentar qualquer perigo.' },
  { value: 'lobo',   name: 'Lobo',   desc: 'Enquanto em Fúria: seus aliados têm vantagem em ataques corpo a corpo contra qualquer criatura a até 1,5m de você que seja hostil a você.' },
  { value: 'aguia',  name: 'Águia',  desc: 'Enquanto em Fúria (sem armadura pesada): outras criaturas têm desvantagem em ataques de oportunidade contra você. Pode usar a ação Disparada como ação bônus.' },
  { value: 'alce',   name: 'Alce',   desc: 'Enquanto em Fúria (sem armadura pesada): velocidade de deslocamento aumenta em 4,5m.' },
  { value: 'tigre',  name: 'Tigre',  desc: 'Enquanto em Fúria: sua distância de salto longo aumenta em 3m e o salto alto em 90cm.' },
]
const TOTEMS_6 = [
  { value: 'urso_6',   name: 'Aspecto do Urso',   desc: 'Você ganha o poder de carregar peso pesado: capacidade de carga, levantar e arrastar dobra.' },
  { value: 'lobo_6',   name: 'Aspecto do Lobo',   desc: 'Você pode rastrear outras criaturas em ritmo rápido, e se move furtivamente em ritmo normal (PHB p.182).' },
  { value: 'aguia_6',  name: 'Aspecto da Águia',  desc: 'Você ganha visão de águia: pode ver até 1,5km sem dificuldade. Em luz baixa, sua visão não é prejudicada além de 30m.' },
  { value: 'alce_6',   name: 'Aspecto do Alce',   desc: 'Pode percorrer longas distâncias: você e até 10 companheiros viajam 2× mais rápido (modo trip).' },
  { value: 'tigre_6',  name: 'Aspecto do Tigre',  desc: 'Ganha proficiência em 2 perícias à sua escolha entre: Atletismo, Acrobacia, Furtividade ou Sobrevivência.' },
]
const TOTEMS_14 = [
  { value: 'urso_14',   name: 'Totem do Urso',   desc: 'Em Fúria, qualquer criatura a 1,5m hostil a você tem desvantagem em ataques contra alvos que não sejam você. Imune se não puder vê-lo ou ouvi-lo.' },
  { value: 'lobo_14',   name: 'Totem do Lobo',   desc: 'Em Fúria, ao acertar criatura com ataque corpo a corpo, você pode usar ação bônus pra derrubá-la se for Grande ou menor.' },
  { value: 'aguia_14',  name: 'Totem da Águia',  desc: 'Em Fúria, ganha velocidade de voo igual à velocidade normal de deslocamento. Não funciona com armadura pesada.' },
  { value: 'alce_14',   name: 'Totem do Alce',   desc: 'Em Fúria, ao se mover pelo menos 6m em linha reta e acertar ataque corpo a corpo, alvo tem TR de Força; falha = derrubado.' },
  { value: 'tigre_14',  name: 'Totem do Tigre',  desc: 'Em Fúria, na sua vez ganha um ataque corpo a corpo adicional como ação bônus contra uma criatura diferente da já atacada.' },
]

const barbaro = json.barbaro
const existingIds = barbaro.choices.map(c => c.id)

const TOTEM_SUBS = [
  { level: 3,  id: 'barbaro_totem_spirit',     featureName: 'Espírito Totem (nv 3)',       prompt: 'Escolha o espírito-totem que guia sua Fúria',                  options: TOTEMS_3 },
  { level: 6,  id: 'barbaro_aspect_of_beast',  featureName: 'Aspecto da Besta (nv 6)',     prompt: 'Escolha o aspecto permanente do animal espiritual',           options: TOTEMS_6 },
  { level: 14, id: 'barbaro_totem_supreme',    featureName: 'Atributo Totêmico (nv 14)',   prompt: 'Escolha o totem definitivo',                                   options: TOTEMS_14 },
]
for (const sub of TOTEM_SUBS) {
  if (existingIds.includes(sub.id)) continue
  barbaro.choices.push({
    ...sub,
    requires: { primal_path: 'totem' },
  })
}

/* ── Caçador do Patrulheiro (PHB p.93) ───────────────────────── */
const HUNTERS_PREY = [
  { value: 'matador_colosso',   name: 'Matador de Colossos',  desc: '+1d8 dano contra criatura cujo PV máximo seja maior que o seu (1×/turno). Vantagem em ataques contra criaturas Grandes ou maiores que estejam feridas.' },
  { value: 'assassino_gigante', name: 'Caçador de Gigantes',  desc: 'Vantagem em ataques contra criaturas Grandes ou maiores.' },
  { value: 'cacador_horda',     name: 'Caçador de Hordas',    desc: 'Pode fazer um ataque adicional contra uma criatura diferente quando você acerta o alvo principal com Ataque (1×/turno).' },
]
const DEFENSIVE_TACTICS = [
  { value: 'manada_furiosa',    name: 'Manada Furiosa',       desc: 'Vantagem em TRs contra ser amedrontado.' },
  { value: 'ataque_multiplo',   name: 'Combate em Múltiplos', desc: 'Quando uma criatura faz ataque contra você enquanto você está em desvantagem (cercado por 3+ inimigos), o ataque ela faz com desvantagem em vez de você.' },
  { value: 'esquiva_provada',   name: 'Esquiva Provada',      desc: 'Quando uma criatura erra ataque corpo a corpo contra você, pode usar reação pra fazer um ataque contra ela.' },
]
const MULTIATTACK = [
  { value: 'volley',            name: 'Volley',               desc: 'Como ação, faz um ataque à distância contra QUALQUER número de criaturas em uma esfera de 3m de raio centrada em um ponto a até alcance da arma.' },
  { value: 'whirlwind',         name: 'Ataque Giratório',     desc: 'Como ação, faz um ataque corpo a corpo contra QUALQUER número de criaturas em 1,5m de você (cada com jogada separada).' },
]
const SUPERIOR_HUNTER = [
  { value: 'defesa_evasiva',    name: 'Defesa Evasiva',       desc: 'Quando uma criatura erra ataque contra você, pode usar reação pra forçar a criatura a redirecionar o ataque pra outra criatura a 1,5m dela (TR de Força/Destreza CD INT).' },
  { value: 'esquivar_marca',    name: 'Andante de Sombras',   desc: 'Quando ataque contra você falha, ganha vantagem no próximo ataque contra essa criatura até fim do próximo turno.' },
  { value: 'esquiva_sobrenat',  name: 'Esquiva Sobrenatural', desc: 'Quando uma criatura te acerta ataque, pode usar reação pra reduzir o dano à metade (similar ao Ladino nv 5).' },
]

const patrulheiro = json.patrulheiro
const pExistingIds = patrulheiro.choices.map(c => c.id)
const HUNTER_SUBS = [
  { level: 3,  id: 'patrulheiro_hunters_prey',      featureName: 'Presa do Caçador (nv 3)',  prompt: 'Escolha sua técnica de caça',           options: HUNTERS_PREY },
  { level: 7,  id: 'patrulheiro_defensive_tactics', featureName: 'Táticas Defensivas (nv 7)',  prompt: 'Escolha sua tática defensiva',        options: DEFENSIVE_TACTICS },
  { level: 11, id: 'patrulheiro_multiattack',       featureName: 'Ataques Múltiplos (nv 11)',  prompt: 'Escolha sua técnica de ataque múltiplo', options: MULTIATTACK },
  { level: 15, id: 'patrulheiro_superior_hunter',   featureName: 'Defesa Superior (nv 15)',    prompt: 'Escolha sua defesa superior',         options: SUPERIOR_HUNTER },
]
for (const sub of HUNTER_SUBS) {
  if (pExistingIds.includes(sub.id)) continue
  patrulheiro.choices.push({
    ...sub,
    requires: { ranger_archetype: 'cacador' },
  })
}

/* ── Mestre das Bestas — companheira (PHB p.93) ──────────── */
// Bestas elegíveis: CR ≤ 1/4, Pequena ou menor, sem velocidade de voo (exceto
// se velocidade ≤ 9m). PHB lista exemplos comuns; o jogador pode escolher
// uma com aprovação do Mestre.
const BEASTS = [
  { value: 'lobo',         name: 'Lobo',                 desc: 'CR 1/4 — Médio. Velocidade 12m. Olfato apurado. Tática "Bando" (vantagem em ataques se aliado a 1,5m do alvo). Boa pra ataques corpo a corpo + derrubar.' },
  { value: 'falcao',       name: 'Falcão (Hawk)',        desc: 'CR 0 — Pequeno. Voo 18m. Visão aguçada (vantagem em Percepção visual). Bom pra reconhecimento, mas baixo PV.' },
  { value: 'pantera',      name: 'Pantera',              desc: 'CR 1/4 — Médio. Velocidade 15m, escalada 6m. Camuflagem. Boas mordidas. Combina velocidade + furtividade.' },
  { value: 'javali',       name: 'Javali',               desc: 'CR 1/4 — Médio. Velocidade 12m. Carga (dano extra ao se mover pelo menos 6m antes do ataque). Robusto.' },
  { value: 'gato_montes',  name: 'Gato Montês',          desc: 'CR 1/4 — Pequeno. Velocidade 12m. Tática "Bando". Furtividade. Versão compacta da pantera.' },
  { value: 'aguia',        name: 'Águia',                desc: 'CR 0 — Pequeno. Voo 18m. Vista de águia. Excelente para reconhecimento em terreno aberto.' },
  { value: 'urso_pequeno', name: 'Urso (Filhote)',       desc: 'CR 1/4 (representando filhote/urso pequeno) — Médio. Velocidade 12m. Mordida + garras. Mais dano e PV que outras bestas de CR 1/4.' },
]
const MASTER_BEAST_SUB = {
  level: 3,
  id: 'patrulheiro_companion',
  featureName: 'Companheiro Animal (nv 3)',
  prompt: 'Escolha sua besta companheira (CR ≤ 1/4, Pequena ou menor). Você pode escolher outras com aprovação do Mestre.',
  requires: { ranger_archetype: 'mestre_das_bestas' },
  options: BEASTS,
}
if (!pExistingIds.includes(MASTER_BEAST_SUB.id)) {
  patrulheiro.choices.push(MASTER_BEAST_SUB)
}

fs.writeFileSync(FILE, JSON.stringify(json, null, 2) + '\n', 'utf8')
console.log('Sub-escolhas adicionadas.')
