# Grimório de Personagens — D&D 5e

Aplicativo de fichas de **Dungeons & Dragons 5ª Edição** em PT-BR: criação
guiada por wizard, ficha completa com abas, regras de conjuração e multiclasse,
rolador de dados, bestiário, modo de impressão e **mesas compartilhadas** entre
mestre e jogadores.

Single-page app em React com backend **Supabase** (autenticação + Postgres com
RLS). Instalável como **PWA** e funciona offline para leitura. Deploy contínuo
na **Vercel**.

> O README antigo descrevia um app 100% client-side com `localStorage`. Isso
> mudou: hoje as fichas vivem no Postgres, sincronizam entre dispositivos e
> podem ser compartilhadas em mesas. O backup local (export JSON) continua
> existindo como mecanismo de portabilidade.

## Funcionalidades

- **Autenticação** (Supabase) com email/senha, fluxo de "esqueci a senha" e
  menu de conta (sair, apagar conta com confirmação).
- **Wizard de criação** em passos (`CharacterWizardV2`), com validação por aba
  no padrão *touched* e auto-avanço.
- **Ficha completa** com abas: Ficha, Perícias, Magias, Inventário,
  Habilidades/Recursos, Notas (diário de sessões) e Visualizar.
- **Regras de D&D 5e**: modificadores, bônus de proficiência, CD de magia,
  ataques (com versátil, alcance, munição), conjuração multiclasse (PHB) e
  Pact Magic do Bruxo calculados separadamente.
- **Multiclasse**: pré-requisitos, proficiências e pickers de subclasse +
  recursos de classe para as 12 classes do PHB.
- **Painéis dedicados de classe**: Mago, Patrulheiro, Clérigo, Bruxo, Druida
  (Forma Selvagem com catálogo de bestas e stat block), Guerreiro (Manobras).
- **Progressão de nível** em zonas (Histórico / Aqui / O que vem).
- **Mesas / Campanhas**: criar mesa, entrar por código de convite, listar
  membros (badge Mestre/Jogador), e o DM lê as fichas dos jogadores em modo
  leitura. Selector de contexto (Pessoais / Mesa X) na lista de fichas.
- **Rolador de dados** com histórico, vantagem por long-press (mobile) e
  botões de rolagem integrados à ficha.
- **Bestiário** SRD com busca e stat block traduzido para PT-BR.
- **Modo de impressão** com confirmação e opções de página.
- **Import/export de JSON** validado por Zod (`safeParseCharacter`).
- **PWA**: instalável, cache de assets/SRD e prompt de atualização.
- **Offline**: banner detecta perda de conexão; leitura segue funcionando.

## Stack

| Camada            | Ferramenta                              |
|-------------------|-----------------------------------------|
| UI                | React 19                                |
| Roteamento        | React Router v7 (`/`, `/new`, `/c/:id`, `/campaigns`) |
| Build/dev server  | Vite 8                                  |
| Estilos           | Tailwind CSS 4                          |
| Componentes       | Headless UI + ícones Lucide             |
| Backend           | Supabase (Auth + Postgres + RLS)        |
| Serverless        | Vercel Functions (`api/`)               |
| PWA               | vite-plugin-pwa                         |
| Validação runtime | Zod 3                                   |
| Testes unitários  | Vitest 4 + Testing Library + jsdom      |
| Testes e2e        | Playwright                              |
| Lint              | ESLint 9 (flat config)                  |
| Hospedagem        | Vercel                                  |

## Setup

Este app requer um projeto Supabase configurado. Veja
[docs/supabase-setup.md](docs/supabase-setup.md).

1. Crie o projeto Supabase e aplique as migrations de `supabase/migrations/`
   na ordem (0001 → 0006) pelo SQL Editor.
2. Copie `.env.example` para `.env.local` e preencha:

   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

   Para rodar `npm run test:rls` também são necessários dois usuários de teste
   (`TEST_DM_EMAIL`/`TEST_DM_PASSWORD`, `TEST_PLAYER_EMAIL`/`TEST_PLAYER_PASSWORD`).

## Como rodar

```bash
npm install
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção (saída: dist/)
npm run preview      # serve o build

npm test             # testes unitários (vitest run)
npm run test:watch
npm run test:ui
npm run test:e2e     # testes Playwright
npm run test:all     # vitest + playwright
npm run test:rls     # valida isolamento RLS com 2 usuários reais

npm run lint
```

Requer Node ≥ 20.

## Estrutura de pastas

```
api/                            # Vercel Functions (delete-account, health, log)
supabase/migrations/            # SQL com RLS (profiles, characters, campaigns, ...)
docs/                           # supabase-setup, audits, decisions, ops
e2e-pw/                         # specs Playwright
public/srd-data/                # JSONs SRD/PHB em PT-BR (fallback p/ inglês)
scripts/                        # geração/enriquecimento de dados SRD (Python/Node)

src/
  App.jsx                       # rotas (React Router) + ErrorBoundary + providers
  ErrorBoundary.jsx
  main.jsx
  auth/                         # AuthProvider, LoginScreen, ResetPasswordScreen
  lib/
    supabase.js                 # cliente Supabase
    campaigns.js                # fachada async sobre as RPCs de mesas
    report.js
  domain/                       # regras puras e testáveis de D&D 5e
    attributes.js, rules.js, characterSchema.js (Zod + migração)
    conditions.js, equipment.js, magicItems.js, subclassSpells.js, ...
  utils/
    calculations.js             # modifier, prof bonus, skills, spell DC
    spellcasting.js             # slots multiclasse + Pact Magic
    attacks.js, rest.js, hitDice.js, monsters.js, spellFilters.js
    storage.js                  # CRUD de fichas no Supabase (async) + Zod
    fetchSrd.js                 # fallback seguro p/ JSON SRD
  providers/SrdProvider.jsx     # context que carrega os datasets SRD
  context/DiceRollerContext.jsx
  hooks/
    useCharacter.js, useCharacterCalculations.js, useAutoSave.js
    useClassSpells.js, useTabValidation.js, useCharacterRealtime.js
    useCampaignContext.js, useDiceRoller.js, useDraggableFab.js
  components/
    CharacterList/              # lista de fichas + selector de contexto
    CharacterWizardV2/          # wizard de criação (steps, blocks, hooks)
    CharacterSheet/             # ficha com abas + progressão de nível
    Campaigns/                  # telas de mesas (lista + detalhe)
    Bestiary/                   # bestiário SRD
    DiceRoller/                 # rolador + histórico
    PrintView/                  # modo de impressão
    ui/                         # primitivos: Modal, Button, Icon, Banner, ...
  test/                         # Vitest (unit + integração)
```

## Regras e escolhas de design

- **Backend Supabase com RLS owner-only**. Fichas em `public.characters`
  (RLS por dono; DM da mesa lê fichas dos jogadores em modo leitura). Auth em
  `auth.users` + `public.profiles` (trigger automático). Campanhas em
  `campaigns`/`campaign_members` com RPCs (`create_campaign`, `join_campaign`
  com rate limit, `rotate_invite_code`, `delete_my_account`).
- **`storage.js` é a fachada de persistência** — todas as funções são `async`
  e falam com o Supabase. Componentes não chamam o cliente direto. RPCs como
  `update_character_position` e `touch_character_last_opened` evitam reescrever
  o payload completo em operações de alta frequência.
- **Sincronização entre dispositivos** da mesma conta + realtime
  (`useCharacterRealtime`). Limites anti-abuse: 100 fichas/conta, 200 KB/ficha.
- **Short IDs nas URLs** (`/c/V1StGXR8_Z`): 10 chars URL-friendly (sem
  `0/O/1/I/l`). UUIDs antigos seguem funcionando como fallback.
- **Dados SRD passam todos pelo `SrdProvider`**. Nenhum componente faz `fetch`
  direto — o provider dedup via cache de Promise e aborta em unmount. Use
  `useSrd()` ou hooks derivados como `useClassSpells`.
- **`schemaVersion`** em `meta.schemaVersion` permite migrações incrementais.
  Ao bump, escreva a migração em `migrateCharacter`
  ([domain/characterSchema.js](src/domain/characterSchema.js)).
- **Multiclasse de conjuradores** segue a PHB: tabela unificada de slots para
  Mago/Clérigo/Druida/Paladino/Feiticeiro/Bardo/Patrulheiro, com Pact Magic
  (Bruxo) calculada separadamente e somada depois.
- **A11y**: abas com `role=tablist`/`tab`/`tabpanel`, roving tabindex e
  setas/Home/End; modais com `role=dialog`, `aria-modal`, ESC e focus
  management; erros de campo com `aria-describedby`.
- **Performance**: `React.lazy` para `CharacterSheet`, `CharacterWizardV2` e
  telas de Campanhas; auto-save com debounce de 500ms; `React.memo` e `useMemo`
  com deps primitivas nos cálculos derivados.
- **Segurança**: CSP via **headers HTTP** ([vercel.json](vercel.json)) —
  mais forte que meta tag, com `frame-ancestors`, `X-Content-Type-Options`,
  `Referrer-Policy` e `Permissions-Policy`. Import de JSON **nunca** confia no
  payload: passa por `safeParseCharacter` (Zod) antes de tocar o estado.

## Formato do personagem (resumo)

Ver [src/domain/characterSchema.js](src/domain/characterSchema.js) para o
schema Zod completo.

```jsonc
{
  "id": "string",
  "meta": {
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601",
    "version": "1.0",
    "schemaVersion": 1,
    "settings": { "allowFeats": false, "allowMulticlass": false },
    "creationMethod": "wizard"
  },
  "info": { /* nome, raça, classe, multiclasses, xp, ... */ },
  "attributes": { "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10 },
  "appliedRacialBonuses": {},
  "combat": { "maxHp": 0, "currentHp": 0, "tempHp": 0, "armorClass": 10, "speed": 30, "hitDice": "1d8", "deathSaves": { "successes": 0, "failures": 0 } },
  "proficiencies": { "savingThrows": [], "skills": [], "expertiseSkills": [], "armor": [], "weapons": [], "tools": [], "languages": [] },
  "spellcasting": { "ability": null, "usedSlots": {}, "spells": [] },
  "inventory": { "currency": { "cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0 }, "items": [] },
  "traits": { "personalityTraits": "", "ideals": "", "bonds": "", "flaws": "", "featuresAndTraits": "", "notes": "" }
}
```

## Testes

```bash
npm test          # unit
npm run test:e2e  # e2e (Playwright)
npm run test:rls  # isolamento RLS end-to-end (2 usuários reais)
```

Cobertura unitária inclui, entre outros:
- `storage` — CRUD/round-trip e tolerância a dados inválidos.
- `spellcasting` — slots multiclasse 1-20, Pact Magic, preparação.
- `calculations` — modifiers, prof bonus, spell DC, bounds.
- `phb-classes` / `phb-progression` — atributo de conjuração e features por
  nível das 12 classes (travas de regressão da PHB).
- `useClassSpells` — Pact Magic do Bruxo + full caster.
- `background` — parsing de equipamento de background.
- `wizard` / `tabValidation` — fluxo de criação e padrão touched-tab.
- testes de `auth`, `lib`, `ui` e integração.

## Deploy

Deploy na **Vercel**. [vercel.json](vercel.json) define o SPA rewrite (rotas
como `/c/:id` resolvem `index.html`) e os headers de segurança. As variáveis
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` precisam estar configuradas no
projeto Vercel.

## Histórico

Mudanças relevantes ficam em [CHANGELOG.md](CHANGELOG.md) (Keep a Changelog +
SemVer). A evolução do backend está organizada nos PRs 1–5 (auth → fichas no
Postgres → schema de campanhas → UI de mesas → polimento).

## Contribuindo

Antes de abrir PR: `npm run lint && npm test`. Commits em imperativo
("add X", "fix Y"), em PT ou EN tanto faz.

## Licença

Uso pessoal. Conteúdo SRD 5e sob **Open Gaming License 1.0a** / **Creative
Commons CC-BY-4.0** (ver
<https://dnd.wizards.com/resources/systems-reference-document>).
