# Desbloqueio do E2E + a11y autenticado — Plano

> Executado inline nesta sessão. Steps com checkbox pra tracking.

**Goal:** Restaurar a suíte E2E (hoje 100% stale — app virou auth-only Supabase) e auditar a11y das telas logadas, sem depender de backend real nem de secrets.

**Estratégia:** Build E2E forçado a `VITE_SUPABASE_URL=https://dummy.supabase.co` (ref determinístico = "dummy" → storageKey `sb-dummy-auth-token` e endpoints previsíveis). Um helper (a) semeia uma sessão fake no localStorage → `getSession()` passa o Gate sem login real; (b) instala um catch-all `page.route` nos endpoints `**/auth/v1/**` e `**/rest/v1/**` com store em memória → app 100% offline e determinístico. Nenhuma mudança em código de produção.

**Por que stub e não backend real:** roda local (verificável por mim) e no CI sem secrets, zero flake de rede, e testa todo o código do app menos o write real (que o job `rls` já cobre).

---

### Task 1: webServer E2E com Supabase dummy
- [ ] `playwright.config.js`: `webServer.env` com `VITE_SUPABASE_URL=https://dummy.supabase.co` + `VITE_SUPABASE_ANON_KEY=dummy-anon-key`. (Build inlina; stub intercepta a rede.)

### Task 2: Helper de auth + stub Supabase
- [ ] Criar `e2e-pw/support/supabase-stub.js`:
  - `seedSession(context)` — `addInitScript` grava `sb-dummy-auth-token` com sessão fake (user id fixo, `expires_at` no futuro).
  - `stubSupabase(context, { characters })` — `context.route('**/rest/v1/**' , ...)` e `**/auth/v1/**`:
    - `GET /auth/v1/user` → user fake.
    - `GET /rest/v1/characters*` → array do store (default []).
    - `POST /rest/v1/characters*` (upsert) → grava no store, devolve `[{short_id, campaign_id}]` (respeita `Prefer: return=representation`).
    - rpc/outros GET → `[]`; outros POST → `{}` (defaults benignos, resiliente a chamadas não enumeradas).
  - `installAuthedApp(context, opts)` — combina os dois.

### Task 3: Consertar smoke.spec (usa o helper)
- [ ] `beforeEach` chama `installAuthedApp`. Testes: lista "Tomo dos Heróis" renderiza, "Inscrever Novo Herói" abre o wizard (Passo 1), voltar retorna à lista, FAB de dados abre. (Mesmos asserts de antes, agora autenticados.)

### Task 4: Aposentar/retrair persistence.spec
- [ ] persistence.spec testa persistência em `localStorage['dnd-app-characters']` — mecanismo que NÃO existe mais (storage.js é 100% Supabase). Reescrever como: store stub com 2 fichas → lista mostra ambas → reload mantém (persistência agora é backend-stub). Ou remover se redundante com smoke.

### Task 5: wizard.spec — caminho feliz + erro
- [ ] Dirigir o wizard (Humano Guerreiro nv1) preenchendo os blocos até "Inscrever Herói" habilitar. Mapear os cliques ao vivo (preview com sessão semeada) antes de escrever.
- [ ] Sucesso: clicar Inscrever → assert POST de `characters` disparado com body schema-válido E o app sai do wizard (ficha ou lista).
- [ ] Erro (cobre o bug "falha em silêncio"): stub POST → 500 → assert banner `role="alert"` visível e continua no wizard.

### Task 6: a11y.spec autenticado
- [ ] Estender com sessão semeada: lista (vazia) e wizard (Passo 1 + grid) sem violações critical/serious. Corrigir o que aparecer (provável âmbar-como-texto).

### Task 7: CI opcional (decisão) + fechamento
- [ ] Avaliar rodar Playwright no CI (job próprio). Se o build+preview couber no tempo, adicionar; senão, documentar como suíte local + deixar para decisão.
- [ ] `npm run test:e2e` inteiro verde local. Commit + merge + push.

## Critério de aceite
Todos os specs e2e verdes localmente (smoke + persistence-novo + wizard + a11y), sem backend real; a11y das telas logadas sem critical/serious.
