# Xanathar (XGE) — Plano 7: Invocações Místicas + Itens Comuns

> Detalhe just-in-time do plano 7 (último) do [roadmap](2026-07-07-xanathar-roadmap.md).

**Goal:** Fechar o sub-projeto com as **14 invocações místicas** novas do XGE e os
**48 itens mágicos comuns**.

**Architecture:** Dado puro.
- Invocações = opções na choice `eldritch_invocations` do `bruxo` em
  `xanathar-class-choices-pt.json`. `mergeClassChoices` casa por `id` e concatena
  às invocações do PHB/Tasha; `tagSource` carimba `source: xanathar` (por isso o
  cru NÃO grava `source`). O `multiSelectByLevel` (contagem por nível) vem do PHB.
  Pré-requisitos ficam no texto do `desc` (não são enforced) + tag `combat`.
- Itens = `xanathar-magic-items-pt.json` (dataset já registrado no `SrdProvider`
  como `magicItemsXanathar`, composto por `array`+`tagSource`). Schema
  `{index,name,category,rarity,requiresAttunement,description}`, sem `source` no cru.

## Esteira

- Invocações: transcritas à mão (14, curtas) — pág. pymupdf 17-18 (`INVOCAÇÕES MÍSTICAS`).
- Itens: `scripts/xanathar/build_items.py <full.txt> <out.json>` — segmenta pela
  linha de raridade ("<Categoria>, comum ..."), nome da lista canônica ordenada,
  categoria do noun inicial, `requiresAttunement` de "sintonização", reusa os
  limpadores de OCR de `build_spells`. Seção pág. pymupdf ~150-152
  (`ITENS MÁGICOS COMUNS` all-caps → `CRIANDO ITENS COMUNS ADICIONAIS`).
  BOOTSTRAP ONE-SHOT (cura o JSON à mão depois).

## GOTCHAs

- `start` da seção de itens tem homônimo no sumário (Title Case) → exigir all-caps.
- Cláusula de sintonização quebra linha ("(requer sintonização\npor um bruxo)") →
  a cauda "…)" vaza no início do `desc`; cortar até o primeiro ")".
- Itens comuns triviais têm `desc` curtíssima ("Esta armadura nunca se suja.") →
  limiar do teste = 20 chars.
- Categorias válidas além de item-maravilhoso: armadura, cajado, arma, varinha.

## Tasks

1. **Invocações** — 14 opções em `eldritch_invocations` + teste (compõe com PHB,
   carimbo xanathar, mantém multiSelectByLevel). ✓
2. **Itens** — `build_items.py` + 48 itens + schema test (48, comum, 0 colisão,
   sem source no cru). ✓
3. **Fechamento** — bump SW v29→v30; suíte; build; merge+push; auditoria final. ✓

**Sub-projeto Xanathar COMPLETO** — 7/7 planos mergeados e deployados.
