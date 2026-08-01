// Varre os <button> do src e classifica pelo "chrome" que cada um já declara.
// Precisa balancear {} e strings porque `onClick={() => x}` tem um `>` que não fecha a tag.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'C:/Users/gvfar/git/dnd-ficha-app/src'

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) { if (e !== 'test') walk(p, out) }
    else if (p.endsWith('.jsx')) out.push(p)
  }
  return out
}

/** Devolve o conteúdo da tag de abertura a partir do índice do `<`. */
function readOpenTag(src, start) {
  let i = start + 1
  let depth = 0
  let quote = null
  while (i < src.length) {
    const c = src[i]
    if (quote) {
      if (c === quote && src[i - 1] !== '\\') quote = null
    } else if (c === '"' || c === "'" || c === '`') quote = c
    else if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '>' && depth === 0) return src.slice(start, i)
    i++
  }
  return src.slice(start, start + 400)
}

/** Extrai todos os literais de string de dentro do className={...} / className="...". */
function classNameOf(tag) {
  const at = tag.indexOf('className')
  if (at === -1) return ''
  const rest = tag.slice(at + 'className='.length + (tag[at + 9] === '=' ? 0 : 0))
  const after = tag.slice(tag.indexOf('=', at) + 1).trimStart()
  if (after[0] === '"') return after.slice(1, after.indexOf('"', 1))
  if (after[0] !== '{') return ''
  // expressão: pega o corpo balanceado e junta todos os literais dentro dele
  let depth = 0, i = 0, quote = null, end = after.length
  for (; i < after.length; i++) {
    const c = after[i]
    if (quote) { if (c === quote && after[i - 1] !== '\\') quote = null; continue }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue }
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  const body = after.slice(1, end)
  return [...body.matchAll(/(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g)]
    .map((m) => m[1] ?? m[2] ?? m[3]).join(' ')
    .replace(/\$\{[^}]*\}/g, ' ')
}

const buckets = { custom: [], bordered: [], filled: [], bare: [] }

for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8')
  let idx = -1
  while ((idx = src.indexOf('<button', idx + 1)) !== -1) {
    const tag = readOpenTag(src, idx)
    const cls = classNameOf(tag).replace(/\s+/g, ' ').trim()
    const line = src.slice(0, idx).split('\n').length
    const rec = { file: file.replace(/.*\\src\\/, 'src/').replace(/\\/g, '/'), line, cls }
    if (/\bv2-(btn|tab|rollable|ability|bottomnav)/.test(cls) || /token-coin/.test(cls)) buckets.custom.push(rec)
    else if (/\bborder(-|\b)/.test(cls)) buckets.bordered.push(rec)
    else if (/\bbg-/.test(cls)) buckets.filled.push(rec)
    else buckets.bare.push(rec)
  }
}

for (const [k, v] of Object.entries(buckets)) console.log(k.toUpperCase(), v.length)
const which = process.argv[2]
if (which) {
  for (const r of buckets[which]) console.log(`${r.file}:${r.line}  [${r.cls.slice(0, 100)}]`)
}
