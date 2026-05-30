/**
 * Bump de fontes pequenas site-wide: aumenta legibilidade.
 *
 * Mapeamento (uniforme, ~+2px):
 *   text-[9px]  → text-[11px]
 *   text-[10px] → text-xs    (12px)
 *   text-[11px] → text-[13px]
 *
 * Aplica em src/**\/*.{jsx,js,tsx,ts}. Imprime resumo de mudanças.
 * Rodar: node scripts/bump-fonts.cjs
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'src')

const MAP = [
  [/text-\[9px\]/g,  'text-[11px]'],
  [/text-\[10px\]/g, 'text-xs'],
  [/text-\[11px\]/g, 'text-[13px]'],
]

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) processFile(p)
  }
}

let totalFiles = 0
let totalReplaces = 0

function processFile(file) {
  const src = fs.readFileSync(file, 'utf8')
  let out = src
  let count = 0
  for (const [re, sub] of MAP) {
    out = out.replace(re, () => { count++; return sub })
  }
  if (count > 0) {
    fs.writeFileSync(file, out, 'utf8')
    totalFiles++
    totalReplaces += count
    console.log(`  ${path.relative(process.cwd(), file)}: ${count}`)
  }
}

walk(ROOT)
console.log(`\n✓ ${totalReplaces} substituições em ${totalFiles} arquivos`)
