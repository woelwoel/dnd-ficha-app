# Tasha — Fundação de Fontes (com talentos como fatia vertical) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a infraestrutura de procedência (`source`) e de seleção de fontes por personagem, provada de ponta a ponta com os **talentos** do Caldeirão de Tasha, e fechar um spike que decide o quanto o motor de regras precisa mudar pro Artífice.

**Architecture:** Conteúdo suplementar vive em arquivos `tasha-*-pt.json` (espelhando o padrão `phb-*`), cada item carimbado `source: "tasha"`. O `SrdProvider` carrega e mescla PHB + suplementos num catálogo único, carimbando procedência. A seleção de fontes é por ficha (`meta.settings.sources`, default `["phb"]`). A filtragem por fonte acontece **no consumo** (alimentação dos pickers), nunca na renderização do que a ficha já tem.

**Tech Stack:** React + Vite, Zod (schema de ficha), Vitest + @testing-library/react (testes), Python + pymupdf (esteira de extração, descartável). Workbox/SW via `vite-plugin-pwa` (cache `srd-data-vN`).

---

## Estrutura de arquivos

**Criar:**
- `src/systems/dnd5e/domain/sources.js` — fonte única de verdade da procedência: constante `SOURCES`, `sourceOf(item)`, `tagSource(items, code)`, `filterCatalogBySources(items, activeSources)`.
- `src/systems/dnd5e/components/SourceBadge.jsx` — selo visual de procedência (não renderiza nada pra `phb`).
- `public/srd-data/tasha-feats-pt.json` — talentos do Tasha (gerado pela esteira).
- `scripts/tasha/extract_text.py` — extrai texto do PDF e repara acentos.
- `scripts/tasha/build_feats.py` — estrutura os talentos no schema de feats.
- `docs/superpowers/notes/2026-06-23-artifice-spike.md` — achados do spike do motor de regras.
- Testes: `src/test/dnd5e/sources.test.js`, `src/test/dnd5e/tasha-feats-schema.test.js`, `src/test/dnd5e/SrdProvider-merge.test.jsx`, `src/test/dnd5e/SourceBadge.test.jsx`, `src/test/dnd5e/feat-source-gating.test.jsx`.

**Modificar:**
- `src/systems/dnd5e/data/SrdProvider.jsx` — entradas Tasha no `DATASETS`, merge carimbado por tipo.
- `src/systems/dnd5e/domain/characterSchema.js` — `sources` em `settingsSchema`.
- `src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx` — filtra `feats` pela fonte; controle "Fontes".
- `src/systems/dnd5e/components/CharacterSheet/...` — filtra `feats` pela fonte nos pickers; controle "Fontes" editável.
- `vite.config.js` — bump `cacheName` `srd-data-v7` → `srd-data-v8`.

---

## Task 1: Constante SOURCES + helpers de procedência

**Files:**
- Create: `src/systems/dnd5e/domain/sources.js`
- Test: `src/test/dnd5e/sources.test.js`

- [ ] **Step 1: Escreva o teste que falha**

```js
// src/test/dnd5e/sources.test.js
import { describe, it, expect } from 'vitest'
import { SOURCES, sourceOf, tagSource, filterCatalogBySources } from '../../systems/dnd5e/domain/sources'

describe('sources — procedência', () => {
  it('PHB e Tasha existem com metadados de exibição', () => {
    expect(SOURCES.phb.label).toBeTruthy()
    expect(SOURCES.tasha.label).toMatch(/Tasha/i)
    expect(SOURCES.tasha.abbr).toBe('TCE')
  })

  it('sourceOf cai em phb quando o item não declara source', () => {
    expect(sourceOf({ index: 'x' })).toBe('phb')
    expect(sourceOf({ index: 'x', source: 'tasha' })).toBe('tasha')
  })

  it('tagSource carimba todos os itens sem mutar o original', () => {
    const input = [{ index: 'a' }]
    const out = tagSource(input, 'tasha')
    expect(out[0].source).toBe('tasha')
    expect(input[0].source).toBeUndefined()
  })
})
```

- [ ] **Step 2: Rode pra ver falhar**

Run: `npm test -- src/test/dnd5e/sources.test.js`
Expected: FAIL — `Failed to resolve import .../domain/sources`.

- [ ] **Step 3: Implemente o mínimo**

```js
// src/systems/dnd5e/domain/sources.js
/**
 * Procedência de conteúdo D&D 5e. Fonte única de verdade dos códigos de fonte
 * e seus metadados de exibição. Ausência de `source` num item = 'phb' (básico).
 */
export const SOURCES = {
  phb:   { code: 'phb',   label: "Livro do Jogador",                  abbr: 'PHB' },
  tasha: { code: 'tasha', label: 'Caldeirão de Tasha para Tudo',      abbr: 'TCE' },
}

/** Código de fonte de um item, com fallback pro básico. */
export function sourceOf(item) {
  return (item && typeof item.source === 'string' && item.source) || 'phb'
}

/** Devolve uma cópia dos itens carimbados com o código de fonte dado. */
export function tagSource(items, code) {
  return (items ?? []).map(it => ({ ...it, source: it?.source ?? code }))
}
```

- [ ] **Step 4: Rode pra ver passar (filterCatalogBySources vem na Task 2)**

Run: `npm test -- src/test/dnd5e/sources.test.js -t "procedência"`
Expected: os 3 testes de procedência PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/sources.js src/test/dnd5e/sources.test.js
git commit -m "feat(dnd5e): constante SOURCES + sourceOf/tagSource (procedência)"
```

---

## Task 2: filterCatalogBySources (gating no consumo)

**Files:**
- Modify: `src/systems/dnd5e/domain/sources.js`
- Test: `src/test/dnd5e/sources.test.js`

- [ ] **Step 1: Escreva o teste que falha**

```js
// adicionar em src/test/dnd5e/sources.test.js
describe('filterCatalogBySources — oferta', () => {
  const catalogo = [
    { index: 'phb-feat' },                       // sem source = phb
    { index: 'tasha-feat', source: 'tasha' },
  ]

  it('só phb: oferta esconde itens de Tasha', () => {
    const out = filterCatalogBySources(catalogo, ['phb'])
    expect(out.map(i => i.index)).toEqual(['phb-feat'])
  })

  it('phb+tasha: oferta inclui ambos', () => {
    const out = filterCatalogBySources(catalogo, ['phb', 'tasha'])
    expect(out.map(i => i.index)).toEqual(['phb-feat', 'tasha-feat'])
  })

  it('sources ausente/vazio cai em só phb (fichas legadas)', () => {
    expect(filterCatalogBySources(catalogo, undefined).map(i => i.index)).toEqual(['phb-feat'])
    expect(filterCatalogBySources(catalogo, []).map(i => i.index)).toEqual(['phb-feat'])
  })
})
```

- [ ] **Step 2: Rode pra ver falhar**

Run: `npm test -- src/test/dnd5e/sources.test.js -t "oferta"`
Expected: FAIL — `filterCatalogBySources is not a function`.

- [ ] **Step 3: Implemente**

```js
// adicionar em src/systems/dnd5e/domain/sources.js
/**
 * Filtra um catálogo (talentos, magias, subclasses, itens) pelas fontes ativas
 * da ficha. PHB está SEMPRE incluído. `activeSources` ausente/vazio = só PHB.
 *
 * IMPORTANTE: usar só pra decidir o que é OFERECIDO nos pickers. NÃO usar pra
 * filtrar o que a ficha já tem — conteúdo já escolhido sempre renderiza.
 */
export function filterCatalogBySources(items, activeSources) {
  const active = new Set(['phb', ...(Array.isArray(activeSources) ? activeSources : [])])
  return (items ?? []).filter(it => active.has(sourceOf(it)))
}
```

- [ ] **Step 4: Rode pra ver passar**

Run: `npm test -- src/test/dnd5e/sources.test.js`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/sources.js src/test/dnd5e/sources.test.js
git commit -m "feat(dnd5e): filterCatalogBySources — gating de oferta por fonte"
```

---

## Task 3: `sources` no schema da ficha (default ["phb"])

**Files:**
- Modify: `src/systems/dnd5e/domain/characterSchema.js` (bloco `settingsSchema`, ~linha 55)
- Test: `src/test/dnd5e/character-sources-default.test.js`

- [ ] **Step 1: Escreva o teste que falha**

```js
// src/test/dnd5e/character-sources-default.test.js
import { describe, it, expect } from 'vitest'
import { safeParseCharacter } from '../../systems/dnd5e/domain/characterSchema'

// Helper: ficha mínima válida. Ajuste os campos obrigatórios conforme o schema
// real exigir (rode o teste; o erro Zod aponta o que falta).
function minimalCharacter(overrides = {}) {
  return {
    id: 'c1',
    meta: { createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    name: 'Teste',
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    ...overrides,
  }
}

describe('ficha — sources default', () => {
  it('ficha legada sem settings.sources cai em ["phb"]', () => {
    const res = safeParseCharacter(minimalCharacter())
    expect(res.success).toBe(true)
    expect(res.data.meta.settings.sources).toEqual(['phb'])
  })

  it('preserva sources declaradas', () => {
    const res = safeParseCharacter(minimalCharacter({
      meta: { createdAt: 'x', updatedAt: 'x', settings: { sources: ['phb', 'tasha'] } },
    }))
    expect(res.data.meta.settings.sources).toEqual(['phb', 'tasha'])
  })
})
```

- [ ] **Step 2: Rode pra ver falhar**

Run: `npm test -- src/test/dnd5e/character-sources-default.test.js`
Expected: FAIL — `settings.sources` undefined (e possivelmente `settings` ausente).

- [ ] **Step 3: Implemente — adicione `sources` ao settingsSchema**

Em `characterSchema.js`, dentro de `settingsSchema` (junto de `flexibleRacialAsi`), adicione e garanta default do objeto:

```js
const settingsSchema = z.object({
  allowFeats: z.boolean().default(false),
  allowMulticlass: z.boolean().default(false),
  flexibleRacialAsi: z.boolean().default(false),
  /**
   * Fontes de conteúdo ativas na ficha. PHB é implícito; manter sempre
   * presente. Ausência (fichas legadas) = só básico. Ver domain/sources.js.
   */
  sources: z.array(z.string()).default(['phb']),
}).partial().default({ sources: ['phb'] })
```

Garanta que `metaSchema.settings` tenha default também, pra ficha sem `settings`
materializar `sources`. Troque `settings: settingsSchema.optional()` por:

```js
  settings: settingsSchema.default({ sources: ['phb'] }),
```

- [ ] **Step 4: Rode pra ver passar**

Run: `npm test -- src/test/dnd5e/character-sources-default.test.js`
Expected: PASS. Se o helper `minimalCharacter` faltar campo obrigatório, o erro Zod dirá qual — complete e rode de novo.

- [ ] **Step 5: Rode a suíte de schema existente (não regredir)**

Run: `npm test -- src/test/ -t "schema"`
Expected: verde. Se algum teste assumia `settings` ausente, ajuste a expectativa pra refletir o novo default.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/domain/characterSchema.js src/test/dnd5e/character-sources-default.test.js
git commit -m "feat(dnd5e): meta.settings.sources com default ['phb']"
```

---

## Task 4: Esteira de extração — texto + reparo de acento

**Files:**
- Create: `scripts/tasha/extract_text.py`
- Create: `scripts/tasha/README.md`

> Esta é ferramenta descartável (não roda em produção). Não tem teste vitest;
> a validação é por inspeção do output e, na Task 6, por schema do JSON gerado.
> O PDF-fonte fica fora do repo (`C:\Users\gvfar\OneDrive\RPG BIGBIG\...`).

- [ ] **Step 1: Escreva o extrator**

```python
# scripts/tasha/extract_text.py
"""Extrai texto do PDF do Caldeirão de Tasha e repara acentos quebrados.

A extração crua quebra acentuação (problema de cmap/fonte): 'MÚSICA' sai como
'M�SICA'. Este script normaliza o texto pra UTF-8 utilizável.

Uso:
    python scripts/tasha/extract_text.py "<caminho-do-pdf>" --pages 5-30 > out.txt
"""
import argparse, sys, unicodedata
import fitz  # pymupdf

# Mapa de reparo: caracteres-réplica → acento correto. Preencher iterativamente
# inspecionando o output (cada PDF fan-translation tem seu próprio mapeamento).
REPAIRS = {
    "�": "",  # placeholder; refinar por contexto abaixo
}

def repair(text: str) -> str:
    for bad, good in REPAIRS.items():
        text = text.replace(bad, good)
    return unicodedata.normalize("NFC", text)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--pages", default=None, help="ex: 5-30")
    args = ap.parse_args()
    doc = fitz.open(args.pdf)
    if args.pages:
        a, b = args.pages.split("-")
        rng = range(int(a), int(b) + 1)
    else:
        rng = range(len(doc))
    for pno in rng:
        if pno < len(doc):
            sys.stdout.write(repair(doc[pno].get_text()))
            sys.stdout.write(f"\n\n----- p.{pno} -----\n\n")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rode numa amostra e inspecione acentos**

Run: `python scripts/tasha/extract_text.py "C:/Users/gvfar/OneDrive/RPG BIGBIG/D&D 5e - Caldeirão de Tasha para Tudo (Versão Fã) (1).pdf" --pages 70-90 | head -60`
Expected: páginas de talentos legíveis. Onde aparecerem `�` ou ligaduras
erradas, descubra o caractere-fonte e **adicione o par em `REPAIRS`**. Repita até
uma amostra de talentos sair com acentuação correta.

- [ ] **Step 3: Documente o mapa de reparo**

Escreva em `scripts/tasha/README.md` quais páginas contêm cada tipo de conteúdo
(talentos, subclasses, magias, itens, Artífice) e o estado do mapa `REPAIRS`.

- [ ] **Step 4: Commit**

```bash
git add scripts/tasha/extract_text.py scripts/tasha/README.md
git commit -m "chore(tasha): esteira de extração de texto + reparo de acento"
```

---

## Task 5: Estruturar talentos do Tasha em JSON

**Files:**
- Create: `scripts/tasha/build_feats.py`
- Create: `public/srd-data/tasha-feats-pt.json` (gerado)

> O schema-alvo é o de `public/srd-data/phb-feats-pt.json`:
> `{ index, name, prereq?, stackable?, desc }`. Cada item recebe `source: "tasha"`.

- [ ] **Step 1: Escreva o estruturador**

```python
# scripts/tasha/build_feats.py
"""Transforma o texto extraído dos talentos do Tasha no schema de feats.

Entrada: arquivo de texto já reparado (saída de extract_text.py nas páginas de
talentos). Saída: public/srd-data/tasha-feats-pt.json.

Heurística de parsing: cada talento começa por um título em linha própria,
seguido do corpo até o próximo título. Pré-requisitos, quando houver, viram o
objeto `prereq` no mesmo formato do phb-feats-pt.json. Revisar a saída à mão —
talentos com pré-requisito e com escolha de atributo são os de maior risco.
"""
import json, re, sys, unicodedata

def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def parse_feats(raw: str) -> list[dict]:
    feats = []
    # Preencher a lógica de split conforme o layout real do texto extraído.
    # Cada feat: { index, name, desc, source: 'tasha' } (+ prereq quando houver).
    # ... estruturação aqui ...
    return feats

if __name__ == "__main__":
    raw = sys.stdin.read()
    feats = [{**f, "source": "tasha"} for f in parse_feats(raw)]
    json.dump(feats, sys.stdout, ensure_ascii=False, indent=2)
```

- [ ] **Step 2: Gere o JSON**

Run: `python scripts/tasha/extract_text.py "<pdf>" --pages <pgs-talentos> | python scripts/tasha/build_feats.py > public/srd-data/tasha-feats-pt.json`
Expected: arquivo JSON com os talentos. Revise à mão: nomes corretos, descrições
completas, `prereq` certo nos que exigem.

- [ ] **Step 3: Commit**

```bash
git add scripts/tasha/build_feats.py public/srd-data/tasha-feats-pt.json
git commit -m "feat(tasha): talentos extraídos em tasha-feats-pt.json (source=tasha)"
```

---

## Task 6: Teste de schema do tasha-feats-pt.json

**Files:**
- Test: `src/test/dnd5e/tasha-feats-schema.test.js`

- [ ] **Step 1: Escreva o teste**

```js
// src/test/dnd5e/tasha-feats-schema.test.js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const feats = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../public/srd-data/tasha-feats-pt.json', import.meta.url)), 'utf-8')
)

describe('tasha-feats-pt.json', () => {
  it('não está vazio', () => {
    expect(Array.isArray(feats)).toBe(true)
    expect(feats.length).toBeGreaterThan(0)
  })

  it('todo item tem index, name, desc e source=tasha', () => {
    for (const f of feats) {
      expect(typeof f.index).toBe('string')
      expect(f.index).toMatch(/^[a-z0-9-]+$/)
      expect(typeof f.name).toBe('string')
      expect(typeof f.desc).toBe('string')
      expect(f.desc.length).toBeGreaterThan(10)
      expect(f.source).toBe('tasha')
    }
  })

  it('índices são únicos e não colidem com nada vazio', () => {
    const idx = feats.map(f => f.index)
    expect(new Set(idx).size).toBe(idx.length)
  })

  it('prereq, quando presente, usa um type conhecido', () => {
    const known = new Set(['spellcasting', 'ability', 'ability_or', 'proficiency'])
    for (const f of feats.filter(f => f.prereq)) {
      expect(known.has(f.prereq.type)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Rode**

Run: `npm test -- src/test/dnd5e/tasha-feats-schema.test.js`
Expected: PASS. Falhas apontam itens mal-estruturados na Task 5 — corrija o JSON
(ou o estruturador) e rode de novo.

- [ ] **Step 3: Commit**

```bash
git add src/test/dnd5e/tasha-feats-schema.test.js
git commit -m "test(tasha): valida schema de tasha-feats-pt.json"
```

---

## Task 7: SrdProvider mescla feats PHB + Tasha (carimbado)

**Files:**
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx`
- Test: `src/test/dnd5e/SrdProvider-merge.test.jsx`

- [ ] **Step 1: Escreva o teste que falha**

```jsx
// src/test/dnd5e/SrdProvider-merge.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SrdProvider, useLazySrdDataset } from '../../systems/dnd5e/data/SrdProvider'

function Probe() {
  const feats = useLazySrdDataset('feats')
  return <div data-testid="feats">{(feats ?? []).map(f => `${f.index}:${f.source}`).join(',')}</div>
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url) => {
    const body =
      url.includes('phb-feats')   ? [{ index: 'adepto-elemental', name: 'AE' }] :
      url.includes('tasha-feats') ? [{ index: 'esmagador', name: 'Esm', source: 'tasha' }] :
      []
    return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) })
  }))
})

describe('SrdProvider — merge de feats', () => {
  it('une phb (carimbado phb) + tasha (carimbado tasha)', async () => {
    render(<SrdProvider><Probe /></SrdProvider>)
    await waitFor(() => {
      const txt = screen.getByTestId('feats').textContent
      expect(txt).toContain('adepto-elemental:phb')
      expect(txt).toContain('esmagador:tasha')
    })
  })
})
```

- [ ] **Step 2: Rode pra ver falhar**

Run: `npm test -- src/test/dnd5e/SrdProvider-merge.test.jsx`
Expected: FAIL — só aparece `adepto-elemental` (sem carimbo, sem tasha).

- [ ] **Step 3: Implemente o merge no SrdProvider**

No `DATASETS`, adicione a entrada Tasha de talentos:

```js
  feats:       { pt: 'phb-feats-pt.json',   fallback: null, lazy: true },
  featsTasha:  { pt: 'tasha-feats-pt.json', fallback: null, lazy: true },
```

Defina os grupos de merge e carimbe na consolidação. Importe `tagSource` no topo:

```js
import { tagSource } from '../domain/sources'
```

Adicione um mapa de composição e ajuste `requestDataset`/`useLazySrdDataset`
pra, ao pedir um dataset "lógico" (ex.: `feats`), carregar suas partes e
devolver a união carimbada:

```js
// Datasets lógicos compostos por partes carimbadas por fonte.
// chave lógica → [ [parteKey, sourceCode], ... ]
const COMPOSED = {
  feats: [['feats', 'phb'], ['featsTasha', 'tasha']],
}

async function loadComposed(name) {
  const parts = COMPOSED[name]
  if (!parts) return null
  const loaded = await Promise.all(
    parts.map(async ([key, code]) => tagSource(await loadDataset(key, DATASETS[key]), code))
  )
  return loaded.flat()
}
```

Em `requestDataset`, antes de cair no `loadDataset` simples, trate compostos:

```js
  const requestDataset = useCallback((name) => {
    if (COMPOSED[name]) {
      return loadComposed(name).then(value => {
        setData(prev => (prev[name] === value ? prev : { ...prev, [name]: value }))
        return value
      })
    }
    const def = DATASETS[name]
    if (!def) return Promise.resolve(null)
    return loadDataset(name, def).then(value => {
      setData(prev => (prev[name] === value ? prev : { ...prev, [name]: value }))
      return value
    })
  }, [])
```

Garanta que `EMPTY_DEFAULTS.feats` continue `[]` (já é) pra o estado inicial.

- [ ] **Step 4: Rode pra ver passar**

Run: `npm test -- src/test/dnd5e/SrdProvider-merge.test.jsx`
Expected: PASS.

- [ ] **Step 5: Rode a suíte de provider/wizard existente**

Run: `npm test -- src/test/ -t "Srd"` e `npm test -- src/test/ -t "Wizard"`
Expected: verde (o catálogo `feats` agora vem carimbado; nenhum consumidor deve
quebrar por causa do campo extra `source`).

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/data/SrdProvider.jsx src/test/dnd5e/SrdProvider-merge.test.jsx
git commit -m "feat(dnd5e): SrdProvider mescla feats phb+tasha carimbados por fonte"
```

---

## Task 8: SourceBadge (selo de procedência)

**Files:**
- Create: `src/systems/dnd5e/components/SourceBadge.jsx`
- Test: `src/test/dnd5e/SourceBadge.test.jsx`

- [ ] **Step 1: Escreva o teste que falha**

```jsx
// src/test/dnd5e/SourceBadge.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SourceBadge } from '../../systems/dnd5e/components/SourceBadge'

describe('SourceBadge', () => {
  it('não renderiza nada pro básico (phb)', () => {
    const { container } = render(<SourceBadge source="phb" />)
    expect(container).toBeEmptyDOMElement()
  })
  it('mostra a sigla pro Tasha', () => {
    render(<SourceBadge source="tasha" />)
    expect(screen.getByText('TCE')).toBeInTheDocument()
  })
  it('source desconhecida não quebra (não renderiza)', () => {
    const { container } = render(<SourceBadge source="xyz" />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Rode pra ver falhar**

Run: `npm test -- src/test/dnd5e/SourceBadge.test.jsx`
Expected: FAIL — import não resolve.

- [ ] **Step 3: Implemente**

```jsx
// src/systems/dnd5e/components/SourceBadge.jsx
import { SOURCES } from '../domain/sources'

/** Selo curto de procedência. Não renderiza nada pra 'phb' (básico) nem fonte
 *  desconhecida. Use title pra acessibilidade (nome longo). */
export function SourceBadge({ source }) {
  const meta = SOURCES[source]
  if (!meta || source === 'phb') return null
  return (
    <span
      className="source-badge"
      title={meta.label}
      style={{ fontSize: '0.7em', padding: '0 4px', borderRadius: 4, border: '1px solid currentColor', opacity: 0.7 }}
    >
      {meta.abbr}
    </span>
  )
}
```

- [ ] **Step 4: Rode pra ver passar**

Run: `npm test -- src/test/dnd5e/SourceBadge.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/SourceBadge.jsx src/test/dnd5e/SourceBadge.test.jsx
git commit -m "feat(dnd5e): SourceBadge — selo de procedência (vazio pra phb)"
```

---

## Task 9: Gating dos talentos pela fonte da ficha

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx` (linha ~75, onde `feats` é obtido)
- Test: `src/test/dnd5e/feat-source-gating.test.jsx`

> O catálogo `feats` é distribuído aos pickers a partir de pontos que conhecem a
> ficha (Wizard tem `draft`; Sheet tem `character`). Filtramos ali com
> `filterCatalogBySources(feats, sources)`. A renderização do que a ficha já tem
> não passa por esse filtro.

- [ ] **Step 1: Escreva o teste que falha (unidade de filtragem no ponto de consumo)**

```jsx
// src/test/dnd5e/feat-source-gating.test.jsx
import { describe, it, expect } from 'vitest'
import { filterCatalogBySources } from '../../systems/dnd5e/domain/sources'

// Contrato que o Wizard/Sheet devem honrar ao alimentar os pickers.
describe('gating de talentos por fonte (contrato de oferta)', () => {
  const feats = [
    { index: 'adepto-elemental', source: 'phb' },
    { index: 'esmagador', source: 'tasha' },
  ]
  it('ficha só phb não oferece talento de Tasha', () => {
    expect(filterCatalogBySources(feats, ['phb']).map(f => f.index)).toEqual(['adepto-elemental'])
  })
  it('ficha com tasha oferece os dois', () => {
    expect(filterCatalogBySources(feats, ['phb', 'tasha']).map(f => f.index))
      .toEqual(['adepto-elemental', 'esmagador'])
  })
})
```

- [ ] **Step 2: Rode (deve passar — valida o contrato antes de aplicar)**

Run: `npm test -- src/test/dnd5e/feat-source-gating.test.jsx`
Expected: PASS (a função já existe; este teste fixa o contrato que a UI segue).

- [ ] **Step 3: Aplique o filtro no Wizard**

Em `CharacterWizardV2.jsx`, onde hoje está `const feats = useLazySrdDataset('feats')` (~linha 75), derive o catálogo filtrado pela fonte da ficha e passe ele adiante:

```jsx
import { filterCatalogBySources } from '../../domain/sources'
// ...
const rawFeats = useLazySrdDataset('feats')
const draftSources = draft?.meta?.settings?.sources ?? ['phb']
const feats = useMemo(
  () => filterCatalogBySources(rawFeats ?? [], draftSources),
  [rawFeats, draftSources]
)
```

(Os usos `feats={feats ?? []}` nas linhas ~270/276 continuam iguais.)

Repita o mesmo padrão nos pontos do Sheet que alimentam talentos:
`CharacterSheet/levelProgression/LevelUpPanel.jsx` (~linha 29) e
`CharacterSheet/FeaturesTab.jsx` (~linha 383), usando
`character?.meta?.settings?.sources ?? ['phb']`.

- [ ] **Step 4: Rode a suíte do Wizard/Sheet**

Run: `npm test -- src/test/ -t "Wizard"` e `npm test -- src/test/ -t "LevelUp"`
Expected: verde. Fichas sem `sources` → só PHB (comportamento atual preservado).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx \
  src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx \
  src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx \
  src/test/dnd5e/feat-source-gating.test.jsx
git commit -m "feat(dnd5e): pickers de talento filtram oferta pela fonte da ficha"
```

---

## Task 10: Controle "Fontes" (Wizard + Ficha)

**Files:**
- Create: `src/systems/dnd5e/components/SourcePicker.jsx`
- Modify: `CharacterWizardV2.jsx` (montar o controle; gravar em `draft.meta.settings.sources`)
- Modify: ponto de configurações da Ficha (mesmo controle, editável)
- Test: `src/test/dnd5e/SourcePicker.test.jsx`

- [ ] **Step 1: Escreva o teste que falha**

```jsx
// src/test/dnd5e/SourcePicker.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SourcePicker } from '../../systems/dnd5e/components/SourcePicker'

describe('SourcePicker', () => {
  it('PHB aparece sempre marcado e travado', () => {
    render(<SourcePicker value={['phb']} onChange={() => {}} />)
    const phb = screen.getByLabelText(/Livro do Jogador/i)
    expect(phb).toBeChecked()
    expect(phb).toBeDisabled()
  })

  it('ligar Tasha emite ["phb","tasha"]', () => {
    const onChange = vi.fn()
    render(<SourcePicker value={['phb']} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/Tasha/i))
    expect(onChange).toHaveBeenCalledWith(['phb', 'tasha'])
  })

  it('desligar Tasha emite ["phb"]', () => {
    const onChange = vi.fn()
    render(<SourcePicker value={['phb', 'tasha']} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/Tasha/i))
    expect(onChange).toHaveBeenCalledWith(['phb'])
  })
})
```

- [ ] **Step 2: Rode pra ver falhar**

Run: `npm test -- src/test/dnd5e/SourcePicker.test.jsx`
Expected: FAIL — import não resolve.

- [ ] **Step 3: Implemente o SourcePicker**

```jsx
// src/systems/dnd5e/components/SourcePicker.jsx
import { SOURCES } from '../domain/sources'

/**
 * Liga/desliga fontes de conteúdo da ficha. PHB é sempre ativo e travado.
 * value: string[] (ex.: ['phb','tasha']). onChange recebe o novo array.
 */
export function SourcePicker({ value = ['phb'], onChange }) {
  const active = new Set(value)
  function toggle(code) {
    if (code === 'phb') return
    const next = new Set(active)
    next.has(code) ? next.delete(code) : next.add(code)
    onChange(['phb', ...[...next].filter(c => c !== 'phb')])
  }
  return (
    <fieldset className="source-picker">
      <legend>Fontes</legend>
      {Object.values(SOURCES).map(s => (
        <label key={s.code}>
          <input
            type="checkbox"
            checked={s.code === 'phb' ? true : active.has(s.code)}
            disabled={s.code === 'phb'}
            onChange={() => toggle(s.code)}
          />
          {s.label}
        </label>
      ))}
    </fieldset>
  )
}
```

- [ ] **Step 4: Rode pra ver passar**

Run: `npm test -- src/test/dnd5e/SourcePicker.test.jsx`
Expected: PASS.

- [ ] **Step 5: Monte o controle no Wizard e na Ficha**

No Wizard, renderize `<SourcePicker value={draft.meta.settings.sources ?? ['phb']} onChange={next => updateDraft(d => ({ ...d, meta: { ...d.meta, settings: { ...d.meta?.settings, sources: next } } }))} />` num passo de configuração da ficha (junto de `allowFeats`/`allowMulticlass`). Na Ficha, monte o mesmo controle na área de configurações, persistindo via o fluxo de update já usado por aquelas settings.

- [ ] **Step 6: Rode a suíte do Wizard**

Run: `npm test -- src/test/ -t "Wizard"`
Expected: verde. Ligar Tasha no Wizard deve fazer talentos de Tasha aparecerem
no FeatPicker (validado manualmente via `npm run dev`).

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/SourcePicker.jsx \
  src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx \
  src/test/dnd5e/SourcePicker.test.jsx
git commit -m "feat(dnd5e): SourcePicker (Wizard + Ficha) grava meta.settings.sources"
```

---

## Task 11: Bump do cache do service worker

**Files:**
- Modify: `vite.config.js:70`

- [ ] **Step 1: Bumpe o cacheName**

Em `vite.config.js`, no runtimeCaching do `srd-data`, troque:

```js
cacheName: 'srd-data-v7',
```

por:

```js
cacheName: 'srd-data-v8',
```

(Necessário porque adicionamos `tasha-feats-pt.json` em `public/srd-data`; sem o
bump o SW serve o cache antigo e o conteúdo novo não chega no usuário.)

- [ ] **Step 2: Build pra validar o SW**

Run: `npm run build`
Expected: build limpo; o precache lista `tasha-feats-pt.json`.

- [ ] **Step 3: Commit**

```bash
git add vite.config.js
git commit -m "chore(pwa): bump srd-data cache v7->v8 (tasha-feats)"
```

---

## Task 12: Spike do Artífice no motor de regras

**Files:**
- Create: `docs/superpowers/notes/2026-06-23-artifice-spike.md`
- Ler (sem modificar agora): `src/systems/dnd5e/domain/rules.js`, `subclassSpells.js`, `phb-class-progression-full-pt.json`

> Spike de investigação, não TDD. Objetivo: decidir o tamanho da mudança no motor
> de regras pro Artífice, ANTES de extrair o volume de conteúdo. Saída = um doc
> de achados com go/no-go e escopo estimado.

- [ ] **Step 1: Investigue conjuração no motor**

Leia em `rules.js` como slots de magia são derivados por classe/nível. Responda
no doc: existe progressão de **meio-conjurador** (Paladino/Patrulheiro) hoje? Se
sim, o Artífice (que arredonda PRA CIMA, diferente deles) reaproveita ou precisa
de uma variante? Onde a tabela de slots é definida?

- [ ] **Step 2: Investigue recursos limitados**

Veja como `combat.classFeatureUses[]` modela usos por descanso. Pergunta do doc:
**Infundir Item** (infusões conhecidas vs. ativas, ligadas a slots de item por
nível) cabe nesse modelo ou precisa de estrutura nova?

- [ ] **Step 3: Investigue a montagem de classe/subclasse**

Veja como uma classe nova entraria em `phb-classes-pt.json` +
`phb-class-progression-full-pt.json` + `phb-class-choices-pt.json` +
`subclassSpells.js`. Liste exatamente quais arquivos o Artífice tocaria.

- [ ] **Step 4: Escreva os achados e a decisão**

Escreva `docs/superpowers/notes/2026-06-23-artifice-spike.md` com: (a) o que o
motor já suporta, (b) o que falta pro Artífice, (c) escopo estimado de mudança
em `rules.js`, (d) go/no-go e ordem sugerida pro plano do Artífice. Este doc
alimenta o plano seguinte (Artífice completo).

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/notes/2026-06-23-artifice-spike.md
git commit -m "docs(tasha): spike do Artífice — achados do motor de regras"
```

---

## Verificação final da fundação

- [ ] `npm test` — suíte inteira verde.
- [ ] `npm run build` — build limpo, `tasha-feats-pt.json` no precache, cache `v8`.
- [ ] `npm run dev` — criar ficha, ligar Tasha em "Fontes": talentos de Tasha
      aparecem no FeatPicker com selo TCE; desligar Tasha: somem da oferta, mas
      um talento de Tasha já escolhido continua na ficha.
- [ ] Ficha legada (sem `meta.settings.sources`) abre e só oferece talentos PHB.

## Próximos planos (fora deste, informados pelo spike)

1. **Conteúdo em volume** — subclasses, magias, itens, características opcionais de
   classe (mesma esteira das Tasks 4–6, mais consumidores de gating: picker de
   subclasse, SpellsBlock, inventário).
2. **Artífice completo** — conforme o go/no-go da Task 12.
3. **"Customizando sua Origem"** — reaproveita `settings.flexibleRacialAsi` +
   `info.racialAsiOverride` + `applyRacialChange` já existentes; gateado pela fonte.
