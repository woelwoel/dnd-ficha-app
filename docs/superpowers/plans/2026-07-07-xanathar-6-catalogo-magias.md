# Xanathar (XGE) — Plano 6: Catálogo de Magias

> Detalhe just-in-time do plano 6 do [roadmap](2026-07-07-xanathar-roadmap.md).
> Padrão do análogo `2026-06-26-tasha-catalogo-magias.md`.

**Goal:** Importar as **95 magias** do Capítulo 3 do XGE para
`public/srd-data/xanathar-spells-pt.json` (hoje `[]`) no schema de
`phb-spells-pt.json`, cada uma com `classes:[]` das listas por classe do PDF,
e **curar as mecânicas** de todas as roláveis em `spell-mechanics-pt.json` até
o guard-rail `node scripts/gen-spell-mechanics.mjs --check` ficar verde.

**Architecture:** Dado puro. O `SrdProvider` compõe `spells` como array (PHB +
Tasha + Xanathar concatenados e carimbados por fonte); `loadSpellSources` do
guard-rail varre `*-spells-pt.json` sozinho. `useClassSpells` filtra por
`s.classes?.includes(classIndex)`. Zero código de motor — só dados + testes.

## Esteira (nova)

- `scripts/xanathar/build_spells.py <raw.txt> <classes.json> <out.json>` —
  segmenta as 95 descrições pela linha de nível (tolerante a OCR:
  "rúvel", `1 " nível`, `9ª nível`), parseia o bloco de metadados rotulado
  (Tempo de Conjuração / Alcance / Componentes / Duração), extrai `desc` +
  `higher_level` (corta em "Em Níveis Superiores."), e normaliza OCR mecânico
  (`fix_dice`: "6d l 0"→"6d10"; "1 º"→"1º"; "O pontos"→"0 pontos"; rodapé
  "CAPÍTULO 3" removido). `classes.json` = mapa Nome→[classes] derivado das
  8 listas de classe do próprio capítulo.
- Comando: `python scripts/xanathar/extract_text.py "$PDF" --pages 130-190 -o raw.txt`
  (o capítulo de magias fica ~pág. pymupdf 142-168; lista de classes começa em
  "LISTA DE MAGIAS", descrições em "DESCRIÇÃO DE MAGIAS", fim em "APÊNDICE A").

## GOTCHAs desta seção

- PDF tem **191 páginas** (a memória antiga dizia 702 — corrigido).
- **95 magias**, ordem alfabética; nenhuma colide com PHB/Tasha (verificado por
  nome normalizado). Nomes desta tradução: Steel Wind Strike="Ataque do Vento de
  Aço", Vitriolic Sphere="Esfera Cáustica", Psychic Scream="Grito Psíquico",
  Abi-Dalzim's Horrid Wilting="Evaporação de Abi-Dalzim", Dawn="Aurora".
- **Stat-blocks/tabelas** (Pequeno Servo, Invocar Demônios, Raio de Caos) ficam
  achatados em prosa no `desc` (estilo das invocações do Tasha) — aceitável.
  Artefato de ordem de coluna do pymupdf pode injetar um stat-block vizinho;
  o corte de bloco usa o cabeçalho all-caps da próxima magia pra evitar bleed.
- **Mecânica**: dados conferidos contra o XGE real na curadoria. `_ignore`
  recebe as roláveis que não modelamos (invocações/utilitárias). `effect` (buffs)
  já existe no mechanics ([[efeitos-ativos]] mergeado) — curar as de buff.

## Tasks

1. **Catálogo** — gerar+curar `xanathar-spells-pt.json` (95) + schema test
   (`xanathar-spells-schema.test.js`: schema válido, 0 colisão, 95 entradas,
   classes válidas). Composição por classe coberta no mesmo teste.
2. **Mecânicas** — curar toda rolável XGE em `spell-mechanics-pt.json`; `_ignore`
   pro resto; teste que roda `findUncovered` sobre as fontes fica verde.
3. **Fechamento** — bump SW `srd-data-v28`→`v29`; suíte completa; build; merge+push.
