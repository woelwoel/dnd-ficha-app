# Esteira de extração — Caldeirão de Tasha

Ferramenta descartável pra converter o PDF do Tasha (fan-translation, fora do
repo) em JSON nos schemas de `public/srd-data/`. Reusável no Xanathar depois.

## Descoberta importante (2026-06-24)

**NÃO há problema de acento.** A sondagem inicial parecia mostrar acentos
quebrados (`M�SICA`), mas isso é só o **terminal** (Git Bash no Windows) não
renderizando UTF-8. Os codepoints extraídos por `pymupdf` são Latin-1 corretos
(`ç`=U+00E7, `ã`=U+00E3, `é`=U+00E9, ...). O dado em arquivo é UTF-8 íntegro.
Portanto a esteira NÃO tem etapa de reparo de acento — só garante saída UTF-8.

Pra inspecionar com acentos corretos, abra os arquivos gerados no editor (ou via
a tool Read), não pelo `cat` no terminal.

## Pré-requisito

`pip install pymupdf` (já instalado no ambiente do dono).

## Páginas (0-indexadas no pymupdf)

- **Talentos:** 78–82 (15 talentos, em ordem alfabética).
- (Subclasses, magias, itens, Artífice: mapear nos planos seguintes.)

## Uso

```bash
PDF="/c/Users/gvfar/OneDrive/RPG BIGBIG/D&D 5e - Caldeirão de Tasha para Tudo (Versão Fã) (1).pdf"

# 1) Extrair texto cru de um intervalo de páginas
python scripts/tasha/extract_text.py "$PDF" --pages 78-82 -o saida.txt

# 2) Estruturar talentos em JSON (pipe direto)
python scripts/tasha/extract_text.py "$PDF" --pages 78-82 \
  | python scripts/tasha/build_feats.py > public/srd-data/tasha-feats-pt.json
```

## Scripts

- `extract_text.py` — extrai texto UTF-8 de um intervalo de páginas.
- `build_feats.py` — estrutura os talentos no schema de `phb-feats-pt.json`,
  carimbando `source: "tasha"`. A descrição é parseada direto do texto extraído
  (fiel à fonte); `prereq`/`attrBonus` são metadados interpretados no script
  (dicionário `META`). Âncoras sequenciais por nome de talento (lista
  `FEAT_ORDER`) evitam falso-positivo no corpo.

## Notas de fidelidade

- O parser de talentos junta linhas quebradas em parágrafo único (formato igual
  ao dos talentos do PHB) e descarta rodapés (números de página, "Opções de
  Personagens", marcadores de página). Talentos cujo corpo é cortado por quebra
  de página (ex.: Tocado pelas Sombras) são reconstruídos corretamente.
- Arquivos de trabalho intermediários (texto extraído) NÃO vão pro git.
