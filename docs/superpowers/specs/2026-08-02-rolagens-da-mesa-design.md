# Log de rolagens da mesa

**Data:** 2026-08-02
**Status:** aprovado, aguardando plano de implementação
**Depende de:** nada. Independente do [rolador livre](2026-08-02-rolador-livre-design.md) —
os dois mexem no mesmo painel, mas em pontos diferentes.

## Problema

O Mestre não vê o que os jogadores tiram. Numa mesa presencial isso vira
"quanto você tirou?" a cada teste, e o Mestre depende do jogador ler o número
em voz alta. Toda a rolagem do app hoje morre no histórico local de quem rolou
(`DiceRollerProvider`, memória do navegador, 30 entradas).

## Solução

Toda rolagem feita com uma ficha que pertence a uma mesa é publicada num feed
compartilhado da campanha. Mestre e jogadores veem o feed inteiro, ao vivo,
numa aba nova do painel flutuante de rolagens.

### Decisões de produto

| Decisão | Escolha |
| --- | --- |
| Quem lê | **Todos os membros da mesa** — jogadores veem uns aos outros, não só o Mestre |
| O que publica | **Tudo**, automático, com interruptor 📡 pro jogador cortar a transmissão |
| Persistência | **Tabela** com retenção de 24h |
| Onde aparece | **Aba "Mesa"** no painel flutuante de dados |
| Rolagem do Mestre | Publica também, identificada como "Mestre", sujeita ao mesmo 📡 |

---

## Banco — migration 0019

> ⚠️ A migration **0018 ainda está pendente** de aplicação em produção. Aplicar
> 0018 e 0019 na mesma ida ao SQL Editor.

### Tabela

```sql
create table if not exists public.campaign_rolls (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id)  on delete cascade,
  user_id      uuid not null references auth.users(id)        on delete cascade
                 default auth.uid(),
  character_id uuid references public.characters(id)          on delete set null,
  actor_name   text not null,
  label        text not null default '',
  notation     text not null,
  total        int  not null,
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists campaign_rolls_feed_idx
  on public.campaign_rolls (campaign_id, created_at desc);
```

**`actor_name` é denormalizado de propósito.** A RLS da 0014
(`campaign_roster_privacy`) não deixa um jogador ler a ficha do outro. Sem essa
cópia do nome no momento da rolagem, o feed mostraria "alguém tirou 17" ou
exigiria reabrir a privacidade das fichas — exatamente o que aquela migration
fechou. O preço é o nome congelado: renomear o personagem não reescreve o
passado, o que para um log é a semântica correta.

**`character_id` é referência frouxa** (`on delete set null`): apagar a ficha
não apaga o registro histórico da sessão.

**`detail`** carrega o resto do shape que o `parseAndRoll` devolve — `rolls`,
`sides`, `mode`, `allRolls`, `keptIndex`, `crit`, `modifier` — pro feed
conseguir renderizar 20 natural, vantagem riscada e ✦CRIT com o mesmo
componente do histórico local.

### RLS

```sql
alter table public.campaign_rolls enable row level security;

-- Ler: qualquer membro da mesa (o Mestre entra em campaign_members com
-- role='dm' na 0004, então is_campaign_member já cobre os dois lados).
create policy "campaign_rolls_select_member"
  on public.campaign_rolls for select to authenticated
  using (public.is_campaign_member(campaign_id));

-- Escrever: só em nome de si mesmo, e só na própria mesa.
create policy "campaign_rolls_insert_self"
  on public.campaign_rolls for insert to authenticated
  with check (public.is_campaign_member(campaign_id) and user_id = auth.uid());
```

Sem policy de `UPDATE` e sem policy de `DELETE`: log não se edita nem se apaga
à mão. A faxina roda em `security definer`, abaixo.

### Retenção — 24h

```sql
create or replace function public.prune_campaign_rolls()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Amostragem: um DELETE por rolagem seria desperdício numa mesa ativa
  -- (~200 rolagens/sessão) e a janela é de 24h, não precisa ser exata.
  if random() < 0.05 then
    delete from public.campaign_rolls
     where campaign_id = new.campaign_id
       and created_at < now() - interval '24 hours';
  end if;
  return null;
end;
$$;

create trigger campaign_rolls_prune
  after insert on public.campaign_rolls
  for each row execute function public.prune_campaign_rolls();
```

`security definer` porque não existe policy de DELETE — a faxina é o único
caminho que apaga linha. O `random() < 0.05` faz a limpeza acontecer ~10 vezes
por sessão de mesa em vez de 200, e o índice `(campaign_id, created_at)` cobre
o predicado.

### Realtime — o gotcha

```sql
alter publication supabase_realtime add table public.campaign_rolls;
```

**Isto não pode faltar.** Nenhuma migration deste repo mexe em publication:
`encounters` (0015) e `characters` (0009) tiveram o realtime ligado pelo
dashboard, fora do versionamento. Se a 0019 esquecer essa linha, a assinatura
do cliente conecta, não dá erro nenhum, e o feed simplesmente nunca atualiza —
o bug aparenta ser de cliente e custa horas.

Encerrar com `NOTIFY pgrst, 'reload schema';`, como as demais.

---

## Cliente

### `src/lib/campaignRolls.js` (novo)

Camada da casca, no molde de `src/lib/encounters.js` — não conhece o shape do
`detail`, só transporta.

```js
publishRoll({ campaignId, characterId, actorName, entry })  // insert
fetchRecentRolls(campaignId, limit = 50)                    // select ordenado desc
subscribeCampaignRolls(campaignId, onRow)                   // canal + unsubscribe
```

O canal é `campaign-rolls:${campaignId}`, escutando `INSERT` com
`filter: campaign_id=eq.<id>` — mesmo padrão do `subscribeEncounter`.

`publishRoll` é **fire-and-forget**: erro só vai pro `logDev`. Rede caída não
pode travar, atrasar nem desfazer a rolagem local — o jogador rolou, o dado
caiu, o feed é secundário.

### Provider (`src/context/DiceRollerContext.jsx`)

Ganha `setTableContext(ctx | null)`, guardado em ref, no mesmo padrão do
`setRollEffectsResolver` que já existe ali. A casca continua sem saber o que é
campanha:

```js
setTableContext({ campaignId, characterId, actorName })
```

Dentro do `roll()`, depois de montada a entrada, publica **se** houver contexto
e a transmissão estiver ligada.

**Momento da publicação — importa.** Quando o 3D está ativo, a entrada local só
entra no histórico quando os dados param de rolar (dentro do `.then` do
`enqueueDice3d`). A publicação segue **a mesma cadência**: publicar antes faria
o Mestre ver o resultado enquanto os dados ainda giram na tela do jogador,
estragando o suspense que o projeto dos dados 3D foi construído pra criar.

### `TableRollSync` (novo, irmão do `DiceAccentSync`)

Componente sem UI que registra e limpa o contexto de mesa. Montado em dois
lugares:

| Tela | Contexto registrado |
| --- | --- |
| Ficha do personagem | `{ campaignId: char.campaign_id, characterId: char.id, actorName: char.name }` |
| Tela de mesa / combate do Mestre | `{ campaignId, characterId: null, actorName: 'Mestre' }` |

Desmontar limpa (`setTableContext(null)`). Ficha sem `campaign_id` não registra
nada — personagem solto não publica em lugar nenhum, e a aba "Mesa" não
aparece.

### Painel (`DiceHistoryPanel.jsx`)

- **Duas abas:** "Minhas" (o histórico local desta sessão do navegador — as 30
  entradas que o provider já guarda) e "Mesa" (o feed). O 📡 corta só a
  publicação; a leitura do feed continua valendo com ele desligado.
  A aba "Mesa" só existe quando há contexto de mesa; sem contexto o
  painel fica exatamente como está hoje, sem aba nenhuma.
- **Botão 📡** no cabeçalho, ao lado do `3D`, com o mesmo tratamento visual
  (ligado = verde). Ligado por padrão. Persistido por ficha em
  `dnd-ficha:share-rolls:<characterId>` (e `dnd-ficha:share-rolls:dm:<campaignId>`
  pro Mestre), leitura e escrita em `try/catch` como as demais chaves.
- **`RollEntry` ganha uma prop opcional `actor`.** Quando presente, mostra o
  nome do ator acima do rótulo. Reaproveitar o componente em vez de duplicá-lo
  mantém 20 natural, ✦CRIT e o d20 riscado da vantagem idênticos nas duas abas
  — são três regras de exibição que não podem divergir.

### `useCampaignRolls(campaignId)` (novo hook)

Carrega as últimas 50 e assina o realtime. Dedupe por `id` (o autor recebe o
eco do próprio INSERT pelo canal), cap em 50 entradas na memória, e
`unsubscribe` na troca de mesa — o mesmo cuidado que o `useEncounter` toma pra
não vazar estado de uma mesa na outra.

---

## Limitação declarada: o feed é confiança, não prova

Quem insere a linha é o cliente. Um jogador determinado consegue abrir o
console e publicar um 20 que nunca rolou. Rolar no servidor resolveria, mas
custaria uma ida à rede por rolagem e mataria a animação 3D, que hoje é
síncrona com o resultado já em mãos.

Isso fica registrado aqui para que ninguém trate o feed como antitrapaça mais
tarde: numa mesa de amigos, dado forjado é problema social. Validar faixa no
servidor (`total` dentro do mínimo/máximo possível da `notation`) pegaria só o
trapaceiro preguiçoso e não vale a complexidade agora.

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `supabase/migrations/0019_campaign_rolls.sql` | **novo** |
| `src/lib/campaignRolls.js` | **novo** |
| `src/hooks/useCampaignRolls.js` | **novo** |
| `src/components/DiceRoller/TableRollSync.jsx` | **novo** |
| `src/components/DiceRoller/TableRollFeed.jsx` | **novo** — a aba Mesa |
| `src/context/DiceRollerContext.jsx` | `setTableContext` + publicação no `roll()` |
| `src/components/DiceRoller/DiceHistoryPanel.jsx` | abas, botão 📡, `actor` na `RollEntry` |
| ficha v2 + tela de mesa | montam `<TableRollSync />` |

## Testes

1. **Provider publica** quando há contexto de mesa e a transmissão está ligada;
   **não publica** sem contexto, nem com o 📡 desligado.
2. **Cadência do 3D**: com 3D ativo, a publicação acontece junto com a entrada
   no histórico (depois de os dados pararem), não antes.
3. **Falha de rede na publicação não afeta a rolagem local** — a entrada entra
   no histórico do mesmo jeito e nada é desfeito.
4. `campaignRolls.js`: monta o insert com os campos certos; `subscribe` devolve
   unsubscribe funcionando.
5. `useCampaignRolls`: dedupe do eco do próprio insert, cap de 50, e troca de
   `campaignId` não deixa entrada da mesa anterior.
6. Painel: aba "Mesa" ausente sem contexto; presente com contexto; `RollEntry`
   com `actor` mostra o nome.
7. **RLS não é testável no vitest.** Verificar por sonda REST com a anon key de
   dois usuários (um membro, um de fora), como foi feito na investigação da
   migration 0009: membro lê o feed, não-membro recebe lista vazia, e ninguém
   consegue inserir com `user_id` de outro.

Rodar a suíte por fatias com `--maxWorkers=2` (a suíte cheia estoura a memória
da máquina).

## Fora de escopo

- **Rolagem secreta do Mestre** com botão próprio — o 📡 já serve de versão
  pobre disso.
- **Rolagens de monstro** no workspace de combate publicadas com o nome da
  criatura (spoiler de bestiário: revelar "Goblin Arqueiro" pelo feed estraga
  o encontro).
- **Filtrar o feed** por jogador ou por tipo de rolagem.
- **Notificação** de 20 natural na mesa.
