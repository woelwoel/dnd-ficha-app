import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Guarda das listas de classe das magias (`classes` nos catálogos).
 *
 * O catálogo PT nasceu do SRD 5.1, que ENXUGA algumas listas: Fogo das Fadas,
 * por exemplo, aparece lá só como magia de druida, apesar de ser magia de bardo
 * desde sempre no PHB (p.239). Quem regenerar o JSON a partir do SRD perde a
 * correção de novo — daí este teste.
 *
 * A tabela abaixo veio da auditoria de 2026-08-04 contra as listas de magia
 * impressas do PHB, do Caldeirão de Tasha (cap. 3) e do Guia de Xanathar
 * (cap. 3). Só entram aqui casos VERIFICADOS contra o livro, com o motivo.
 *
 * `artifice` fica FORA da comparação: a lista do Artífice é do Caldeirão de
 * Tasha e não aparece em nenhuma das listas por classe auditadas.
 */
const dir = path.resolve(process.cwd(), 'public/srd-data')
const load = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))

const FONTES = {
  phb: load('phb-spells-pt.json'),
  tasha: load('tasha-spells-pt.json'),
  xanathar: load('xanathar-spells-pt.json'),
}

/* [fonte, index, classes esperadas (sem artifice), motivo] */
const LISTAS = [
  // --- PHB: magias de bardo que o SRD não carimba como tal ---
  ['phb', 'fogo-das-fadas', ['bardo', 'druida'], 'PHB p.239 — bardo e druida'],
  ['phb', 'espada-de-mordenkainen', ['bardo', 'mago'], 'PHB p.257 — bardo e mago'],

  // --- PHB: listas erradas encontradas na auditoria de 2026-08-04 ---
  ['phb', 'forjar-morte', ['bardo', 'clerigo', 'druida', 'mago'], 'Fingir Morte — não é magia de bruxo'],
  ['phb', 'adivinhacao', ['clerigo'], 'Adivinhação — só clérigo, não druida'],
  ['phb', 'dominar-besta', ['druida', 'feiticeiro'], 'Dominar Besta — feiticeiro, não patrulheiro'],
  ['phb', 'doenca-plena', ['clerigo'], 'Doença Plena (Harm) — só clérigo'],
  ['phb', 'palavra-de-poder-curar', ['bardo'], 'Palavra de Poder Curar — só bardo'],
  ['phb', 'olho-arcano', ['mago'], 'Olho Arcano — só mago'],
  ['phb', 'criar-alimentos', ['clerigo', 'paladino'], 'Criar Alimentos — clérigo e paladino'],
  ['phb', 'destruicao-lancinante', ['paladino'], 'Punição Ardente — só paladino'],
  ['phb', 'arma-magica', ['paladino', 'mago'], 'Arma Mágica — paladino e mago'],
  ['phb', 'arma-elemental', ['paladino'], 'Arma Elemental — só paladino'],
  ['phb', 'identificar', ['bardo', 'mago'], 'Identificar — bardo e mago, não clérigo'],
  ['phb', 'lufada-de-vento', ['druida', 'feiticeiro', 'mago'], 'Lufada de Vento — não é de clérigo'],
  ['phb', 'nao-detectar', ['bardo', 'patrulheiro', 'mago'], 'Não Detectar — não é de clérigo'],
  ['phb', 'muralha-de-fogo', ['druida', 'feiticeiro', 'mago'], 'Muralha de Fogo — não é de clérigo'],
  ['phb', 'mesclar-se-as-rochas', ['clerigo', 'druida'], 'Meld into Stone — clérigo e druida (o SRD corta druida)'],

  // --- Xanathar (cap. 3): as três de 3º nível eram do bruxo, não do bardo ---
  ['xanathar', 'infestar-de-inimigos', ['bardo', 'bruxo', 'feiticeiro', 'mago'], 'XGE — bardo, bruxo, feiticeiro, mago'],
  ['xanathar', 'invocar-demonios-menores', ['bruxo', 'mago'], 'XGE — bruxo e mago, não bardo'],
  ['xanathar', 'passo-trovejante', ['bruxo', 'feiticeiro', 'mago'], 'XGE — não é magia de bardo'],

  // --- Tasha (cap. 3, tabela de Feitiços) ---
  ['tasha', 'invocar-aberracao', ['bruxo', 'mago'], 'TCE — bruxo e mago, não feiticeiro'],
  ['tasha', 'invocar-construto', ['mago'], 'TCE — artífice e mago, não feiticeiro'],
]

describe('listas de classe do catálogo de magias', () => {
  it.each(LISTAS)('%s/%s tem a lista de classe do livro', (fonte, index, esperadas, motivo) => {
    const spell = FONTES[fonte].find(s => s.index === index)
    expect(spell, `${index} sumiu de ${fonte}`).toBeTruthy()
    const atual = (spell.classes ?? []).filter(c => c !== 'artifice').sort()
    expect(atual, motivo).toEqual([...esperadas].sort())
  })

  it('nenhuma magia lista uma classe repetida', () => {
    const repetidas = Object.values(FONTES).flat()
      .filter(s => new Set(s.classes ?? []).size !== (s.classes ?? []).length)
      .map(s => s.index)
    expect(repetidas).toEqual([])
  })
})

/**
 * O catálogo do PHB nasceu de duas passadas de importação e ficou com 30 magias
 * repetidas sob dois índices (uma tradução integral e outra condensada). Em 8
 * pares os gêmeos discordavam em campo de REGRA — alcance, escola, ritual,
 * tempo de conjuração — então qual das duas o jogador escolhia mudava o efeito
 * na mesa. Os gêmeos foram apagados em 2026-08-04; esta lista impede que
 * voltem.
 */
const GEMEOS_APAGADOS = [
  'identificacao', 'auto-disfarce', 'encanto-pessoal', 'nevoa-obscurecente', 'campo-de-espinhos',
  'passos-sem-pegadas', 'rajada-de-vento', 'barreira-de-vento', 'convocar-relampagos',
  'ampliar-plantas', 'nevasca', 'manto-do-cruzado', 'sinal-de-esperanca', 'espiritos-guardioes',
  'dificultar-deteccao', 'controlar-a-agua', 'liberdade-de-movimento', 'polimorfismo',
  'parede-de-fogo', 'sentinela-da-morte', 'chama-radiante', 'escrutinio', 'segurar-monstro',
  'parede-de-pedra', 'ressuscitar', 'lenda', 'onda-devastadora', 'vinha-esmagadora', 'reflexos',
  'favor-divino',
]

describe('catálogo sem magias duplicadas', () => {
  it('nenhum gêmeo apagado voltou', () => {
    const idx = new Set(Object.values(FONTES).flat().map(s => s.index))
    expect(GEMEOS_APAGADOS.filter(i => idx.has(i))).toEqual([])
  })

  it('nenhum índice aparece em duas fontes', () => {
    const vistos = new Map()
    for (const [fonte, lista] of Object.entries(FONTES)) {
      for (const s of lista) vistos.set(s.index, [...(vistos.get(s.index) ?? []), fonte])
    }
    expect([...vistos].filter(([, f]) => f.length > 1).map(([i]) => i)).toEqual([])
  })

  it('nenhum nome de magia aparece duas vezes', () => {
    const nomes = Object.values(FONTES).flat().map(s => s.name.toLowerCase())
    expect(nomes.filter((n, i) => nomes.indexOf(n) !== i)).toEqual([])
  })
})

/**
 * Lista de magias do Artífice (Caldeirão de Tasha, cap. 1). Ela cruza as três
 * fontes: 23 truques, 18 de 1º, 21 de 2º, 15 de 3º, 11 de 4º e 7 de 5º círculo.
 */
describe('lista de magias do Artífice', () => {
  const doArtifice = Object.values(FONTES).flat().filter(s => (s.classes ?? []).includes('artifice'))

  it('tem 95 magias, distribuídas como o livro', () => {
    const porCirculo = doArtifice.reduce((a, s) => ({ ...a, [s.level]: (a[s.level] ?? 0) + 1 }), {})
    expect(porCirculo).toEqual({ 0: 23, 1: 18, 2: 21, 3: 15, 4: 11, 5: 7 })
    expect(doArtifice).toHaveLength(95)
  })

  it('não passa do 5º círculo — o Artífice não tem espaços acima disso', () => {
    expect(doArtifice.filter(s => s.level > 5).map(s => s.index)).toEqual([])
  })

  it('inclui as magias do Xanathar que só o Caldeirão concede ao Artífice', () => {
    const idx = doArtifice.map(s => s.index)
    for (const i of ['absorver-elementos', 'catapulta', 'laco', 'pirotecnia', 'escrita-celeste',
      'flechas-flamejantes', 'transmutar-pedra', 'fortalecimento-de-pericia']) {
      expect(idx, `${i} deveria estar na lista do artífice`).toContain(i)
    }
  })
})
