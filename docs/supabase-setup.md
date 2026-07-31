# Setup do projeto Supabase

Este projeto usa Supabase para autenticação e (a partir do PR 2) persistência de fichas.
Siga este checklist para configurar um novo projeto.

## 1. Criar projeto

1. Acesse https://supabase.com/dashboard e crie um novo projeto.
2. Anote a **Project URL** e a **anon public key** (Settings → API).

## 2. Configurar variáveis locais

```bash
cp .env.example .env.local
# Editar .env.local e preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

## 3. Aplicar migrations SQL

No dashboard, abra **SQL Editor** e execute o conteúdo de **cada** arquivo de
`supabase/migrations/`, em ordem numérica, começando por `0001_profiles.sql`
até o último do diretório. Uma migration pulada não dá erro visível no app —
ela apaga uma feature em silêncio.

Como conferir se o banco está em dia, sem abrir o dashboard: o app nunca
nomeia a coluna `characters.version` na leitura da companhia justamente porque
a `0009` já ficou pendente uma vez (a query morria com `42703` e a mesa do
Mestre exibia "nenhum jogador criou ficha"). Se o combate do Mestre recusar
escritas nas fichas, a suspeita nº 1 é migration faltando — reaplique a `0009`
e a `0015`, ambas idempotentes.

## 4. Configurar Authentication

**Settings → Authentication → Providers:**
- **Email:** habilitar. Marcar "Confirm email" = ON.
- **Google (opcional, não usado no PR 1):** caso queira habilitar no futuro, configurar `Client ID` e `Client Secret` do Google Cloud Console.
  - No Google Cloud Console (https://console.cloud.google.com), criar OAuth client tipo "Web application".
  - **Authorized redirect URIs:** `https://<seu-projeto>.supabase.co/auth/v1/callback`

**Settings → Authentication → Policies:**
- **Password requirements:** mínimo 8 caracteres.
- **Leaked password protection (HIBP):** habilitar.

**Settings → Authentication → URL Configuration:**
- **Site URL:** URL de produção (ex: `https://dnd-ficha-app.vercel.app`).
- **Redirect URLs:** adicionar (uma por linha):
  - `http://localhost:5173/**`
  - `https://dnd-ficha-app.vercel.app/**`
  - `https://*-woelwoel.vercel.app/**` (ou o pattern dos seus previews)

## 5. Configurar variáveis no Vercel

No painel do Vercel → Project → Settings → Environment Variables, adicionar para **Production, Preview e Development**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 6. Testar

```bash
npm run dev
```

Abra `http://localhost:5173`. Deve aparecer a tela de login.
