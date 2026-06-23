# Fronteira multi-sistema — Design

**Data:** 2026-06-23
**Branch:** `multi-sistema-fronteira`
**Ponto de retorno:** tag `pre-multi-sistema` (commit `8b9f3c1`)

## Contexto e objetivo

Hoje o app é inteiramente acoplado a D&D 5e: o motor de regras (`src/domain/*`),
a ficha, o wizard de criação e os datasets `phb-*.json` assumem D&D. A casca
(auth, mesas/campanhas, lista de personagens, persistência, DiceRoller) já trata
a ficha como um blob opaco e é, na prática, agnóstica.

O objetivo de longo prazo é o app deixar de ser só D&D e suportar **vários
sistemas de RPG** (d20, d100, narrativos, homebrew). O segundo sistema concreto
escolhido é **Daggerheart**, que é radicalmente diferente de D&D (2d12 de
dualidade, traços em vez de STR/DEX/…, Evasão em vez de CA, tiers em vez de
níveis, cartas de domínio em vez de magia vanciana). Essa divergência é
proposital: serve pra validar a abstração contra dois exemplos reais em vez de
generalizar a partir de um só.

**Escopo deste spec (sub-projeto 1):** estabelecer a **fronteira de "sistema"** —
introduzir o conceito de System, extrair todo o D&D pra trás dele e fazer a casca
rotear por sistema. **D&D 5e vira "o primeiro sistema".** O app continua 100%
funcional só com D&D ao fim do trabalho.

**Fora de escopo (sub-projetos futuros):**
- Construir o sistema Daggerheart (regras, cartas, tiers, ficha) — sub-projeto 2.
- Os livros D&D (Tasha's, Xanathar's) — sub-projeto 3, agora morando dentro de
  `systems/dnd5e/`.
- Generalizar DiceRoller (d20 → multi-dado), o mapa/tokens da Companhia e a RPC
  `campaign_roster` (todos seguem D&D-shaped por ora).

## Princípio diretor: extrair antes de abstrair

A maior fonte de retrabalho não é a forma do contrato — é a extração das ~3000
linhas de domain + componentes. O contrato é **barato de mudar**; a extração é
cara. Por isso as entranhas do dnd5e **não dependem** do contrato: só um
adaptador fino (`systems/dnd5e/core.js`, ~30 linhas) conhece o formato do
contrato e reexporta o que já existe. Se o contrato precisar mudar quando o
Daggerheart chegar, só o adaptador muda — não o `rules.js` nem os componentes.

## 1. Contrato `System` + registry

Cada sistema é um módulo que entrega tudo que é específico dele. A casca nunca
conhece regras de nenhum sistema. O contrato é dividido em dois sub-contratos
porque o `storage.js` (não-React) precisa da lógica de validação sem arrastar a
árvore React pro bundle:

```
systems/dnd5e/
  core.js   → { id, name, createCharacter, parseCharacter, migrate, summarize }   (puro, sem React)
  ui.js     → { Wizard, Sheet, DataProvider }                                      (React, lazy)
```

- `id` — `'dnd5e'` | `'daggerheart'`
- `name` — rótulo legível
- `createCharacter(seed)` → blob inicial, carimbado com `{ system: id, schemaVersion }`
- `parseCharacter(raw)` → valida o corpo específico do sistema (hoje: `safeParseCharacter`)
- `migrate(raw)` → migrações incrementais do sistema (hoje: `migrateCharacter`)
- `summarize(character)` → `{ title, subtitle, badges[] }` — pra a lista renderizar
  sem saber o que é "nível"/"tier". D&D: `"Guerreiro Nv 5 • Humano"`.
- `Wizard` — criação: `({ initialCampaignId, onComplete, onBack })`
- `Sheet` — ficha: `({ characterId, adminContext, onBack })`
- `DataProvider` — o `SrdProvider` de hoje vira o provider do dnd5e

**Registry** (`src/systems/index.js`): `getSystemCore(id)` (síncrono, leve),
`getSystemUI(id)` (lazy/dinâmico), `listSystems()`. Hoje só o `dnd5e` é
registrado. Adicionar um sistema depois = criar `src/systems/<id>/` + uma linha
no registry, sem tocar na casca.

## 2. Modelo de dados + storage

**Discriminador `system`.** Vive **dentro do blob JSONB** (`character.system`,
default `'dnd5e'`) — é a fonte da verdade, viaja com export/import, e o corpo é
self-describing. Fichas legadas não têm o campo → ausência = `'dnd5e'` no parse.
Nenhuma ficha existente quebra; nenhum dado é tocado.

**Coluna gerada (migration).** Pra habilitar filtro/roteamento server-side sem
duplicação nem risco de dessincronização:

```sql
alter table public.characters
  add column system text
  generated always as (lower(coalesce(data->>'system', 'dnd5e'))) stored;
create index characters_system_idx on public.characters (system);
```

A coluna é *derivada* do blob — o `storage.js` não escreve nada (faz upsert só
de `data`; o Postgres recalcula). Backfill automático: toda ficha legada passa a
expor `'dnd5e'` no instante da migration, via o `coalesce`.

**Validação despachada (resolve o acoplamento do `storage.js`).** Hoje 6 pontos
(`loadCharacters`, `loadCharacterById`, `loadCharacterByRouteParam`,
`upsertCharacter`/`validateForSave`, `saveCharacterVersioned`,
`importAllCharacters`) chamam `safeParseCharacter`/`migrateCharacter` direto. A
validação quebra em duas camadas:

```
parseCharacterRow(row):
  1. envelope (compartilhado): valida { id, system, meta, espelhos relacionais
                               ownerId/campaignId/shortId/lastOpenedAt/version }
  2. corpo (do sistema): getSystemCore(row.data.system ?? 'dnd5e').parseCharacter(body)
```

A casca conhece só o envelope; o corpo é do módulo do sistema.

**Sistema desconhecido = degradação graciosa.** Ficha com `system` não registrado:
envelope valida, corpo não resolve → ficha **ignorada com `reportError`** (o
caminho que hoje conta fichas rejeitadas), sem derrubar a lista. Compatibilidade
pra frente de graça.

**Runtime não depende da migration.** O dispatch lê `system` do **blob** (sempre
presente após `createCharacter`; legado → default no parse). A coluna gerada é só
otimização pro `select system` do roteamento — se não existir (janela
deploy→migration), cai no fallback de carregar a row e ler `data.system`. Mesmo
padrão da 0009.

## 3. Roteamento + fluxo de criação

**`/new`:**
- 1 sistema registrado (hoje): seletor **pulado** → vai direto pro wizard do dnd5e.
- 2+ sistemas: `/new` mostra seletor (`listSystems()`) → `/new?system=<id>&campaignId=…`
  → monta `getSystemUI(system).Wizard` (lazy).

**`/c/:id`:** precisa do sistema antes de montar a ficha certa. `select system
from characters where id=…` (coluna gerada indexada, sem parsear o blob) resolve
qual sistema, mostra `Loader`, e monta `getSystemUI(system).Sheet` lazy. Fallback
se a coluna não existir: carrega a row e lê `data.system`. Legado → `'dnd5e'`.

**`DataProvider` sai da raiz.** Hoje `<SrdProvider>` embrulha o app inteiro no
`App.jsx`. Desce pra dentro da UI do dnd5e — o módulo do sistema embrulha seu
próprio `Wizard`/`Sheet` no seu provider. A casca fica livre de dados de D&D. O
`BestiaryButton` global (que usa SRD) entra no mesmo movimento.

**Continua na casca, intocado:** esqueleto de rotas, `Gate`/auth, `OfflineBanner`,
`AppFooter`, `DiceHistoryPanel`, `PWAUpdatePrompt`.

## 4. Mesa ↔ Sistema

Uma mesa joga um sistema só. O vínculo remove ambiguidade do seletor e adiciona
integridade.

**Modelo de dados (migration):**

```sql
alter table public.campaigns
  add column system text not null default 'dnd5e';   -- default backfilla mesas existentes
```

Coluna comum (não gerada) — o sistema é propriedade intrínseca da mesa, definida
na criação. A RPC `create_campaign` ganha `p_system text default 'dnd5e'`.

**Integridade no servidor (trigger).** Ficha só entra em mesa do mesmo sistema:

```
before insert/update on characters:
  se campaign_id não é null e characters.system <> (select system from campaigns where id = campaign_id)
  → raise 'system_mismatch'
```

Impossível largar ficha de D&D em mesa de Daggerheart, mesmo por bug de cliente
ou import. No cliente, `moveCharacterToCampaign` ganha pré-check com
`reason: 'system-mismatch'` (padrão do `not-a-member`).

**Fluxo de criação resultante:**
- Criar dentro de mesa (`/new?campaignId=…`): sistema **forçado pela mesa**, sem seletor.
- Criar ficha pessoal: seletor (pulado se 1 sistema).
- Criar mesa: escolhe o sistema (pulado se 1 sistema).

**`campaign_roster` (acoplamento D&D no servidor):** é o análogo server-side do
`summarize()` e é inerentemente específico do sistema (devolve class/race/level/
HP/CA). No v1 segue D&D-shaped e funciona pra mesas de D&D. Como a mesa agora é
tagueada, dá pra ramificar a RPC por `campaigns.system` quando o roster do
Daggerheart existir. Costura adiada, com o gancho no lugar.

## 5. Plano de extração do `dnd5e`

**Layout-alvo:**

```
src/
  systems/
    index.js          ← registry: getSystemCore, getSystemUI, listSystems
    envelope.js       ← schema compartilhado (id, system, meta, espelhos) + parseEnvelope
    dnd5e/
      core.js         ← adaptador fino (reexporta domain)
      ui.js           ← lazy: Wizard, Sheet, DataProvider
      domain/         ← movido de src/domain/*
      components/     ← CharacterWizardV2, CharacterSheet, Bestiary, PrintView, etc.
      data/           ← SrdProvider, fetchSrd
  components/         ← CASCA: CharacterList, Campaigns, Admin, DiceRoller, ui/  (ficam)
  auth/  lib/  utils/storage.js                                                  (ficam)
```

**Duas fases separadas:**

- **Fase A — relocação pura, comportamento idêntico.** Mover arquivos de D&D pra
  `systems/dnd5e/` e **só atualizar caminhos de import**. Zero mudança de lógica,
  zero impacto no banco. Os 1017 testes são a rede: passou = relocação correta.
- **Fase B — introduzir a costura.** Criar `core.js` (reexporta o existente),
  `ui.js`, registry, religar `storage.js` (dispatch) + `App.jsx` (roteamento) +
  as migrations. Pequena e localizada porque as entranhas não dependem do contrato.

Misturar as fases é o erro clássico: se algo quebra, não se sabe se foi a pasta
ou a abstração.

**Decisões pra minimizar churn:**
- **`public/srd-data/` NÃO se move.** O DataProvider busca os mesmos caminhos.
  Mover assets públicos forçaria bump do `cacheName` do Service Worker
  (`vite.config.js`) e mudaria URLs — risco sem ganho. Logicamente do dnd5e,
  fisicamente ficam.
- **`summarize()`** extrai a lógica que a `CharacterList` já usa pra montar o card
  → método do `core.js`; a lista consome `{ title, subtitle, badges }`.
- **`createCharacter(seed)`** puxa o "esqueleto inicial" hoje inline no wizard.
- **Mapa/tokens da Companhia** seguem D&D-shaped no v1 (junto com o roster).

## 6. Testes + manter o app verde

**Ordem:** Fase A 100% verde **antes** da Fase B. Commits pequenos.

**Fase A:** suíte atual é o guardião. Qualquer vermelho = import esquecido, não
regressão. `npm test` cheio após a relocação. *Flake conhecido:* timeout em
`LoginScreen`/`ResetPasswordScreen` na suíte cheia — vermelho isolado lá é o
flake; re-rodar confirma.

**Fase B (TDD, testes primeiro):**
- Envelope: válido passa; sem `system` → default `'dnd5e'`; desconhecido → corpo pulado sem throw.
- Registry: `getSystemCore('dnd5e')` resolve; `'xpto'` tratado; `listSystems()` inclui dnd5e.
- Dispatch no `storage.js`: ficha legada carrega como dnd5e; ficha de sistema não
  registrado é ignorada via `reportError` sem derrubar a lista; save despacha pro parse certo.
- Roteamento: `/new` com 1 sistema pula seletor; `/c/:id` lê sistema → Sheet certa; legado → Sheet dnd5e.
- `summarize()`: fixture conhecida → title/subtitle esperados.
- DB (`npm run test:rls`, banco real): coluna gerada deriva `'dnd5e'` pra row
  legada e reflete o blob; coluna `system` da mesa + `create_campaign(p_system)`;
  trigger de mismatch rejeita ligar ficha a mesa de outro sistema; ficha+mesa
  existentes (ambos dnd5e) continuam ligando.

**Lint:** ungated, ~611 erros pré-existentes. Manter arquivos movidos/novos
limpos; não encostar no backlog.

**App real (após Fase B):** smoke test — criar ficha de D&D (seletor pulado),
abrir ficha existente (carrega dnd5e), lista renderiza via `summarize`, mesa
funciona.

## 7. Rollback / segurança

**Código:** tag `pre-multi-sistema` (`8b9f3c1`) = site como está agora. Trabalho
todo em `multi-sistema-fronteira`; `master` intocado até merge verificado.
Reverter: `git reset --hard pre-multi-sistema`.

**Produção:** deploy só dispara no push pro `master` → enquanto na branch, prod
não é tocada. Pós-merge: Vercel guarda deploys anteriores → Instant Rollback em
um clique, independente do git.

**Banco (camada que git não cobre):** migrations são **aditivas e
não-destrutivas** (add coluna com default, add trigger, alter RPC) — nenhuma row
existente é mutada/apagada. Blindagem:
- Cada migration vem com o **"down" documentado** (`drop column`/`drop trigger`/
  restaurar RPC anterior).
- **Snapshot manual** de `characters` e `campaigns` antes de aplicar (export
  Supabase) — belt-and-suspenders.
- Runtime degrada sem as migrations → aplicar/reverter sem quebrar o app.
- Fase A tem zero impacto no banco; migrations só na Fase B (risco isolado e tardio).

## Costuras adiadas (explícitas)

- **DiceRoller** global assume d20; Daggerheart (2d12 dualidade) exigirá o sistema
  contribuir comportamento de dado. Não resolvido no v1.
- **Mapa/tokens** da Companhia são D&D-flavored (HP/CA).
- **`campaign_roster`** segue D&D-shaped; ramifica por `campaigns.system` no futuro.
- **Vínculo mesa↔sistema** já resolvido (Seção 4), não adiado.
