# Construtor de encontros — design

Data: 2026-07-27
Status: aprovado pelo dono

## Problema

A [Mesa de Combate](2026-07-26-mesa-de-combate-design.md) entregou o Mestre
rodando o combate, mas não o Mestre **preparando** o combate. Hoje ele monta o
grupo de monstros na hora, dentro do `SetupPanel`, e a única informação que
recebe é a soma crua de XP — que sozinha não diz nada: 500 XP é trivial para
uma companhia de nível 8 e é chacina para uma de nível 2.

Duas consequências práticas:

1. **Não dá para saber se o encontro é justo** antes de ele acontecer na mesa.
2. **Nada sobrevive à sessão.** O grupo montado na semana passada é remontado
   monstro por monstro na semana seguinte.

## Escopo

Duas entregas que compartilham a mesma conta e o mesmo montador:

1. **Medidor de dificuldade ao vivo** — XP bruto, XP ajustado pelo multiplicador
   de quantidade, e a faixa (trivial/fácil/médio/difícil/mortal) contra a
   companhia real da mesa, com ajuste manual de tamanho e nível.
2. **Encontros salvos e nomeados** — rota própria de preparação, com criar,
   editar, renomear e apagar; e um "carregar" na tela de combate.

**Fora do escopo, de propósito:** sugestão automática de encontro, tema/ambiente
por monstro, distribuição de XP de recompensa às fichas, compartilhar encontro
entre mesas, barra visual de orçamento, ajuste de dificuldade por CR individual.

## Decisões de arquitetura

### Template é receita, não instância

O encontro salvo guarda `[{ monsterIndex: 'goblin', count: 3 }]` — não os
combatentes prontos que `addNpc` produz.

Motivo: o HP sai fresco no momento de carregar (média ou rolado, decisão da hora
de jogar e não da preparação), e se a tradução PT de um monstro entrar depois, o
encontro salvo acompanha em vez de congelar o nome antigo. Guardar combatentes
prontos só ganharia para "este goblin específico com 4 PV", que é estado de
combate, não de preparação.

### Tabela nova, não reuso de `encounters`

Misturar template com combate na mesma tabela deixaria as linhas `active =
false` sendo um saco de "lutas terminadas" mais "grupos preparados", e qualquer
consulta precisaria de um discriminador de qualquer forma.

### A rota de preparação é separada da de combate

Abrir `/campaigns/:id/combate` **cria um encontro ativo no banco** (o
`useEncounter` cria a linha ao montar). Usar aquela tela para preparar abriria um
combate que ninguém está jogando, e o Mestre teria que lembrar de encerrar.

### Sem lock otimista nos templates

Ao contrário do combate, template é editado por uma pessoa, fora da sessão, e o
custo de um conflito é reescrever um nome. Last-write-wins. Se algum dia a mesa
tiver dois Mestres, isso volta.

### Origem dos números

Os limiares de XP e os multiplicadores são do DMG, **fora do SRD 5.1**. Entram
como tabela de números, que é o caso mais puro do que a decisão
[2026-07-02](../../decisions/2026-07-02-conteudo-wotc-resumos.md) já classificou
como mecânica não protegível por copyright — sem copiar uma linha da prosa do
livro. Os rótulos das faixas são nossos, em pt-BR.

Os valores foram **conferidos contra as regras básicas públicas** durante o
desenho (dndbeyond.com/sources/dnd/basic-rules-2014/building-combat-encounters),
não escritos de memória.

## A matemática

### Limiares por nível de personagem

| Nv | Fácil | Médio | Difícil | Mortal | | Nv | Fácil | Médio | Difícil | Mortal |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 25 | 50 | 75 | 100 | | 11 | 800 | 1600 | 2400 | 3600 |
| 2 | 50 | 100 | 150 | 200 | | 12 | 1000 | 2000 | 3000 | 4500 |
| 3 | 75 | 150 | 225 | 400 | | 13 | 1100 | 2200 | 3400 | 5100 |
| 4 | 125 | 250 | 375 | 500 | | 14 | 1250 | 2500 | 3800 | 5700 |
| 5 | 250 | 500 | 750 | 1100 | | 15 | 1400 | 2800 | 4300 | 6400 |
| 6 | 300 | 600 | 900 | 1400 | | 16 | 1600 | 3200 | 4800 | 7200 |
| 7 | 350 | 750 | 1100 | 1700 | | 17 | 2000 | 3900 | 5900 | 8800 |
| 8 | 450 | 900 | 1400 | 2100 | | 18 | 2100 | 4200 | 6300 | 9500 |
| 9 | 550 | 1100 | 1600 | 2400 | | 19 | 2400 | 4900 | 7300 | 10900 |
| 10 | 600 | 1200 | 1900 | 2800 | | 20 | 2800 | 5700 | 8500 | 12700 |

O limiar da companhia é a **soma personagem por personagem**, não o nível médio.
Uma companhia de níveis 1, 1, 5 e 5 tem orçamento diferente de quatro
personagens de nível 3 — e usar média achataria essa diferença.

### Multiplicador por quantidade de monstros

Escada de sete posições: `0,5 · 1 · 1,5 · 2 · 2,5 · 3 · 4`.

| Monstros | 1 | 2 | 3–6 | 7–10 | 11–14 | 15+ |
|---|---|---|---|---|---|---|
| Multiplicador | ×1 | ×1,5 | ×2 | ×2,5 | ×3 | ×4 |

Ajuste por tamanho do grupo: companhia com **menos de 3** personagens sobe um
degrau na escada; com **6 ou mais**, desce um degrau — e é por isso que a escada
começa em ×0,5, que é onde um monstro solitário cai diante de seis personagens.

### Faixa

`adjustedXp = xpTotalDosMonstros × multiplicador`, comparado aos quatro limiares
da companhia. A fronteira é sempre **igual entra na faixa de cima**:

| Condição | Faixa |
|---|---|
| `< fácil` | trivial |
| `>= fácil` e `< médio` | fácil |
| `>= médio` e `< difícil` | médio |
| `>= difícil` e `< mortal` | difícil |
| `>= mortal` | mortal |

## Estrutura de arquivos

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `src/systems/dnd5e/domain/encounterDifficulty.js` | limiares, multiplicador, faixa — puro |
| `src/systems/dnd5e/components/Encounter/DifficultyMeter.jsx` | XP bruto, XP ajustado, faixa, e os controles de companhia |
| `src/systems/dnd5e/components/Encounter/MonsterGroupPanel.jsx` | montar grupo de monstros (extraído do `SetupPanel`) |
| `src/systems/dnd5e/components/Encounter/EncounterLibraryScreen.jsx` | a rota de preparação |
| `src/lib/encounterTemplates.js` | CRUD dos encontros salvos |
| `supabase/migrations/0017_encounter_templates.sql` | tabela + RLS |

**Modificados:**

| Arquivo | Mudança |
|---|---|
| `SetupPanel.jsx` | usa o `MonsterGroupPanel` extraído; ganha o medidor e "Carregar encontro salvo" |
| `ui.jsx`, `ui-registry.js`, `App.jsx` | expor a superfície `EncounterLibrary` |
| `CampaignDetail.jsx` | botão "Encontros" ao lado de "Rodar combate" |

A extração do `MonsterGroupPanel` é o que impede duas telas com a mesma lógica de
adicionar/remover monstro divergindo depois.

## Modelo de dados (migration 0017)

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid pk default `gen_random_uuid()` | |
| `campaign_id` | uuid not null → campaigns `on delete cascade` | |
| `name` | text not null | `check (char_length(btrim(name)) between 1 and 80)` |
| `monsters` | jsonb not null default `'[]'::jsonb` | `[{ monsterIndex, count }]` |
| `created_at` / `updated_at` | timestamptz not null default now() | |

Índice único `(campaign_id, lower(btrim(name)))` — dois "Emboscada na ponte" na
mesma mesa é erro de digitação, não intenção.

RLS igual à da 0015: `for all to authenticated` com `is_campaign_dm(campaign_id)`
no `using` **e** no `with check`, e nenhuma policy para jogador.

Trigger `before update` para `updated_at` (sem coluna `version`, pela decisão de
não usar lock aqui).

## Os dois fluxos

**Preparar** (`/campaigns/:id/encontros`): lista os encontros salvos, cada linha
com nome, XP ajustado e a faixa **calculada contra a companhia atual da mesa** —
então um encontro montado no nível 3 se mostra "trivial" quando a companhia chega
no 7, que é justamente a informação útil. Criar ou editar abre o
`MonsterGroupPanel` com o `DifficultyMeter` ao lado, e os controles de tamanho e
nível da companhia já preenchidos com a companhia real.

**Rodar** (`SetupPanel`, dentro do combate): "Carregar encontro salvo" injeta os
monstros na cena, e o medidor aparece ali também — usando exatamente quem está
marcado como presente, que é a informação mais precisa naquele momento.

## Erros e casos de borda

| Situação | Comportamento |
|---|---|
| Template com `monsterIndex` que não existe mais no catálogo | linha marcada "monstro desconhecido", ignorada ao carregar, sem derrubar a tela |
| Nome repetido na mesma mesa | recusa com mensagem (`23505` traduzido), não sobrescreve |
| Mesa sem nenhuma ficha | medidor não divide por zero: mostra "sem companhia" e pede o ajuste manual |
| Nível fora de 1..20 | clamp, sem estourar índice da tabela |
| Encontro salvo vazio | permitido (é um esboço); o medidor mostra "sem monstros" |
| `count` ausente ou ≤ 0 no jsonb | tratado como 1 |

## Testes

**Domínio (`encounterDifficulty.js`)** — limiares em pontos-chave da tabela
(níveis 1, 5, 11, 20); soma por personagem versus média (a companhia 1/1/5/5);
multiplicador em cada uma das seis faixas de contagem; ajuste de tamanho **nos
dois sentidos**, incluindo o ×0,5 de um monstro contra seis personagens; faixa
nos valores exatos de fronteira (igual ao limiar cai na faixa de cima); clamp de
nível.

**Lib** — CRUD com Supabase mockado, incluindo o erro de nome duplicado.

**UI** — medidor mostra a faixa certa e reage ao ajuste manual; carregar template
injeta os monstros; `monsterIndex` desconhecido não derruba a lista.

**Perímetro** — bloco no `scripts/test-rls-isolation.mjs`: jogador não lê nem
escreve `encounter_templates`; Mestre de outra mesa também não.

**E2E** — criar um encontro salvo na rota de preparação e carregá-lo no combate.

## Ordem de implementação sugerida

1. `domain/encounterDifficulty.js` + testes (não depende de nada).
2. Migration 0017 + bloco de perímetro no harness.
3. `lib/encounterTemplates.js`.
4. `DifficultyMeter` e extração do `MonsterGroupPanel` (refactor com os testes
   do `SetupPanel` já existentes como rede).
5. Medidor dentro do `SetupPanel`.
6. `EncounterLibraryScreen` + rota + botão.
7. "Carregar encontro salvo" no `SetupPanel`.
8. E2E e fechamento.
