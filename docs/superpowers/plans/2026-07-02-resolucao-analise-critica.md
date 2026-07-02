# Resolução da Análise Crítica — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver todos os pontos levantados na análise crítica de 2026-07-02 (engenharia, regras de D&D e UI/UX), em fases ordenadas por risco e custo.

**Architecture:** Fases 0–3 e 6 são tarefas bite-sized executáveis diretamente deste documento. Fases 4, 5, 7 e 8 são sub-projetos que produzem software funcional por conta própria e **exigem plano detalhado próprio** (Scope Check do superpowers:writing-plans) — aqui ficam suas specs, critérios de aceite e ordem. Cada task termina com commit; push após cada commit (preferência do dono).

**Tech Stack:** React 19 + Vite 8 (PWA), Tailwind 4 (`@theme`), Zod, Supabase, Vitest, Playwright, ESLint 9 flat config, GitHub Actions.

---

## Fatos medidos em 2026-07-02 (base do plano)

| Fato | Evidência |
|---|---|
| Lint: **616 erros, 11 warnings** | `npx eslint .` local |
| CI roda `npm run lint` **sem** `continue-on-error` | `.github/workflows/ci.yml` — com 616 erros, o job Lint deveria estar falhando; verificar na Task 4.1 |
| `DEFAULT_CHARACTER.combat.speed = 30` (era pés) vs schema default `9` (metros) | `src/hooks/useCharacter.js:67` vs `characterSchema.js:164` |
| Casca importa entranhas do sistema | `App.jsx`, `useCharacter.js`, `useCharacterCalculations.js`, `useClassSpells.js`, `useTabValidation.js`, `utils/calculations.js` importam `systems/dnd5e/**` |
| Ciclo de camadas | `utils/calculations.js` → `systems/dnd5e/domain/attributes` e `domain/rules.js` → `utils/calculations` |
| Sintonização: UI **já** limita (`MAX_ATTUNED` + prop `maxAttunement` do Artífice, teto 3/4/5/6), domínio **não** valida | `Inventory.jsx:196,540,567`; `getMaxAttunement` em `artificerInfusions.js` |
| Efeito `speed` de item mágico documentado em **pés**; app usa **metros** | `domain/magicItems.js:17` |
| Fontes via Google Fonts CDN (`@import url`) | `src/index.css:3` |
| E2E: só 3 specs (smoke, persistence, bestiary); wizard sem cobertura | `e2e-pw/` |
| Conteúdo PHB/Tasha não-SRD servido publicamente | `public/srd-data/phb-*.json`, `tasha-*.json` |

---

## Ordem de execução e dependências

```
Fase 0 (quick wins)  ──────────────► sem dependências, começar já
Fase 1 (proteção CI/E2E) ──────────► sem dependências
Fase 2 (auditoria legal) ──────────► sem dependências; decisão do dono no final
Fase 3 (regras D&D) ───────────────► sem dependências
Fase 4 (fronteira multi-sistema) ──► depende da Task 0.3 (regra ESLint criada)
Fase 5 (tokens semânticos + dark) ─► independente; fazer ANTES de escrever muitos componentes novos
Fase 6 (acessibilidade) ───────────► idealmente após Fase 5 (contraste muda com tokens)
Fase 7 (retrato → Storage) ────────► independente
Fase 8 (quick builds) ─────────────► independente; passar por brainstorming antes
Fase 9 (checkJs no domínio) ───────► contínua, começar quando quiser
Fase 10 (god files) ───────────────► política contínua, sem task
```

---

# FASE 0 — Quick wins (½ dia)

### Task 0.1: Corrigir `speed` default de 30 (pés) para 9 (metros)

**Files:**
- Modify: `src/hooks/useCharacter.js:31` (exportar `DEFAULT_CHARACTER`) e `:67` (valor)
- Test: `src/test/dnd5e/default-character.test.js` (novo)

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/dnd5e/default-character.test.js
import { describe, it, expect } from 'vitest'
import { DEFAULT_CHARACTER } from '../../hooks/useCharacter'

describe('DEFAULT_CHARACTER', () => {
  it('deslocamento default é 9 metros (não 30 — resquício da era em pés)', () => {
    expect(DEFAULT_CHARACTER.combat.speed).toBe(9)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/default-character.test.js`
Expected: FAIL — primeiro porque `DEFAULT_CHARACTER` não é exportado; depois porque vale 30.

- [ ] **Step 3: Implementar**

Em `src/hooks/useCharacter.js`, linha 31, trocar:

```js
const DEFAULT_CHARACTER = {
```

por:

```js
export const DEFAULT_CHARACTER = {
```

E na linha 67 (`combat`), trocar:

```js
    speed: 30,
```

por:

```js
    speed: 9, // metros — ver characterSchema.js (schema default 9)
```

- [ ] **Step 4: Rodar teste + suíte inteira**

Run: `npx vitest run src/test/dnd5e/default-character.test.js` → PASS
Run: `npm test` → sem regressões (atenção ao flake conhecido de timeout em LoginScreen/ResetPasswordScreen; re-rodar isolado se for só ele).

- [ ] **Step 5: Commit e push**

```bash
git add src/hooks/useCharacter.js src/test/dnd5e/default-character.test.js
git commit -m "fix(character): deslocamento default 9m (era 30, resquício de pés)"
git push
```

### Task 0.2: Self-host das fontes (remover Google Fonts CDN)

**Files:**
- Modify: `src/index.css:3`
- Modify: `package.json` (dependências novas)

- [ ] **Step 1: Instalar pacotes @fontsource**

```bash
npm install @fontsource/eb-garamond @fontsource/im-fell-english-sc @fontsource/inter
```

- [ ] **Step 2: Substituir o @import de CDN**

Em `src/index.css`, remover a linha:

```css
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=IM+Fell+English+SC&family=Inter:wght@400;500;600;700&display=swap');
```

e colocar no lugar (mesmos pesos/estilos que a URL pedia):

```css
@import "@fontsource/eb-garamond/400.css";
@import "@fontsource/eb-garamond/500.css";
@import "@fontsource/eb-garamond/600.css";
@import "@fontsource/eb-garamond/700.css";
@import "@fontsource/eb-garamond/400-italic.css";
@import "@fontsource/eb-garamond/500-italic.css";
@import "@fontsource/im-fell-english-sc/400.css";
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/inter/700.css";
```

(Manter todos os `@import` no topo do arquivo, antes de qualquer regra — exigência do CSS.)

- [ ] **Step 3: Verificar build e ausência do CDN**

```bash
npm run build
grep -r "fonts.googleapis" dist/ && echo "AINDA TEM CDN" || echo "OK: sem CDN"
```

Expected: `OK: sem CDN`. Os `.woff2` devem aparecer em `dist/assets/` (e entram no precache do PWA — fontes passam a funcionar offline).

- [ ] **Step 4: Verificação visual**

Rodar `npm run dev`, abrir a tela inicial e confirmar que títulos continuam em IM Fell English SC e corpo em EB Garamond (comparar com produção se ficar em dúvida).

- [ ] **Step 5: Commit e push**

```bash
git add src/index.css package.json package-lock.json
git commit -m "perf(fonts): self-host via @fontsource (offline PWA, sem render-block de CDN)"
git push
```

### Task 0.3: Regra ESLint de fronteira multi-sistema

Congela o vazamento atual: os 6 violadores conhecidos entram numa whitelist explícita (débito da Fase 4); **nenhum arquivo novo** pode importar `systems/dnd5e/**` diretamente.

**Files:**
- Modify: `eslint.config.js`

- [ ] **Step 1: Adicionar o bloco de fronteira**

Em `eslint.config.js`, dentro do `defineConfig([...])`, adicionar após o bloco de arquivos Node (linha 35):

```js
  // ── Fronteira multi-sistema ─────────────────────────────────────
  // Fora de src/systems/** e src/test/**, ninguém importa das entranhas
  // de um sistema — só via contrato System (registry). A whitelist abaixo
  // é o débito conhecido; a Fase 4 do plano 2026-07-02 esvazia essa lista.
  // NÃO adicionar arquivos novos aqui.
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: [
      'src/systems/**',
      'src/test/**',
      // Débito (Fase 4):
      'src/App.jsx',
      'src/hooks/useCharacter.js',
      'src/hooks/useCharacterCalculations.js',
      'src/hooks/useClassSpells.js',
      'src/hooks/useTabValidation.js',
      'src/utils/calculations.js',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/systems/dnd5e/**'],
          message: 'Importe via contrato System (src/systems), não das entranhas do dnd5e. Ver docs/superpowers/plans/2026-07-02-resolucao-analise-critica.md (Fase 4).',
        }],
      }],
    },
  },
```

- [ ] **Step 2: Verificar que a regra pega violação nova e não cria erro falso**

```bash
# contagem antes/depois deve ser idêntica (a whitelist cobre o débito):
npx eslint . 2>&1 | tail -1
```

Expected: mesmos `616 errors` (nenhum novo). Teste de fumaça da regra: adicionar temporariamente `import { getSubclassFeatureCards } from './systems/dnd5e/domain/subclassFeatures'` em `src/ErrorBoundary.jsx`, rodar `npx eslint src/ErrorBoundary.jsx`, confirmar o erro `no-restricted-imports`, e **desfazer a edição**.

- [ ] **Step 3: Commit e push**

```bash
git add eslint.config.js
git commit -m "chore(lint): fronteira systems/dnd5e — proibe import direto fora do contrato (whitelist = debito Fase 4)"
git push
```

---

# FASE 1 — Rede de proteção: CI e E2E (1 dia)

### Task 1.1: Gate de lint "não piorar" (baseline)

Hoje: 616 erros. O CI roda `npm run lint` sem tolerância — **verificar primeiro** se o job Lint está de fato falhando em produção (se estiver, todo push está vermelho e ninguém gateia nada, o que bate com a memória do projeto).

**Files:**
- Create: `scripts/lint-baseline.mjs`
- Create: `scripts/lint-baseline.json`
- Modify: `package.json` (script novo)
- Modify: `.github/workflows/ci.yml` (step Lint)

- [ ] **Step 1: Verificar estado real do CI**

```bash
gh run list --workflow=ci.yml --limit 5
```

Anotar se o job `Lint + Test + Build` está falhando. (Se estiver verde com 616 erros locais, investigar a diferença antes de prosseguir — pode haver diferença de versão/ambiente.)

- [ ] **Step 2: Criar o script de baseline**

```js
// scripts/lint-baseline.mjs
// Gate "não piorar": roda ESLint, compara o total de ERROS com o baseline.
// Falha se aumentar. Se diminuir, pede atualização do baseline (ratchet).
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
```

- [ ] **Step 3: Gerar o baseline inicial e o script npm**

```bash
node scripts/lint-baseline.mjs --update
```

Expected: `Baseline atualizado: 616 erros.` (ou o número atual). Em `package.json`, adicionar em `scripts`:

```json
    "lint:gate": "node scripts/lint-baseline.mjs",
```

- [ ] **Step 4: Trocar o step do CI**

Em `.github/workflows/ci.yml`, trocar:

```yaml
      - name: Lint
        run: npm run lint
```

por:

```yaml
      - name: Lint (gate: não piorar — baseline em scripts/lint-baseline.json)
        run: npm run lint:gate
```

- [ ] **Step 5: Testar o gate localmente**

```bash
npm run lint:gate            # → ✅ Lint OK: 616 (baseline 616)
```

Teste de fumaça: introduzir um erro (ex.: variável não usada `const _x = 1` SEM prefixo maiúsculo em `src/lib/report.js`), rodar `npm run lint:gate`, ver `❌ Lint piorou`, e desfazer.

- [ ] **Step 6: Commit e push**

```bash
git add scripts/lint-baseline.mjs scripts/lint-baseline.json package.json .github/workflows/ci.yml
git commit -m "ci(lint): gate de nao-piorar com baseline (616 erros congelados, ratchet pra baixo)"
git push
```

### Task 1.2: E2E do caminho feliz do wizard

O fluxo mais crítico do app (criação de personagem) não tem E2E. Os bugs recentes ("Inscrever Herói falhava em silêncio") teriam sido pegos por este spec.

**Files:**
- Create: `e2e-pw/wizard.spec.js`
- Modify (se necessário): componentes do wizard para `data-testid`

- [ ] **Step 1: Estudar a infra E2E existente**

Ler `e2e-pw/persistence.spec.js` e `e2e-pw/smoke.spec.js` **antes de escrever qualquer código**: como eles autenticam (sessão mockada? usuário de teste?), como esperam o app carregar, e quais helpers exportam. Reusar exatamente o mesmo mecanismo de auth — não inventar um segundo.

- [ ] **Step 2: Mapear o fluxo real do wizard**

Rodar `npm run dev`, criar um personagem manualmente (Humano + Guerreiro nível 1, atributos padrão) e anotar: textos exatos dos botões de navegação entre blocos (raça → classe → atributos → revisão), texto do botão final ("Inscrever Herói") e o que a tela mostra após sucesso (redirect pra ficha? toast?).

- [ ] **Step 3: Escrever o spec**

Estrutura-alvo (adaptar seletores ao que o Step 2 mapeou; preferir `getByRole`/`getByText`; adicionar `data-testid` nos componentes do wizard apenas se texto/role for ambíguo):

```js
// e2e-pw/wizard.spec.js
import { test, expect } from '@playwright/test'
// import { <helperDeAuthDoProjeto> } from './<ondeQuerQueEleEsteja>'  ← Step 1

test.describe('Wizard de criação', () => {
  test('cria Guerreiro humano nível 1 e chega na ficha', async ({ page }) => {
    // 1. autenticar com o MESMO helper dos outros specs (Step 1)
    // 2. iniciar criação
    await page.getByRole('button', { name: /criar|novo personagem/i }).click()
    // 3. raça
    await page.getByText('Humano', { exact: false }).first().click()
    // (avançar — usar o texto real do botão mapeado no Step 2)
    // 4. classe
    await page.getByText('Guerreiro', { exact: false }).first().click()
    // 5. atributos (método padrão/array padrão)
    // 6. nome
    await page.getByLabel(/nome/i).fill('Teste E2E')
    // 7. finalizar
    await page.getByRole('button', { name: /inscrever herói/i }).click()
    // 8. verificação: ficha aberta com os dados
    await expect(page.getByText('Teste E2E')).toBeVisible()
    await expect(page.getByText(/guerreiro/i)).toBeVisible()
    // 9. deslocamento em metros na ficha (guarda da era pés→metros)
    await expect(page.getByText(/9\s*m/i)).toBeVisible()
  })
})
```

- [ ] **Step 4: Rodar até passar**

```bash
npx playwright test e2e-pw/wizard.spec.js --reporter=line
```

Expected: PASS. Se falhar por seletor, ajustar com `npx playwright test --ui` (ou adicionar `data-testid`).

- [ ] **Step 5: Commit e push**

```bash
git add e2e-pw/wizard.spec.js
git commit -m "test(e2e): caminho feliz do wizard — Guerreiro humano nv1 ate a ficha"
git push
```

---

# FASE 2 — Auditoria legal de conteúdo (1 dia + decisão do dono)

**Contexto:** SRD 5.1 é CC-BY-4.0 (livre com atribuição). Fora do SRD, PHB e Tasha são IP fechado da Wizards of the Coast. `public/srd-data/` distribui publicamente texto integral de ambos. Enquanto projeto pessoal, irrelevante; como produto que quer crescer, é o único risco existencial da lista.

### Task 2.1: Script de inventário SRD vs não-SRD

**Files:**
- Create: `scripts/audit-srd-content.mjs`
- Create (gerado): `docs/audits/2026-07-conteudo-nao-srd.md`

- [ ] **Step 1: Escrever o script**

```js
// scripts/audit-srd-content.mjs
// Inventário: o que em public/srd-data está coberto pelo SRD 5.1 (CC-BY-4.0)
// e o que é IP fechado da WotC (PHB não-SRD e Tasha inteiro).
// Gera docs/audits/2026-07-conteudo-nao-srd.md.
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import path from 'node:path'

const DIR = 'public/srd-data'

// SRD 5.1: UMA subclasse por classe. Tudo além disso no PHB é fechado.
const SRD_SUBCLASSES = new Set([
  'berserker', 'furia', // Bárbaro: Path of the Berserker
  'lore', 'conhecimento', // Bardo: College of Lore
  'life', 'vida', // Clérigo: Life Domain
  'land', 'terra', // Druida: Circle of the Land
  'champion', 'campeao', // Guerreiro: Champion
  'open-hand', 'mao-aberta', // Monge: Way of the Open Hand
  'devotion', 'devocao', // Paladino: Oath of Devotion
  'hunter', 'cacador', // Patrulheiro: Hunter
  'thief', 'ladrao', // Ladino: Thief
  'draconic', 'draconica', // Feiticeiro: Draconic Bloodline
  'fiend', 'corruptor', // Bruxo: The Fiend
  'evocation', 'evocacao', // Mago: School of Evocation
])
// SRD 5.1: um único feat (Grappler) e um único background (Acolyte).
const SRD_FEATS = new Set(['grappler', 'agarrador'])
const SRD_BACKGROUNDS = new Set(['acolyte', 'acolito'])

const norm = s => String(s ?? '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')

const lines = ['# Auditoria de conteúdo: SRD 5.1 vs IP fechado (WotC)', '',
  `Gerado por scripts/audit-srd-content.mjs em ${new Date().toISOString().slice(0, 10)}.`, '',
  '| Arquivo | KB | Classificação | Observação |', '|---|---|---|---|']

for (const f of readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
  const kb = Math.round(statSync(path.join(DIR, f)).size / 1024)
  let cls = '', obs = ''
  if (f.startsWith('5e-SRD-')) {
    cls = '✅ SRD 5.1 (CC-BY-4.0)'
    obs = 'Exige atribuição CC-BY no app.'
  } else if (f.startsWith('tasha-')) {
    cls = '🔴 IP fechado'
    obs = 'Tasha NÃO tem versão SRD. Texto integral = risco de takedown.'
  } else if (f.startsWith('phb-')) {
    cls = '🟡 Misto — auditar item a item'
    const data = JSON.parse(readFileSync(path.join(DIR, f), 'utf8'))
    const items = Array.isArray(data) ? data : Object.values(data).flat?.() ?? []
    if (f.includes('feats')) {
      const fechados = items.filter(i => !SRD_FEATS.has(norm(i.index ?? i.name)))
      obs = `${fechados.length}/${items.length} talentos fora do SRD.`
    } else if (f.includes('backgrounds')) {
      const fechados = items.filter(i => !SRD_BACKGROUNDS.has(norm(i.index ?? i.name)))
      obs = `${fechados.length}/${items.length} antecedentes fora do SRD.`
    } else if (f.includes('class')) {
      obs = 'Subclasses fora da lista SRD (1/classe) são fechadas; conferir descrições integrais.'
    } else {
      obs = 'Conferir se descrições são texto integral do livro ou resumo próprio.'
    }
  } else {
    cls = '⚪ Próprio/outro'
  }
  lines.push(`| ${f} | ${kb} | ${cls} | ${obs} |`)
}

lines.push('', '## Referência SRD 5.1 usada',
  '- Subclasses: ' + [...SRD_SUBCLASSES].join(', '),
  '- Feats: Grappler. Backgrounds: Acolyte.',
  '', '## Próximo passo', 'Decisão do dono — ver Task 2.2 do plano.')

writeFileSync('docs/audits/2026-07-conteudo-nao-srd.md', lines.join('\n') + '\n')
console.log('Relatório: docs/audits/2026-07-conteudo-nao-srd.md')
```

- [ ] **Step 2: Rodar e revisar o relatório**

```bash
node scripts/audit-srd-content.mjs
```

Ler o relatório gerado e **completar manualmente** a coluna de observações onde o script marcou "conferir" (amostrar 3–5 descrições por arquivo `phb-*` e comparar com o texto do livro: integral ou parafraseado?).

- [ ] **Step 3: Commit e push**

```bash
git add scripts/audit-srd-content.mjs docs/audits/2026-07-conteudo-nao-srd.md
git commit -m "docs(legal): auditoria SRD 5.1 vs conteudo fechado em public/srd-data"
git push
```

### Task 2.2: Decisão do dono (checkpoint — não executar sem resposta)

- [ ] Apresentar ao dono as opções, com recomendação:
  1. **(Recomendada a médio prazo)** Reescrever descrições fechadas como **resumos próprios** (paráfrase mecânica curta — o app já faz isso bem nos cards de feature) e manter texto integral só do SRD, com atribuição CC-BY-4.0 no rodapé/sobre.
  2. Mover JSONs fechados para **atrás de autenticação** (Supabase Storage/tabela com RLS) — reduz exposição, não elimina o problema.
  3. Aceitar o risco conscientemente por ora (documentar em `docs/decisions/`) e reavaliar antes de qualquer divulgação pública.
- [ ] Registrar a escolha em `docs/decisions/` e, se for a opção 1, abrir plano próprio de reescrita (é trabalho de conteúdo, não de código).

---

# FASE 3 — Regras de D&D (1–2 dias)

### Task 3.1: Auditar unidade do efeito `speed` de itens mágicos (pés vs metros)

`domain/magicItems.js:17` documenta "soma em **pés**"; o app hoje é todo em **metros**. Se os JSONs têm `value: 30` (Botas), a ficha soma 30 m.

**Files:**
- Modify: `src/systems/dnd5e/domain/magicItems.js` (comentário e/ou dados)
- Modify (se necessário): `public/srd-data/phb-magic-items-pt.json`, `public/srd-data/tasha-magic-items-pt.json`
- Test: `src/test/dnd5e/magic-items-speed.test.js` (novo)

- [ ] **Step 1: Inspecionar os dados reais**

```bash
node -e "const fs=require('fs');for(const f of ['phb-magic-items-pt.json','tasha-magic-items-pt.json']){const j=JSON.parse(fs.readFileSync('public/srd-data/'+f,'utf8'));const arr=Array.isArray(j)?j:Object.values(j).flat();for(const it of arr){for(const ef of it.effects??[]){if(ef.type==='speed')console.log(f,'|',it.name,'|',ef.value)}}}"
```

- [ ] **Step 2: Decidir pelo resultado**
  - Valores tipo `30`, `10` → estão em **pés**: converter nos JSONs para metros (30→9, 10→3, 5→1.5) e corrigir o comentário da linha 17 para "soma em **metros**".
  - Valores tipo `9`, `3` → já em metros: só corrigir o comentário da linha 17.
  - **Se mudar qualquer JSON em `public/srd-data`: bumpar `cacheName 'srd-data-vN'` em `vite.config.js`** (gotcha conhecido do SW).

- [ ] **Step 3: Teste de regressão (guarda de unidade)**

```js
// src/test/dnd5e/magic-items-speed.test.js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Nenhum item de D&D concede mais que +12m de deslocamento. Valor acima
// disso quase certamente está em pés (era pré-metros). Guarda contra
// regressão de unidade ao adicionar itens novos.
describe('efeitos speed de itens mágicos estão em metros', () => {
  for (const f of ['phb-magic-items-pt.json', 'tasha-magic-items-pt.json']) {
    it(f, () => {
      const raw = JSON.parse(readFileSync(`public/srd-data/${f}`, 'utf8'))
      const items = Array.isArray(raw) ? raw : Object.values(raw).flat()
      for (const item of items) {
        for (const ef of item.effects ?? []) {
          if (ef.type === 'speed') {
            expect(ef.value, `${item.name} (${ef.value})`).toBeLessThanOrEqual(12)
          }
        }
      }
    })
  }
})
```

Run: `npx vitest run src/test/dnd5e/magic-items-speed.test.js` → PASS (após correção do Step 2, se necessária).

- [ ] **Step 4: Commit e push**

```bash
git add src/systems/dnd5e/domain/magicItems.js src/test/dnd5e/magic-items-speed.test.js public/srd-data vite.config.js
git commit -m "fix(items): efeito speed em metros + teste-guarda de unidade"
git push
```

### Task 3.2: Enforcement de sintonização no domínio

A UI já bloqueia sintonização acima do teto (`Inventory.jsx`, que inclusive recebe `maxAttunement` do Artífice — teto 3/4/5/6 por nível via `getMaxAttunement` em `artificerInfusions.js`). Falta o domínio garantir a invariante para dados importados/legados, e a constante base deve morar no domínio (fonte única). **O limite NÃO é fixo em 3: Artífice nv10/14/18 eleva para 4/5/6** — o enforcement precisa aceitar o teto do personagem.

**Files:**
- Modify: `src/systems/dnd5e/domain/magicItems.js` (exportar `MAX_ATTUNED` + `enforceAttunementLimit`)
- Modify: `src/systems/dnd5e/domain/characterSchema.js` (chamar na migração/normalização, passando o teto real)
- Modify: `src/systems/dnd5e/components/CharacterSheet/Inventory.jsx` (importar `MAX_ATTUNED` do domínio como default, apagar const local)
- Test: `src/test/dnd5e/attunement.test.js` (novo)

- [ ] **Step 1: Teste que falha**

```js
// src/test/dnd5e/attunement.test.js
import { describe, it, expect } from 'vitest'
import { MAX_ATTUNED, enforceAttunementLimit } from '../../systems/dnd5e/domain/magicItems'

const item = (n, attuned = true) => ({ id: n, name: n, requiresAttunement: true, attuned })

describe('enforceAttunementLimit', () => {
  it('limite base é 3 (PHB p.138)', () => {
    expect(MAX_ATTUNED).toBe(3)
  })
  it('desativa sintonizações além da 3ª, preservando as 3 primeiras', () => {
    const out = enforceAttunementLimit([item('a'), item('b'), item('c'), item('d')])
    expect(out.map(i => i.attuned)).toEqual([true, true, true, false])
  })
  it('respeita teto maior (Artífice nv10+ = 4)', () => {
    const items = [item('a'), item('b'), item('c'), item('d')]
    expect(enforceAttunementLimit(items, 4)).toBe(items) // nada muda
  })
  it('não mexe em lista dentro do limite (mesma referência)', () => {
    const items = [item('a'), item('b')]
    expect(enforceAttunementLimit(items)).toBe(items)
  })
  it('lista vazia/ausente não explode', () => {
    expect(enforceAttunementLimit()).toEqual([])
  })
})
```

Run: `npx vitest run src/test/dnd5e/attunement.test.js` → FAIL (funções não existem).

- [ ] **Step 2: Implementar no domínio**

Em `src/systems/dnd5e/domain/magicItems.js`:

```js
/** Máximo BASE de itens sintonizados por criatura (PHB p.138).
 *  Artífice eleva o teto por nível — ver getMaxAttunement em
 *  artificerInfusions.js; callers devem passar o teto real. */
export const MAX_ATTUNED = 3

/**
 * Normaliza a invariante de sintonização: no máximo `max` itens com
 * `attuned: true` (as primeiras ocorrências vencem — ordem do inventário).
 * A UI já impede o excesso; isto protege import/dados legados. Retorna a
 * MESMA referência se nada precisar mudar (não suja o autosave).
 */
export function enforceAttunementLimit(items = [], max = MAX_ATTUNED) {
  let count = 0
  let changed = false
  const out = items.map(item => {
    if (!item?.attuned) return item
    count += 1
    if (count <= max) return item
    changed = true
    return { ...item, attuned: false }
  })
  return changed ? out : items
}
```

- [ ] **Step 3: Ligar na normalização de carga**

Em `characterSchema.js`, localizar `migrateCharacter` e, no final da migração (independente de versão — é normalização idempotente), aplicar **com o teto real do personagem**:

```js
import { enforceAttunementLimit } from './magicItems'
import { getMaxAttunement } from './artificerInfusions'
// ...dentro de migrateCharacter, antes do return:
if (character.inventory?.items) {
  const normalized = enforceAttunementLimit(
    character.inventory.items,
    getMaxAttunement(character), // 3 base; Artífice nv10/14/18 → 4/5/6
  )
  if (normalized !== character.inventory.items) {
    character = { ...character, inventory: { ...character.inventory, items: normalized } }
  }
}
```

(Conferir a assinatura real de `getMaxAttunement` em `artificerInfusions.js` — ela já existe e é a mesma fonte que o Inventory usa via prop `maxAttunement`. Conferir também o caminho `inventory.items` no schema — é o que `Inventory.jsx:196` usa.)

- [ ] **Step 4: Unificar a constante na UI**

Em `Inventory.jsx`: a const local que serve de default quando não há prop `maxAttunement` passa a ser importada do domínio:

```js
import { MAX_ATTUNED } from '../../domain/magicItems'
```

(Ajustar o caminho relativo real do arquivo; manter a prop `maxAttunement` do Artífice funcionando como está.)

- [ ] **Step 5: Rodar testes + suíte**

`npx vitest run src/test/dnd5e/attunement.test.js` → PASS. `npm test` → sem regressões.

- [ ] **Step 6: Commit e push**

```bash
git add src/systems/dnd5e/domain/magicItems.js src/systems/dnd5e/domain/characterSchema.js src/systems/dnd5e/components/CharacterSheet/Inventory.jsx src/test/dnd5e/attunement.test.js
git commit -m "feat(rules): enforcement de 3 sintonizacoes no dominio (PHB p.138) + fonte unica MAX_ATTUNED"
git push
```

### Task 3.3: Extrair magias concedidas hardcoded para módulo de dados

`PACT_FAMILIAR_SPELL` e `PRIMAL_AWARENESS_GRANTS` vivem inline em `rules.js` (motor). Extrair para módulo de dados dedicado — cada feature opcional nova vira **dado**, não código no motor.

**Files:**
- Create: `src/systems/dnd5e/domain/grantedSpells.js`
- Modify: `src/systems/dnd5e/domain/rules.js:31-55` (remover blocos, importar)

- [ ] **Step 1: Criar o módulo de dados**

Criar `src/systems/dnd5e/domain/grantedSpells.js` e **mover** (recortar/colar sem alterar) os blocos de `rules.js`: a const `PACT_FAMILIAR_SPELL` (linhas 31–39), `PRIMAL_AWARENESS_LABEL` e `PRIMAL_AWARENESS_GRANTS` (linhas 41–55), com os comentários. Exportar os três:

```js
/**
 * Magias concedidas por features (dados, não regra). O motor (rules.js)
 * consome via syncGrantedSpells. Adicionar feature nova = adicionar dado
 * aqui (ou em JSON futuro), sem tocar no motor.
 */
export const PACT_FAMILIAR_SPELL = Object.freeze({ /* …bloco movido de rules.js:31-39… */ })

export const PRIMAL_AWARENESS_LABEL = 'Consciência Primordial'

export const PRIMAL_AWARENESS_GRANTS = [ /* …bloco movido de rules.js:49-55, incluindo o .map final… */ ]
```

- [ ] **Step 2: Importar em rules.js**

No topo de `rules.js`:

```js
import { PACT_FAMILIAR_SPELL, PRIMAL_AWARENESS_LABEL, PRIMAL_AWARENESS_GRANTS } from './grantedSpells'
```

E apagar as declarações originais.

- [ ] **Step 3: A suíte existente é a rede**

```bash
npm test
```

Expected: PASS — `syncGrantedSpells` tem testes; refactor é mecânico, zero mudança de comportamento.

- [ ] **Step 4: Commit e push**

```bash
git add src/systems/dnd5e/domain/grantedSpells.js src/systems/dnd5e/domain/rules.js
git commit -m "refactor(rules): magias concedidas por feature viram modulo de dados (grantedSpells)"
git push
```

### Task 3.4: Condições e exaustão aplicam efeito no deslocamento

As condições já são exibidas com `rule` em tooltip. Próximo passo de "a ficha aplica a regra por você": deslocamento **efetivo** derivado de condições/exaustão, mostrado na ficha.

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js` (nova função pura)
- Modify: `src/systems/dnd5e/components/CharacterSheet/CombatStats.jsx` (exibição)
- Test: `src/test/dnd5e/effective-speed.test.js` (novo)

- [ ] **Step 1: Teste que falha**

```js
// src/test/dnd5e/effective-speed.test.js
import { describe, it, expect } from 'vitest'
import { effectiveSpeed } from '../../systems/dnd5e/domain/rules'

const char = (speed, conditions = [], exhaustion = 0) => ({
  combat: { speed, conditions, exhaustion },
})

describe('effectiveSpeed (PHB p.290-291)', () => {
  it('sem condição: velocidade base', () => {
    expect(effectiveSpeed(char(9))).toBe(9)
  })
  it('agarrado/impedido/paralisado/petrificado/inconsciente: 0', () => {
    for (const c of ['grappled', 'restrained', 'paralyzed', 'petrified', 'unconscious']) {
      expect(effectiveSpeed(char(9, [c])), c).toBe(0)
    }
  })
  it('exaustão 2+: metade (metros fracionários ok)', () => {
    expect(effectiveSpeed(char(9, [], 2))).toBe(4.5)
  })
  it('exaustão 5+: 0', () => {
    expect(effectiveSpeed(char(9, [], 5))).toBe(0)
  })
  it('condição vence exaustão (0 é 0)', () => {
    expect(effectiveSpeed(char(9, ['grappled'], 2))).toBe(0)
  })
})
```

Run: `npx vitest run src/test/dnd5e/effective-speed.test.js` → FAIL.

- [ ] **Step 2: Implementar a função pura**

Em `rules.js`:

```js
/** Condições que zeram o deslocamento (PHB p.290-291). */
const SPEED_ZERO_CONDITIONS = new Set([
  'grappled', 'restrained', 'paralyzed', 'petrified', 'stunned', 'unconscious',
])

/**
 * Deslocamento efetivo em metros, derivado de condições ativas e exaustão.
 * Exaustão nv2+ = metade; nv5+ = 0 (PHB p.291). Não altera combat.speed —
 * é derivação de leitura, como CA.
 */
export function effectiveSpeed(character) {
  const base = character.combat?.speed ?? 9
  const exhaustion = character.combat?.exhaustion ?? 0
  const conditions = character.combat?.conditions ?? []
  if (exhaustion >= 5) return 0
  if (conditions.some(c => SPEED_ZERO_CONDITIONS.has(c))) return 0
  return exhaustion >= 2 ? base / 2 : base
}
```

- [ ] **Step 3: Rodar o teste** → PASS.

- [ ] **Step 4: Exibir na ficha**

Ler `CombatStats.jsx` e localizar onde `combat.speed` é renderizado. Trocar a exibição para: valor efetivo em destaque; quando `effectiveSpeed !== combat.speed`, mostrar o base riscado ao lado e um tooltip com o motivo (nomes das condições ativas que zeram / "Exaustão nível N"), seguindo o padrão visual do `InfoPopover` já existente. Verificar no `npm run dev`: ficha com condição "Agarrado" mostra `0 m` e o base riscado.

- [ ] **Step 5: Commit e push**

```bash
git add src/systems/dnd5e/domain/rules.js src/systems/dnd5e/components/CharacterSheet/CombatStats.jsx src/test/dnd5e/effective-speed.test.js
git commit -m "feat(rules): deslocamento efetivo derivado de condicoes e exaustao"
git push
```

---

# FASE 4 — Fronteira multi-sistema (sub-projeto ~1 semana — PLANO PRÓPRIO)

> **Não executar desta seção.** Escopo e critérios para o plano detalhado (`docs/superpowers/plans/`), a escrever quando a fase começar. Depende da Task 0.3 (regra ESLint no lugar).

**Problema:** o contrato System (`core.js`, 4 funções) não cobre o que a casca usa; 6 arquivos importam entranhas do dnd5e; `utils/calculations.js` (casca) ↔ `domain/rules.js` (sistema) formam ciclo de camadas. Daggerheart é inviável sem resolver isto.

**Escopo do plano futuro:**
1. **Mover utilitários 100% D&D para dentro do sistema**: `utils/calculations.js`, `spellcasting.js`, `hitDice.js`, `rest.js`, `attacks.js`, `draconicAncestors.js`, `weaponI18n.js`, `spellFilters.js`, `monsters.js`/`monsters-i18n.js` → `src/systems/dnd5e/` (em `domain/` ou `utils/` interno). Movimentação mecânica: `git mv` + atualização de imports + suíte verde por movimento.
2. **Engordar o contrato** em `core.js` com o que os hooks precisam: `defaultCharacter()`, `defaultFeatureUses(char)`, `derivedStats(char)` (CA, iniciativa, deslocamento efetivo), `spellcastingInfo(char)`. Assinaturas agnósticas (entra `character`, sai dados prontos pra UI).
3. **Migrar os hooks**: `useCharacter`, `useCharacterCalculations`, `useClassSpells`, `useTabValidation` passam a consumir só o contrato — ou movem-se para dentro do sistema, expostos via `ui.jsx`/registry.
4. **Esvaziar a whitelist** da Task 0.3, um arquivo por task. Critério de aceite final: whitelist vazia + `npx eslint .` sem novos erros + suíte e E2E verdes.
5. **God files no caminho**: ao mexer em `useCharacter.js` (798 linhas), extrair os domínios óbvios (HP/dano/cura, feature uses, inventário) em módulos — sem reescrever o que não for tocado.

**Riscos a documentar no plano:** ordem dos movimentos importa (mover `calculations.js` primeiro desfaz o ciclo); `characterCodec`/`storage` podem ter acoplamento sutil; imports em `src/test/**` também precisam atualizar.

---

# FASE 5 — Tokens semânticos + dark mode (sub-projeto ~1 semana — PLANO PRÓPRIO)

> **Não executar desta seção.** O remap invertido de `gray-*` → pergaminho em `index.css` funciona, mas é armadilha para todo componente novo e **bloqueia dark mode**. Fazer antes de escrever muitos componentes novos.

**Escopo do plano futuro:**
1. Definir tokens semânticos no `@theme`: `--color-surface` (papel base), `--color-surface-raised`, `--color-surface-sunken`, `--color-text`, `--color-text-muted`, `--color-text-faint`, `--color-edge` (bordas), `--color-accent` (gilt), `--color-danger`, `--color-success` — mapeados para a paleta parchment/ink atual.
2. Migrar componentes por tela (ordem: CharacterSheet → Wizard → CharacterList → resto), trocando `bg-gray-800 text-gray-300` etc. pelos tokens. Uma tela por task, screenshot antes/depois.
3. Quando nenhum componente usar `gray-*`/`amber-*` remapeados: **remover o remap** do `index.css` (o gotcha morre aqui).
4. Tema escuro: bloco `[data-theme="dark"]` redefinindo só os tokens (tinta clara sobre couro escuro, mantendo a identidade), toggle na UI com persistência em `localStorage` + respeito a `prefers-color-scheme`, `theme-color` do PWA acompanhando.
5. Critério de aceite: zero classes `gray-*` em `src/`, dark mode funcional nas 4 telas principais, contraste AA nos dois temas (medido — ver Fase 6).

---

# FASE 6 — Acessibilidade (2–3 dias)

### Task 6.1: Auditoria automatizada com axe

**Files:**
- Create: `e2e-pw/a11y.spec.js`
- Modify: `package.json` (dev dep)

- [ ] **Step 1: Instalar**

```bash
npm install -D @axe-core/playwright
```

- [ ] **Step 2: Spec de auditoria**

```js
// e2e-pw/a11y.spec.js
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
// Reusar o helper de auth dos outros specs para as telas autenticadas
// (mesmo mecanismo do wizard.spec.js — ver Task 1.2 Step 1).

test.describe('Acessibilidade (WCAG 2.1 AA)', () => {
  test('tela de login sem violações críticas', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const critical = results.violations.filter(v => ['critical', 'serious'].includes(v.impact))
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([])
  })
  // Repetir o padrão para: lista de personagens, ficha (aba Combate) e
  // primeiro bloco do wizard — autenticando com o helper do projeto.
})
```

- [ ] **Step 3: Rodar e catalogar**

```bash
npx playwright test e2e-pw/a11y.spec.js --reporter=line
```

Primeira rodada VAI falhar — é o objetivo: o JSON da falha lista as violações. Copiar para `docs/audits/2026-07-a11y.md` e priorizar: contraste, `aria-label` faltando em botões-ícone, foco.

- [ ] **Step 4: Corrigir as violações critical/serious** — uma task de correção por tela, com o spec como verificação (re-rodar até verde).

- [ ] **Step 5: Commit e push (spec + relatório; correções em commits próprios por tela)**

```bash
git add e2e-pw/a11y.spec.js docs/audits/2026-07-a11y.md package.json package-lock.json
git commit -m "test(a11y): auditoria axe nas telas principais + relatorio inicial"
git push
```

### Task 6.2: Contraste do texto "faded" (`ink-50`)

**Files:**
- Modify: `src/index.css` (valor de `--color-ink-50`)

- [ ] **Step 1: Medir o contraste atual**

```bash
node -e "
const L=h=>{const[r,g,b]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b};
const cr=(a,b)=>{const[x,y]=[L(a),L(b)].sort((p,q)=>q-p);return((x+.05)/(y+.05)).toFixed(2)};
console.log('ink-50 #8a7456 sobre parchment-200 #e8dcc0:', cr('#8a7456','#e8dcc0'));
console.log('candidato #6b5640 (ink-100):', cr('#6b5640','#e8dcc0'));
console.log('candidato #5a4530 (ink-200):', cr('#5a4530','#e8dcc0'));
"
```

- [ ] **Step 2: Escolher o valor** — o menor tom que atinja **≥ 4.5:1** sobre `#e8dcc0` (texto pequeno, WCAG AA). Se `#6b5640` passar, usar ele (mantém a hierarquia visual "faded" sem reprovar).

- [ ] **Step 3: Aplicar** em `index.css`, atualizando o comentário `/* faded */` com a razão medida. Verificar visualmente as telas que usam `text-ink-50`/`text-gray-400` (que remapeia pra ink-100 — conferir se o remap também precisa do ajuste).

- [ ] **Step 4: Commit e push**

```bash
git add src/index.css
git commit -m "fix(a11y): contraste do texto faded atinge WCAG AA (4.5:1) sobre pergaminho"
git push
```

---

# FASE 7 — Retrato: base64 → Supabase Storage (sub-projeto ~3 dias — PLANO PRÓPRIO)

> **Não executar desta seção.** Hoje `info.portrait` é data-URL base64 dentro do JSON da ficha: cada autosave reenvia a imagem inteira, o realtime trafega isso e a linha do Postgres incha.

**Escopo do plano futuro:**
1. Migration `0015`: bucket `portraits` no Supabase Storage com RLS por dono (mesmo padrão de policy das migrations 0007/0011).
2. Upload no wizard/ficha: redimensionar client-side (max ~512px, webp) antes de subir; `info.portrait` passa a guardar a URL pública (ou signed URL, decidir no plano conforme privacidade de fichas).
3. Migração lazy no load: `migrateCharacter` detecta data-URL → agenda upload → troca por URL → salva (schemaVersion **v5**; escrever migração seguindo o padrão documentado no header do `characterSchema.js`).
4. Offline (PWA): retrato cai no cache de runtime do SW; fallback = silhueta da classe (ícone já existente em `class-icons.jsx`).
5. Critério de aceite: autosave de uma ficha com retrato não excede ~10 KB de payload; fichas antigas migram sozinhas ao abrir.

---

# FASE 8 — Quick builds no wizard (feature ~3 dias — BRAINSTORMING + PLANO PRÓPRIO)

> **Não executar desta seção.** Feature nova de produto — passar por `superpowers:brainstorming` antes de planejar (regra do fluxo). Maior alavanca para a meta de crescer com novatos.

**Semente da spec:** o PHB traz "construção rápida" para cada classe (atributos prioritários, perícias, equipamento, antecedente sugerido). Adicionar `quickBuild` ao `phb-classes-pt.json` (dados, não código — mesma filosofia da Task 3.3) e um botão "Montar sugerido" no wizard que preenche os blocos e deixa o usuário revisar/ajustar antes de inscrever. Decisões para o brainstorming: onde o botão entra no fluxo, se preenche tudo ou bloco a bloco, e como interage com fontes (Tasha ligada muda sugestões?).

---

# FASE 9 — Tipagem gradual do domínio (contínua)

### Task 9.1: `@ts-check` + typedefs no motor de regras

**Files:**
- Create: `src/systems/dnd5e/domain/types.js`
- Modify: `src/systems/dnd5e/domain/rules.js` (header)

- [ ] **Step 1:** Criar `types.js` com os typedefs centrais, derivados do schema Zod (manter em sincronia é responsabilidade de quem mudar o schema):

```js
/**
 * Typedefs centrais do domínio (JSDoc). Fonte da verdade continua sendo
 * characterSchema.js (Zod) — isto dá checagem de editor/CI sem migrar pra TS.
 * @typedef {'str'|'dex'|'con'|'int'|'wis'|'cha'} AbilityKey
 * @typedef {Object} Combat
 * @property {number} maxHp
 * @property {number} currentHp
 * @property {number} tempHp
 * @property {number} speed        Deslocamento em METROS.
 * @property {string[]} conditions IDs de domain/conditions.js.
 * @property {number} exhaustion   0-6.
 * @typedef {Object} Character
 * @property {Record<AbilityKey, number>} attributes
 * @property {Combat} combat
 */
export {}
```

- [ ] **Step 2:** Adicionar `// @ts-check` na primeira linha de `rules.js` e anotar as funções públicas com `@param {import('./types').Character} character`. Corrigir o que o checker apontar (ou anotar `@ts-expect-error` com justificativa quando for falso positivo).
- [ ] **Step 3:** Política contínua: todo arquivo novo em `domain/` nasce com `// @ts-check`.
- [ ] **Step 4:** Commit e push: `git commit -m "chore(domain): @ts-check + typedefs centrais no motor de regras"`

---

# FASE 10 — Política de god files (contínua, sem tasks)

Regra de convivência (não refatorar por refatorar): **ao abrir um arquivo >600 linhas para mexer, extrair o pedaço tocado** para um módulo focado, com os testes acompanhando. Alvos conhecidos: `CombatClassActions.jsx` (910), `Spells.jsx` (902), `FeaturesTab.jsx` (880), `CombatStats.jsx` (799), `useCharacter.js` (798 — a Fase 4 já força a divisão dele), `PrintView.jsx` (726), `Inventory.jsx` (710).

---

## Rastreabilidade: crítica → fase

| Ponto da análise | Onde é resolvido |
|---|---|
| Bug `speed: 30` default | Task 0.1 |
| Fontes via CDN (PWA offline/privacidade) | Task 0.2 |
| Fronteira vazada + ciclo utils↔domain | Task 0.3 (congela) + Fase 4 (resolve) |
| Lint 616 erros sem gate | Task 1.1 |
| E2E raso (wizard sem cobertura) | Task 1.2 |
| Risco legal PHB/Tasha não-SRD | Fase 2 |
| Efeito `speed` de item em pés | Task 3.1 |
| Sintonização sem enforcement no domínio | Task 3.2 |
| Dados de regra hardcoded no motor | Task 3.3 |
| Condições rastreadas mas não aplicadas | Task 3.4 |
| Remap invertido gray→parchment | Fase 5 |
| Sem dark mode | Fase 5 |
| Contraste/aria incompletos | Fase 6 |
| Retrato base64 no autosave | Fase 7 |
| Onboarding/quick builds | Fase 8 |
| Sem tipagem no domínio | Fase 9 |
| God files | Fase 10 + Fase 4 |
