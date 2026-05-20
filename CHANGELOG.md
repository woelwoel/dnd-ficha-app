# Changelog

Todas as mudanças relevantes neste projeto são documentadas aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento semântico: [SemVer](https://semver.org/lang/pt-BR/).

`schemaVersion` refere-se ao formato de persistência do personagem em
`localStorage` e na exportação JSON — ver `src/domain/characterSchema.js`.

## [Não lançado]

### Adicionado (PR 5 — Polimento)
- **Short ID nas URLs de ficha**: 10 chars URL-friendly (sem 0/O/1/I/l).
  `/c/V1StGXR8_Z` em vez de `/c/13f58f02-445e-4334-b5c3-56e55f9b9bbe`.
  URLs antigas (UUID) continuam funcionando como fallback.
  Requer migration `supabase/migrations/0003_characters_short_id.sql`.
- **Roteamento por URL** (react-router-dom v7): `/`, `/new`, `/c/:id`.
  F5 mantém a view atual; botão voltar do browser funciona; links de ficha
  são compartilháveis (sujeitos a RLS).
- **Footer LGPD** com aviso de armazenamento e contato.
- **Banner offline** detecta `navigator.onLine` e avisa quando perde conexão.
- **Auto-save com 3 estados visíveis**: "Salvando…" / "✓ Salvo" / "⚠ Sem salvar".
- **CSP via headers HTTP** (vercel.json): mais forte que meta tag, suporta
  `frame-ancestors`. Adiciona também `X-Content-Type-Options`,
  `Referrer-Policy` e `Permissions-Policy`.
- `vercel.json` com SPA rewrite pra que rotas (`/c/:id`) resolvam `index.html`.

### Adicionado (PR 2 — Fichas no Postgres)
- Persistência das fichas migrada de `localStorage` para Supabase Postgres
  (tabela `public.characters` com RLS owner-only).
- Fichas agora sincronizam entre dispositivos da mesma conta automaticamente
  (refresh manual ainda necessário — realtime fica pra PR 5).
- `storage.js` mantém a mesma fachada de funções, agora todas `async`.
- RPCs `update_character_position` (jsonb_set) e `touch_character_last_opened`
  evitam reescrever o payload completo em operações de alta frequência.
- Limite anti-abuse: 100 fichas por conta + 200 KB por ficha.
- Campo `traits` no schema da ficha tornou-se opcional com default `{}` —
  mais tolerante a fichas migradas sem o campo explícito.

### Removido (PR 2)
- Persistência de fichas em `localStorage`. Backup local (export JSON) continua
  funcionando como mecanismo de portabilidade.
- Listener cross-tab `storage` event no `CharacterList` (não se aplica mais).

### Notas (PR 2)
- Setup adicional: aplicar migration `supabase/migrations/0002_characters.sql`
  no SQL Editor do Supabase antes do primeiro uso.

### Adicionado (PR 1 — Auth Supabase)
- Autenticação Supabase com email/senha. App passa a exigir login antes de
  mostrar a lista de fichas. Google OAuth fica pra PR futuro.
- Fluxo de "esqueci a senha" e tela `ResetPasswordScreen` para definição de
  nova senha após link de recovery.
- `AuthProvider` em `src/auth/` gerencia sessão, recovery mode e expõe
  `useAuth()` (signIn, signUp, signOut, requestPasswordReset, updatePassword,
  signInWithGoogle reservado pra futuro).
- `LoginScreen` com abas Entrar/Criar conta, validação de senha mínima
  (8 chars) e tradução das mensagens de erro do Supabase pra PT-BR.
- Botão "Sair" temporário no header de `CharacterList` (AccountMenu completo
  fica pra PR 4).
- Tabela `public.profiles` no Supabase com trigger automático a partir de
  `auth.users` (migration `supabase/migrations/0001_profiles.sql`). RLS
  habilitado: leitura por qualquer usuário autenticado, update só do próprio.

### Notas
- Fichas continuam armazenadas em `localStorage` neste PR. A migração para
  Postgres ocorre no PR 2.
- Setup manual obrigatório do projeto Supabase: ver
  [docs/supabase-setup.md](docs/supabase-setup.md).
- Vars de ambiente requeridas em `.env.local` (e no Vercel pra produção):
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

### Corrigido
- `utils/fetchSrd.js` agora checa `res.ok` e `content-type` antes de `.json()`,
  respeita `AbortController` e tenta cadeia de fallbacks em vez de engolir
  erros silenciosamente.
- Componentes `CantripsGrantPicker` e `CharacterView` passaram a consumir
  dados via `useSrd()` em vez de `fetch` direto — elimina race conditions,
  requisições duplicadas e vazamentos em unmount.

### Adicionado
- A11y completa nas abas (`SheetTabs`/`SheetContent`): `role=tablist`,
  `role=tab`, `role=tabpanel`, `aria-selected`, `aria-controls`,
  `aria-labelledby`, roving tabindex e navegação por teclado
  (←/→ circular, Home/End).
- `meta.schemaVersion` no schema de personagem + função `migrateCharacter`
  para migrações incrementais entre versões.
- `README.md` de projeto substituindo o template Vite.
- `CHANGELOG.md`.
- `React.memo` em `AttributeBox`, `CombatStats`, `StatBox`, `SavingThrows`,
  `SheetTabs`, `NavBlockedBanner`, `ImportErrorBanner`.

### Alterado
- `safeParseCharacter` e `parseCharacter` agora passam o payload por
  `migrateCharacter` antes do parse Zod.

## [0.1.0] — 2026-04

Primeira versão usável. `schemaVersion: 1`.

### Highlights
- Wizard de criação em passos com validação por aba (touched pattern).
- Ficha com abas: ficha, perícias, magias, inventário, notas, visualizar.
- Regras de conjuração multiclasse (PHB) + Pact Magic do Bruxo.
- Persistência local em `localStorage` com validação Zod.
- Import/export de JSON com `safeParseCharacter`.
- Error Boundary global.
- Code splitting com `React.lazy` em `CharacterSheet` e `CharacterWizard`.
- Auto-save debounced (500ms).
- CSP estrita em `index.html`.
