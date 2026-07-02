#!/usr/bin/env node
/**
 * Gate "não piorar": roda ESLint, compara o total de ERROS com o baseline.
 * Falha se aumentar (protege contra novos erros sem exigir zerar os 616
 * pré-existentes de uma vez). Se diminuir, avisa pra atualizar o baseline
 * (ratchet — só desce). `--update` grava o baseline atual.
 *
 * Task 1.1 de docs/superpowers/plans/2026-07-02-resolucao-analise-critica.md.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const BASELINE_FILE = new URL('./lint-baseline.json', import.meta.url)

let out = ''
try {
  out = execSync('npx eslint . --format json', {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
} catch (e) {
  // ESLint sai com exit 1 quando há erros; o JSON vem no stdout mesmo assim.
  out = e.stdout
}
const results = JSON.parse(out)
const errors = results.reduce((n, f) => n + f.errorCount, 0)

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE_FILE, JSON.stringify({ errors }, null, 2) + '\n')
  console.log(`Baseline atualizado: ${errors} erros.`)
  process.exit(0)
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8')).errors
if (errors > baseline) {
  console.error(`❌ Lint piorou: ${errors} erros (baseline ${baseline}). Corrija os NOVOS erros — não aumente o débito.`)
  process.exit(1)
}
if (errors < baseline) {
  console.log(`✨ Lint melhorou: ${errors} < ${baseline}. Rode "node scripts/lint-baseline.mjs --update" e commite o baseline.`)
}
console.log(`✅ Lint OK: ${errors} erros (baseline ${baseline}).`)
