# Esteira de extração — Guia de Xanathar (XGE)

Ferramenta descartável pra converter o PDF do Xanathar (fan-translation, fora
do repo) em JSON nos schemas de `public/srd-data/`. Herda as descobertas da
esteira do Tasha (`scripts/tasha/README.md`): a extração via pymupdf sai com
UTF-8 íntegro — o `�` no terminal é só renderização; inspecione a saída no
editor ou via tool Read, nunca por `cat`.

## O PDF desta edição

`C:\Users\gvfar\OneDrive\RPG BIGBIG\dd-5e-guia-de-xanathar-para-todas-as-coisas-fundo-branco-biblioteca-elfica.pdf`

- 702 páginas; numeração impressa ≈ página pymupdf + 3 (no capítulo 1).
- ATENÇÃO: o marcador `----- p.N -----` do extract_text vem DEPOIS do texto
  da página N — ao mapear seções por um extrato largo, o conteúdo entre os
  marcadores p.N e p.N+1 pertence à página **N+1**.
- **OCR ruidoso** (diferente do Tasha): títulos corrompidos ("BoASORTE",
  "FÚRIA ÜRC"), `l` no lugar de `1` em dados ("ld4"), glifos exóticos em
  alguns parágrafos. Os build scripts usam âncora fuzzy + normalização
  mecânica; OCR quebrado não-mecânico é corrigido na CURADORIA manual do
  JSON gerado (com revisão do dono nos itens de risco).

## Páginas (0-indexadas no pymupdf)

- **Sumário/tabela de subclasses:** 4 (nomes oficiais desta tradução).
- **Talentos raciais:** 71–73 (15 talentos, ordem alfabética).
- (Subclasses, magias, itens: mapear nos planos seguintes.)

## Uso

```bash
PDF="/c/Users/gvfar/OneDrive/RPG BIGBIG/dd-5e-guia-de-xanathar-para-todas-as-coisas-fundo-branco-biblioteca-elfica.pdf"

# 1) Extrair texto cru de um intervalo de páginas
python scripts/xanathar/extract_text.py "$PDF" --pages 71-73 -o saida.txt

# 2) Estruturar talentos em JSON (pipe direto)
python scripts/xanathar/extract_text.py "$PDF" --pages 71-73 \
  | python scripts/xanathar/build_feats.py > public/srd-data/xanathar-feats-pt.json
```

## Scripts

- `extract_text.py` — cópia da do Tasha (genérica): texto UTF-8 por intervalo.
- `build_feats.py` — 15 talentos raciais no schema de `phb-feats-pt.json`,
  carimbados `source: "xanathar"`, com o novo prereq `{ type: "race" }` e
  `attrBonus` interpretados no dicionário `META`.

## Notas de fidelidade

- "Agachamento Ágil" ("Anão ou Raças Pequenas") vira lista explícita
  `[anao, halfling, gnomo]` — decisão da spec.
- "Segunda Chance": esta tradução dá +1 só em CON/CAR (o original inclui
  DES) — seguimos o PDF; divergência marcada pra decisão do dono.
- Arquivos de trabalho intermediários NÃO vão pro git.
