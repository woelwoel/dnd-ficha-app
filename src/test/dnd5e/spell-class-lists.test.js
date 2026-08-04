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
  ['phb', 'identificacao', ['bardo', 'mago'], 'idem, na entrada gêmea'],
  ['phb', 'lufada-de-vento', ['druida', 'feiticeiro', 'mago'], 'Lufada de Vento — não é de clérigo'],
  ['phb', 'rajada-de-vento', ['druida', 'feiticeiro', 'mago'], 'idem, na entrada gêmea'],
  ['phb', 'dificultar-deteccao', ['bardo', 'patrulheiro', 'mago'], 'Não Detectar — não é de clérigo'],
  ['phb', 'nao-detectar', ['bardo', 'patrulheiro', 'mago'], 'idem, na entrada gêmea'],
  ['phb', 'muralha-de-fogo', ['druida', 'feiticeiro', 'mago'], 'Muralha de Fogo — não é de clérigo'],
  ['phb', 'parede-de-fogo', ['druida', 'feiticeiro', 'mago'], 'idem, na entrada gêmea'],

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
