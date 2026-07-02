#!/usr/bin/env node
/**
 * Inventário legal: o que em public/srd-data está coberto pelo SRD 5.1
 * (CC-BY-4.0) e o que é IP fechado da Wizards of the Coast (PHB não-SRD
 * e Tasha inteiro). Gera docs/audits/2026-07-conteudo-nao-srd.md.
 *
 * Task 2.1 de docs/superpowers/plans/2026-07-02-resolucao-analise-critica.md.
 * Rodar: node scripts/audit-srd-content.mjs
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import path from 'node:path'

const DIR = 'public/srd-data'
const OUT = 'docs/audits/2026-07-conteudo-nao-srd.md'

/* ── Referência SRD 5.1 ─────────────────────────────────────────────
 * O SRD inclui UMA subclasse por classe, UM talento (Grappler) e UM
 * antecedente (Acolyte). Slugs abaixo no formato PT deste repo. */
// Slugs REAIS deste repo (conferidos em phb-class-choices-pt.json 2026-07-02).
const SRD_SUBCLASS_BY_CHOICE = {
  primal_path: 'berserker', // Path of the Berserker
  bard_college: 'conhecimento', // College of Lore
  divine_domain: 'vida', // Life Domain
  druid_circle: 'terra', // Circle of the Land
  sorcerous_origin: 'dracon', // Draconic Bloodline → linhagem_draconico
  martial_archetype: 'campeao', // Champion
  roguish_archetype: 'gatuno', // Thief
  arcane_tradition: 'evocacao', // School of Evocation
  monastic_tradition: 'mao_aberta', // Way of the Open Hand
  sacred_oath: 'devocao', // Oath of Devotion
  ranger_archetype: 'cacador', // Hunter
  patron: 'infernal', // The Fiend
}
const SRD_FEATS = new Set(['grappler', 'agarrador'])
const SRD_BACKGROUNDS = new Set(['acolyte', 'acolito'])

const norm = s => String(s ?? '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')

const read = f => JSON.parse(readFileSync(path.join(DIR, f), 'utf8'))
const kb = f => Math.round(statSync(path.join(DIR, f)).size / 1024)

/* ── Análises quantificadas ────────────────────────────────────────── */

function analyzeSubclasses(file) {
  const data = read(file)
  const lines = []
  let closed = 0, total = 0
  for (const [cls, val] of Object.entries(data)) {
    const choices = val.choices ?? []
    for (const c of choices) {
      const srdSlug = SRD_SUBCLASS_BY_CHOICE[c.id]
      if (!srdSlug || !Array.isArray(c.options)) continue
      const options = c.options.map(o => norm(o.value ?? o.index ?? o.name))
      const closedOpts = options.filter(o => !o.includes(srdSlug))
      closed += closedOpts.length
      total += options.length
      if (closedOpts.length) lines.push(`  - ${cls}/${c.id}: ${closedOpts.length}/${options.length} fora do SRD (${closedOpts.join(', ')})`)
    }
  }
  return { closed, total, lines }
}

function analyzeByIndex(file, srdSet, label) {
  const data = read(file)
  const closed = data.filter(i => !srdSet.has(norm(i.index ?? i.name)))
  return `${closed.length}/${data.length} ${label} fora do SRD (SRD só tem: ${[...srdSet][1] ?? [...srdSet][0]}).`
}

/* ── Classificação por arquivo ─────────────────────────────────────── */

const rows = []
const detail = []

for (const f of readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
  let cls = '', obs = ''
  if (f.startsWith('5e-SRD-')) {
    cls = '🟢 SRD 5.1'
    obs = 'Base SRD (CC-BY-4.0). Exige atribuição CC-BY visível no app.'
  } else if (f.startsWith('tasha-')) {
    cls = '🔴 Fechado'
    const n = (() => { const d = read(f); return Array.isArray(d) ? d.length : Object.keys(d).length })()
    obs = `Tasha NÃO tem versão SRD — 100% IP fechado (${n} entradas).`
  } else if (f === 'phb-feats-pt.json') {
    cls = '🔴 Fechado'
    obs = analyzeByIndex(f, SRD_FEATS, 'talentos') +
      ' O único talento do SRD (Grappler) nem está no app — 100% do arquivo é fechado.'
  } else if (f === 'phb-backgrounds-pt.json') {
    cls = '🔴 Quase todo fechado'
    obs = analyzeByIndex(f, SRD_BACKGROUNDS, 'antecedentes')
  } else if (f === 'phb-class-choices-pt.json') {
    const a = analyzeSubclasses(f)
    cls = '🔴 Maioria fechada'
    obs = `${a.closed}/${a.total} subclasses fora do SRD (detalhe abaixo). Options não-subclasse (totens, manobras do Mestre de Combate, estilos extras) também são majoritariamente fechadas.`
    detail.push(`### Subclasses fora do SRD em ${f}`, ...a.lines, '')
  } else if (f === 'phb-maneuvers-pt.json') {
    cls = '🔴 Fechado'
    obs = 'Manobras são do Mestre de Combate (subclasse não-SRD; a subclasse SRD do Guerreiro é o Campeão).'
  } else if (f === 'phb-spells-pt.json') {
    const n = read(f).length
    cls = '🟡 Misto'
    obs = `${n} magias; o SRD tem 319 (ver 5e-SRD-Spells.json) — ~${n - 319}+ fora do SRD. ATENÇÃO: mesmo as 319 SRD só são seguras se a TRADUÇÃO for derivada do SRD em inglês (tradução própria = obra derivada permitida pela CC-BY); tradução de terceiros do livro oficial NÃO é coberta.`
  } else if (f === 'phb-magic-items-pt.json') {
    const n = read(f).length
    cls = '🟡 Misto'
    obs = `${n} itens; a maioria dos itens básicos do DMG está no SRD, mas conferir item a item (e vale a mesma ressalva de origem da tradução).`
  } else if (f === 'phb-classes-pt.json' || f.startsWith('phb-class-progression') || f === 'phb-class-equipment-pt.json' || f === 'phb-multiclass-pt.json') {
    cls = '🟡 Mecânica SRD, texto a conferir'
    obs = 'Estruturas/tabelas de classe e multiclasse estão no SRD; o risco está em DESCRIÇÕES verbatim do PHB (lore, fullDescription, features não-SRD) e na origem da tradução.'
  } else if (f === 'phb-races-pt.json') {
    cls = '🟡 Misto'
    obs = 'As 9 raças básicas estão no SRD (1 sub-raça cada: Hill Dwarf, High Elf, Lightfoot Halfling, Rock Gnome). Sub-raças extras do PHB (ex.: anão da montanha, elfo da floresta, gnomo da floresta, draconato por ancestral) são fechadas. Conferir texto de lore.'
  } else if (f === 'phb-weapons-pt.json') {
    cls = '🟢 SRD (tabelas)'
    obs = 'Tabelas de armas/equipamento estão no SRD.'
  } else if (f === 'wild-shape-beasts-pt.json') {
    cls = '🟢 SRD (stat blocks)'
    obs = 'Stat blocks de bestas estão no SRD (Monsters).'
  } else {
    cls = '⚪ Conferir'
    obs = 'Arquivo fora dos padrões conhecidos.'
  }
  rows.push(`| ${f} | ${kb(f)} | ${cls} | ${obs} |`)
}

/* ── Relatório ─────────────────────────────────────────────────────── */

const out = [
  '# Auditoria de conteúdo: SRD 5.1 vs IP fechado (WotC)',
  '',
  `Gerado por \`scripts/audit-srd-content.mjs\` em ${new Date().toISOString().slice(0, 10)}.`,
  'Contexto: Task 2.1 do plano `docs/superpowers/plans/2026-07-02-resolucao-analise-critica.md`.',
  '',
  '## O problema em uma frase',
  '',
  'O SRD 5.1 é CC-BY-4.0 (uso livre com atribuição); todo o resto de PHB e Tasha é',
  'IP fechado da Wizards of the Coast, e `public/srd-data/` serve esses arquivos',
  'publicamente sem autenticação.',
  '',
  '## Inventário por arquivo',
  '',
  '| Arquivo | KB | Classificação | Observação |',
  '|---|---|---|---|',
  ...rows,
  '',
  ...detail,
  '## Ressalva transversal: origem da tradução',
  '',
  'A CC-BY-4.0 permite obra derivada (tradução PRÓPRIA do SRD em inglês, com',
  'atribuição). Ela NÃO cobre tradução extraída de terceiros — nem da edição',
  'oficial brasileira, nem de fan-translations do livro completo (a esteira do',
  'Tasha usou PDFs de fan-translation; se o conteúdo PHB veio da mesma origem,',
  'até os itens "SRD" desta tabela carregam texto de origem não-limpa).',
  '',
  '## Referência SRD 5.1 usada',
  '',
  '- Subclasses (1/classe): Berserker, Lore, Life, Land, Champion, Open Hand,',
  '  Devotion, Hunter, Thief, Draconic, Fiend, Evocation.',
  '- Talentos: só Grappler. Antecedentes: só Acolyte.',
  '- Raças: as 9 básicas com 1 sub-raça cada.',
  '',
  '## Próximo passo',
  '',
  'Decisão do dono (Task 2.2 do plano): resumir com texto próprio / mover pra',
  'trás de auth / aceitar o risco documentado — ver opções no plano.',
]

writeFileSync(OUT, out.join('\n') + '\n')
console.log(`Relatório: ${OUT}`)
console.log('ATENÇÃO: o relatório pode conter seções de amostragem MANUAL — re-rodar este script sobrescreve o arquivo; preserve-as antes.')
