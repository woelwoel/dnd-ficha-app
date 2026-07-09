# Xanathar (XGE) — Roadmap de planos focados

Índice da decomposição do sub-projeto Xanathar no **padrão Caldeirão**: uma spec
guarda-chuva + vários planos pequenos, cada um deployável sozinho, detalhado
just-in-time (o detalhe fino de cada plano é escrito logo antes de executá-lo,
pra refletir o estado real do código — foi assim que o Tasha aconteceu).

**Spec guarda-chuva:** `docs/superpowers/specs/2026-07-07-xanathar-design.md`

Cada plano tem seu próprio ciclo: escrever detalhe → executar (TDD, commits
por task) → bump `srd-data-vN` → merge na master + push (deploy) → próximo.

| # | Plano | Escopo | Análogo no Tasha | Status |
|---|---|---|---|---|
| 1 | `2026-07-07-xanathar-1-fundacao-talentos.md` | Fonte XGE + datasets no provider + esteira `scripts/xanathar/` + 15 talentos raciais + prereq de raça nos 2 FeatPickers | `tasha-fundacao-fontes` (infra provada com talentos) | **EXECUTADO 2026-07-08** |
| 2 | `xanathar-2-hexblade.md` | Patrono Hexblade (dados parseáveis + tracker) + lista expandida + Guerreiro Maldito (CHA na arma de pacto) — resolve o deferral | `subclasses-tasha-barbaro` (subclasse + infra de painel) | **EXECUTADO 2026-07-08** |
| 3 | `xanathar-3-subclasses-divinas.md` | Clérigo (Forja, Sepultura), Paladino (Conquista, Redenção), Patrulheiro (3), Druida (Sonhos, Pastor) — 9 subclasses + magias concedidas | `subclasses-tasha-barbaro` | **EXECUTADO 2026-07-08** |
| 4 | `xanathar-4-subclasses-marciais.md` | Guerreiro (3, inclui Disparos Arcanos), Monge (3), Ladino (4), Bárbaro (3) — 13 subclasses | idem | a detalhar |
| 5 | `xanathar-5-subclasses-arcanas.md` | Bardo (3), Feiticeiro (3, spike Alma Divina no `useClassSpells`), Bruxo Celestial, Mago (Magia de Guerra) — 8 subclasses + teste de contagem 31 | idem | a detalhar |
| 6 | `xanathar-6-catalogo-magias.md` | ~95 magias + curadoria de mecânicas (guard-rail `findUncovered` verde) | `tasha-catalogo-magias` | a detalhar |
| 7 | `xanathar-7-invocacoes-itens.md` | ~14 invocações místicas + itens mágicos comuns + auditoria final | `tasha-itens-magicos-D1` | a detalhar |

## Regras transversais (valem em todo plano)

1. **Bump `srd-data-vN`** (`vite.config.js`, hoje `v22`) em todo merge que toca `public/srd-data`.
2. **Slug ausente no catálogo PT** → omitir da tabela com comentário no padrão `GENIE_KIND.marid`, nunca inventar slug.
3. **Ids de choice idênticos aos do PHB** (`patron`, `divine_domain`, `sacred_oath`, `ranger_archetype`, `druid_circle`, `bard_college`, `sorcerous_origin`, `martial_archetype`, `monastic_tradition`, `roguish_archetype`, `arcane_tradition`, `eldritch_invocations`) — o `mergeClassChoices` casa por `id`; id errado duplica a choice na UI.
4. **`alma-divina`**: mesmo string no `value` da option (plano 5) e no gate do `useClassSpells` (plano 5).
5. **Formato parseável**: `Flavor...\n\nFeatures por nível:\n• Nv N — Nome: desc` senão a subclasse não ganha cards/trackers.
6. **Fidelidade**: `desc` é transcrição do PDF; metadados (prereq/tabelas/hints) são interpretação, revisada com o dono nos itens de risco.
7. **PDF fonte:** `C:\Users\gvfar\OneDrive\RPG BIGBIG\dd-5e-guia-de-xanathar-para-todas-as-coisas-fundo-branco-biblioteca-elfica.pdf` (702 páginas). Extração via `python scripts/xanathar/extract_text.py "<pdf>" --pages A-B` (0-indexado). Inspecionar a saída com a tool Read (terminal quebra UTF-8, o dado é íntegro). GOTCHAS descobertos no plano 1: o marcador `----- p.N -----` vem DEPOIS do texto da página N; OCR ruidoso (âncoras fuzzy + patches documentados no build script); nomes desta tradução diferem do esperado (tabela de subclasses na p.4 pymupdf: "O Lâmina Maldita", "Alma Favorecida", "Adepto das Sombras", "Perseguidor Obscuro", "Exterminador de Monstros", "Inquiridor", "Mentor", "Mago de Guerra", "Estilo do Mestre Bêbado/Kensei/da Alma do Sol").
8. Branch única `xanathar` pra todos os planos (ou uma por plano, à escolha na hora); lint ~611 é baseline, não regressão.

## Relacionado

- [[tasha-fontes]] — infra e cadência que este roadmap espelha.
- [[xanathar-subprojeto]] — memória do sub-projeto.
