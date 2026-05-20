# Supabase Migration — PR 1: Auth Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar autenticação Supabase (email/senha) gating o app, sem ainda tocar na persistência de fichas — localStorage continua sendo a fonte de dados das fichas até o PR 2. **Google OAuth fica fora do PR 1** (adicionado em PR futuro); a função `signInWithGoogle` existe no `AuthProvider` mas não é exposta na UI.

**Architecture:** Singleton client em `src/lib/supabase.js`. Contexto React `AuthProvider` em `src/auth/` gerencia sessão e expõe `useAuth()`. Telas `LoginScreen` e `ResetPasswordScreen` consomem o contexto. `App.jsx` faz gating: loading → spinner; sem usuário → login; com usuário → app atual. Tabela `profiles` com trigger criada no Supabase. Confirmação de email obrigatória, HIBP, Allowed Origins e Google OAuth configurados via dashboard.

**Tech Stack:** `@supabase/supabase-js` v2, React 19, Vite 8, Tailwind 4, Vitest + React Testing Library.

**Spec de referência:** `docs/superpowers/specs/2026-05-19-sair-do-localstorage-design.md` (seções 1, 2 parcial — só `profiles`, 4 parcial — só `AuthProvider`, 6 — telas de auth, segurança itens 1/2/4-7/10/14).

---

## File Structure

**Criar:**
- `src/lib/supabase.js` — cliente singleton
- `src/auth/AuthProvider.jsx` — contexto + provider + hook `useAuth`
- `src/auth/LoginScreen.jsx` — UI de login/cadastro
- `src/auth/ResetPasswordScreen.jsx` — nova senha após link de email
- `src/auth/index.js` — barrel `export { AuthProvider, useAuth, LoginScreen, ResetPasswordScreen }`
- `supabase/migrations/0001_profiles.sql` — DDL de `profiles` + trigger
- `.env.example` — template das vars
- `docs/supabase-setup.md` — checklist de configuração manual no dashboard
- `src/test/auth/AuthProvider.test.jsx`
- `src/test/auth/LoginScreen.test.jsx`
- `src/test/auth/ResetPasswordScreen.test.jsx`
- `src/test/auth/App.gating.test.jsx`

**Modificar:**
- `src/App.jsx` — envolver em `AuthProvider`, adicionar gating
- `src/components/CharacterList/CharacterList.jsx` — botão "Sair" temporário no header
- `package.json` — `@supabase/supabase-js` em dependencies
- `.gitignore` — garantir `.env.local` ignorado
- `README.md` — seção curta apontando pra `docs/supabase-setup.md`

---

### Task 1: Setup de dependências e variáveis de ambiente

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Instalar SDK do Supabase**

Run: `npm install @supabase/supabase-js@^2.45.0`
Expected: `package.json` ganha `"@supabase/supabase-js": "^2.45.0"` em `dependencies`. `package-lock.json` atualizado.

- [ ] **Step 2: Criar `.env.example`**

Conteúdo de `.env.example`:
```
# Supabase — copie para .env.local e preencha com valores do dashboard
# Settings → API → Project URL
VITE_SUPABASE_URL=
# Settings → API → Project API keys → anon public
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Garantir que `.env.local` está no `.gitignore`**

Verificar `.gitignore`. Se não tiver `.env.local`, adicionar a linha:
```
.env.local
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore
git commit -m "chore(supabase): adiciona dependência e env scaffolding"
```

---

### Task 2: Documentação de setup manual do Supabase

**Files:**
- Create: `docs/supabase-setup.md`
- Modify: `README.md`

- [ ] **Step 1: Escrever `docs/supabase-setup.md`**

Conteúdo:
````markdown
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

No dashboard, abra **SQL Editor** e execute o conteúdo de `supabase/migrations/0001_profiles.sql`.

> No futuro, migrations adicionais serão aplicadas na mesma ordem (0002, 0003, …).

## 4. Configurar Authentication

**Settings → Authentication → Providers:**
- **Email:** habilitar. Marcar "Confirm email" = ON.
- **Google:** habilitar. Configurar `Client ID` e `Client Secret` do Google Cloud Console.
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
````

- [ ] **Step 2: Adicionar seção no `README.md`**

Adicionar próximo ao topo do README (após o título/descrição):
```markdown
## Setup

Este app requer um projeto Supabase configurado. Veja [docs/supabase-setup.md](docs/supabase-setup.md).
```

- [ ] **Step 3: Commit**

```bash
git add docs/supabase-setup.md README.md
git commit -m "docs(supabase): checklist de setup manual do projeto"
```

---

### Task 3: Migration SQL — `profiles` + trigger

**Files:**
- Create: `supabase/migrations/0001_profiles.sql`

- [ ] **Step 1: Criar pasta e arquivo da migration**

Arquivo `supabase/migrations/0001_profiles.sql`:
```sql
-- Profile espelho de auth.users (1:1). Atualizações automáticas via trigger.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Qualquer usuário autenticado pode ler perfis (display_name é público no app).
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Cada usuário só atualiza o próprio perfil.
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger: cria profile automaticamente ao criar auth.users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: atualiza updated_at.
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
```

- [ ] **Step 2: Aplicar migration no Supabase (manual)**

Abrir o SQL Editor do projeto Supabase, colar o conteúdo do arquivo e executar.
Verificar no Table Editor que `public.profiles` existe.

- [ ] **Step 3: Verificar trigger manualmente**

No SQL Editor:
```sql
-- Criar user de teste pela UI Authentication → Users → Add user (email/password).
-- Em seguida:
select * from public.profiles;
```
Expected: linha com `display_name` = parte antes do `@` do email do user.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_profiles.sql
git commit -m "feat(supabase): migration 0001 — tabela profiles + trigger auth.users"
```

---

### Task 4: Cliente Supabase singleton

**Files:**
- Create: `src/lib/supabase.js`
- Test: `src/test/lib/supabase.test.js`

- [ ] **Step 1: Escrever o teste**

Criar `src/test/lib/supabase.test.js`:
```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('src/lib/supabase', () => {
  const ORIGINAL_ENV = { ...import.meta.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    // Restaurar env
    for (const k of Object.keys(import.meta.env)) {
      if (!(k in ORIGINAL_ENV)) delete import.meta.env[k]
    }
    Object.assign(import.meta.env, ORIGINAL_ENV)
  })

  it('exporta um client com auth e from disponíveis quando env está setado', async () => {
    import.meta.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
    import.meta.env.VITE_SUPABASE_ANON_KEY = 'anon-key-test'
    const { supabase } = await import('../../lib/supabase')
    expect(supabase).toBeDefined()
    expect(typeof supabase.auth.getSession).toBe('function')
    expect(typeof supabase.from).toBe('function')
  })

  it('lança erro descritivo quando env está vazio', async () => {
    import.meta.env.VITE_SUPABASE_URL = ''
    import.meta.env.VITE_SUPABASE_ANON_KEY = ''
    await expect(import('../../lib/supabase')).rejects.toThrow(/VITE_SUPABASE_URL/)
  })
})
```

- [ ] **Step 2: Rodar teste — deve falhar**

Run: `npx vitest run src/test/lib/supabase.test.js`
Expected: FAIL (módulo `src/lib/supabase` não existe).

- [ ] **Step 3: Implementar o módulo**

Criar `src/lib/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local. ' +
    'Veja docs/supabase-setup.md.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
```

- [ ] **Step 4: Rodar teste — deve passar**

Run: `npx vitest run src/test/lib/supabase.test.js`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.js src/test/lib/supabase.test.js
git commit -m "feat(supabase): cliente singleton com validação de env"
```

---

### Task 5: `AuthProvider` e hook `useAuth`

**Files:**
- Create: `src/auth/AuthProvider.jsx`
- Test: `src/test/auth/AuthProvider.test.jsx`

- [ ] **Step 1: Escrever o teste**

Criar `src/test/auth/AuthProvider.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock do client Supabase
const authState = {
  session: null,
  listeners: new Set(),
}

const supabaseMock = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: authState.session }, error: null })),
    onAuthStateChange: vi.fn((cb) => {
      authState.listeners.add(cb)
      return { data: { subscription: { unsubscribe: () => authState.listeners.delete(cb) } } }
    }),
    signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
    signUp: vi.fn(async () => ({ data: {}, error: null })),
    signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    updateUser: vi.fn(async () => ({ data: {}, error: null })),
  },
}

vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { AuthProvider, useAuth } from '../../auth/AuthProvider'

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="loading">{auth.loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{auth.user ? auth.user.email : 'none'}</span>
      <span data-testid="recovery">{auth.recoveryMode ? 'recovery' : 'normal'}</span>
      <button onClick={() => auth.signOut()}>signout</button>
    </div>
  )
}

function emit(event, session) {
  for (const cb of authState.listeners) cb(event, session)
}

describe('AuthProvider', () => {
  beforeEach(() => {
    authState.session = null
    authState.listeners.clear()
    vi.clearAllMocks()
  })

  it('começa em loading e resolve sem user quando não há sessão', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByTestId('loading').textContent).toBe('loading')
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  it('expõe user quando sessão existe', async () => {
    authState.session = { user: { id: 'u1', email: 'a@b.com' } }
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('a@b.com'))
  })

  it('reage a SIGNED_IN e SIGNED_OUT', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))

    act(() => emit('SIGNED_IN', { user: { id: 'u1', email: 'x@y.com' } }))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('x@y.com'))

    act(() => emit('SIGNED_OUT', null))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'))
  })

  it('entra em recoveryMode em evento PASSWORD_RECOVERY', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
    act(() => emit('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'r@s.com' } }))
    await waitFor(() => expect(screen.getByTestId('recovery').textContent).toBe('recovery'))
  })

  it('signOut delega ao cliente', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
    await userEvent.click(screen.getByText('signout'))
    expect(supabaseMock.auth.signOut).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar teste — deve falhar**

Run: `npx vitest run src/test/auth/AuthProvider.test.jsx`
Expected: FAIL (módulo `src/auth/AuthProvider` não existe).

- [ ] **Step 3: Implementar `AuthProvider.jsx`**

Criar `src/auth/AuthProvider.jsx`:
```jsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        setUser(session?.user ?? null)
        setLoading(false)
        return
      }
      if (event === 'SIGNED_OUT') {
        setRecoveryMode(false)
      }
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(({ email, password }) => {
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signUp = useCallback(({ email, password }) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
  }, [])

  const signInWithGoogle = useCallback(() => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const requestPasswordReset = useCallback((email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    })
  }, [])

  const updatePassword = useCallback(async (password) => {
    const result = await supabase.auth.updateUser({ password })
    if (!result.error) setRecoveryMode(false)
    return result
  }, [])

  const value = {
    user,
    loading,
    recoveryMode,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    requestPasswordReset,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
```

- [ ] **Step 4: Rodar teste — deve passar**

Run: `npx vitest run src/test/auth/AuthProvider.test.jsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/auth/AuthProvider.jsx src/test/auth/AuthProvider.test.jsx
git commit -m "feat(auth): AuthProvider + useAuth com gestão de sessão e recovery"
```

---

### Task 6: `LoginScreen`

**Files:**
- Create: `src/auth/LoginScreen.jsx`
- Test: `src/test/auth/LoginScreen.test.jsx`

- [ ] **Step 1: Escrever o teste**

Criar `src/test/auth/LoginScreen.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const auth = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  requestPasswordReset: vi.fn(),
}

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => auth,
}))

import { LoginScreen } from '../../auth/LoginScreen'

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.signIn.mockResolvedValue({ data: {}, error: null })
    auth.signUp.mockResolvedValue({ data: {}, error: null })
    auth.requestPasswordReset.mockResolvedValue({ data: {}, error: null })
  })

  it('renderiza aba Entrar por default com email/senha', () => {
    render(<LoginScreen />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('faz login ao submeter o form', async () => {
    render(<LoginScreen />)
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'segredo12')
    await userEvent.click(screen.getByRole('button', { name: /^entrar$/i }))
    expect(auth.signIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'segredo12' })
  })

  it('exibe erro quando signIn retorna error', async () => {
    auth.signIn.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } })
    render(<LoginScreen />)
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'segredo12')
    await userEvent.click(screen.getByRole('button', { name: /^entrar$/i }))
    expect(await screen.findByText(/credenciais inválidas/i)).toBeInTheDocument()
  })

  it('troca para aba Criar conta e chama signUp', async () => {
    render(<LoginScreen />)
    await userEvent.click(screen.getByRole('tab', { name: /criar conta/i }))
    await userEvent.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'segredo12')
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'novo@b.com', password: 'segredo12' })
  })

  it('mostra mensagem após cadastro pedindo confirmação de email', async () => {
    render(<LoginScreen />)
    await userEvent.click(screen.getByRole('tab', { name: /criar conta/i }))
    await userEvent.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'segredo12')
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByText(/confirme seu email/i)).toBeInTheDocument()
  })

  it('valida senha mínima de 8 chars no cadastro antes de chamar signUp', async () => {
    render(<LoginScreen />)
    await userEvent.click(screen.getByRole('tab', { name: /criar conta/i }))
    await userEvent.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'curta')
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(auth.signUp).not.toHaveBeenCalled()
    expect(await screen.findByText(/pelo menos 8/i)).toBeInTheDocument()
  })

  it('fluxo de esqueci a senha pede email e chama requestPasswordReset', async () => {
    render(<LoginScreen />)
    await userEvent.click(screen.getByRole('button', { name: /esqueci a senha/i }))
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.click(screen.getByRole('button', { name: /enviar link/i }))
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('a@b.com')
    expect(await screen.findByText(/enviamos um link/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste — deve falhar**

Run: `npx vitest run src/test/auth/LoginScreen.test.jsx`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `LoginScreen.jsx`**

Criar `src/auth/LoginScreen.jsx`:
```jsx
import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '../components/ui/Button'

const TABS = { SIGNIN: 'signin', SIGNUP: 'signup', FORGOT: 'forgot' }

function translateError(message) {
  if (!message) return 'Erro desconhecido.'
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Credenciais inválidas.'
  if (m.includes('email not confirmed')) return 'Confirme seu email antes de entrar.'
  if (m.includes('user already registered')) return 'Email já cadastrado.'
  if (m.includes('password') && m.includes('weak')) return 'Senha muito fraca.'
  return message
}

export function LoginScreen() {
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const [tab, setTab] = useState(TABS.SIGNIN)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  function reset() {
    setError(null)
    setInfo(null)
  }

  async function onSubmitSignIn(e) {
    e.preventDefault()
    reset()
    setBusy(true)
    const { error } = await signIn({ email, password })
    setBusy(false)
    if (error) setError(translateError(error.message))
  }

  async function onSubmitSignUp(e) {
    e.preventDefault()
    reset()
    if (password.length < 8) {
      setError('Senha deve ter pelo menos 8 caracteres.')
      return
    }
    setBusy(true)
    const { error } = await signUp({ email, password })
    setBusy(false)
    if (error) setError(translateError(error.message))
    else setInfo('Confirme seu email para ativar a conta.')
  }

  async function onSubmitForgot(e) {
    e.preventDefault()
    reset()
    setBusy(true)
    const { error } = await requestPasswordReset(email)
    setBusy(false)
    if (error) setError(translateError(error.message))
    else setInfo('Enviamos um link para o email informado.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950 text-gray-100">
      <div className="w-full max-w-sm border border-gray-800 rounded-lg p-6 bg-gray-900">
        <h1 className="text-xl font-bold text-center mb-4" style={{ fontFamily: 'IM Fell English SC, serif', color: 'var(--color-gold-400)' }}>
          Forja de Heróis
        </h1>

        {tab !== TABS.FORGOT && (
          <div role="tablist" className="flex mb-4 border-b border-gray-800">
            <button
              role="tab"
              aria-selected={tab === TABS.SIGNIN}
              className={`flex-1 py-2 text-sm ${tab === TABS.SIGNIN ? 'border-b-2 border-amber-400 text-amber-400' : 'text-gray-400'}`}
              onClick={() => { setTab(TABS.SIGNIN); reset() }}
              type="button"
            >Entrar</button>
            <button
              role="tab"
              aria-selected={tab === TABS.SIGNUP}
              className={`flex-1 py-2 text-sm ${tab === TABS.SIGNUP ? 'border-b-2 border-amber-400 text-amber-400' : 'text-gray-400'}`}
              onClick={() => { setTab(TABS.SIGNUP); reset() }}
              type="button"
            >Criar conta</button>
          </div>
        )}

        {tab === TABS.FORGOT ? (
          <form onSubmit={onSubmitForgot} className="space-y-3">
            <h2 className="text-sm text-gray-300">Redefinir senha</h2>
            <label className="block">
              <span className="text-xs text-gray-400">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
              />
            </label>
            <Button type="submit" variant="gold" size="md" disabled={busy} className="w-full">
              Enviar link
            </Button>
            <button type="button" className="text-xs text-gray-400 underline" onClick={() => { setTab(TABS.SIGNIN); reset() }}>
              Voltar
            </button>
          </form>
        ) : (
          <form onSubmit={tab === TABS.SIGNIN ? onSubmitSignIn : onSubmitSignUp} className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-400">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Senha</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
              />
            </label>
            <Button type="submit" variant="gold" size="md" disabled={busy} className="w-full">
              {tab === TABS.SIGNIN ? 'Entrar' : 'Criar conta'}
            </Button>
            {tab === TABS.SIGNIN && (
              <button type="button" className="text-xs text-gray-400 underline" onClick={() => { setTab(TABS.FORGOT); reset() }}>
                Esqueci a senha
              </button>
            )}
          </form>
        )}

        {error && <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>}
        {info && <p className="mt-3 text-xs text-emerald-400">{info}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar teste — deve passar**

Run: `npx vitest run src/test/auth/LoginScreen.test.jsx`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/auth/LoginScreen.jsx src/test/auth/LoginScreen.test.jsx
git commit -m "feat(auth): LoginScreen com abas entrar/criar conta e reset"
```

---

### Task 7: `ResetPasswordScreen`

**Files:**
- Create: `src/auth/ResetPasswordScreen.jsx`
- Test: `src/test/auth/ResetPasswordScreen.test.jsx`

- [ ] **Step 1: Escrever o teste**

Criar `src/test/auth/ResetPasswordScreen.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const auth = { updatePassword: vi.fn() }
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => auth }))

import { ResetPasswordScreen } from '../../auth/ResetPasswordScreen'

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.updatePassword.mockResolvedValue({ data: {}, error: null })
  })

  it('renderiza campos de nova senha e confirmação', () => {
    render(<ResetPasswordScreen />)
    expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument()
  })

  it('rejeita senhas diferentes', async () => {
    render(<ResetPasswordScreen />)
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'senhaabc1')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'outracoisa')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(auth.updatePassword).not.toHaveBeenCalled()
    expect(await screen.findByText(/não conferem/i)).toBeInTheDocument()
  })

  it('rejeita senha < 8 chars', async () => {
    render(<ResetPasswordScreen />)
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'curta')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'curta')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(auth.updatePassword).not.toHaveBeenCalled()
    expect(await screen.findByText(/pelo menos 8/i)).toBeInTheDocument()
  })

  it('chama updatePassword quando válido', async () => {
    render(<ResetPasswordScreen />)
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'novasenha1')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'novasenha1')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(auth.updatePassword).toHaveBeenCalledWith('novasenha1')
  })
})
```

- [ ] **Step 2: Rodar teste — deve falhar**

Run: `npx vitest run src/test/auth/ResetPasswordScreen.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Criar `src/auth/ResetPasswordScreen.jsx`:
```jsx
import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '../components/ui/Button'

export function ResetPasswordScreen() {
  const { updatePassword } = useAuth()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (pw1.length < 8) {
      setError('Senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (pw1 !== pw2) {
      setError('As senhas não conferem.')
      return
    }
    setBusy(true)
    const { error } = await updatePassword(pw1)
    setBusy(false)
    if (error) setError(error.message)
    else setInfo('Senha atualizada.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950 text-gray-100">
      <form onSubmit={onSubmit} className="w-full max-w-sm border border-gray-800 rounded-lg p-6 bg-gray-900 space-y-3">
        <h1 className="text-lg font-bold" style={{ fontFamily: 'IM Fell English SC, serif', color: 'var(--color-gold-400)' }}>
          Definir nova senha
        </h1>
        <label className="block">
          <span className="text-xs text-gray-400">Nova senha</span>
          <input
            type="password"
            required
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-400">Confirmar senha</span>
          <input
            type="password"
            required
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          />
        </label>
        <Button type="submit" variant="gold" size="md" disabled={busy} className="w-full">
          Salvar
        </Button>
        {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        {info && <p className="text-xs text-emerald-400">{info}</p>}
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Rodar teste — deve passar**

Run: `npx vitest run src/test/auth/ResetPasswordScreen.test.jsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/auth/ResetPasswordScreen.jsx src/test/auth/ResetPasswordScreen.test.jsx
git commit -m "feat(auth): ResetPasswordScreen com validação de senha"
```

---

### Task 8: Barrel export `src/auth/index.js`

**Files:**
- Create: `src/auth/index.js`

- [ ] **Step 1: Criar o barrel**

Conteúdo de `src/auth/index.js`:
```js
export { AuthProvider, useAuth } from './AuthProvider'
export { LoginScreen } from './LoginScreen'
export { ResetPasswordScreen } from './ResetPasswordScreen'
```

- [ ] **Step 2: Commit**

```bash
git add src/auth/index.js
git commit -m "chore(auth): barrel export"
```

---

### Task 9: Gating em `App.jsx` + botão Sair temporário

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/CharacterList/CharacterList.jsx`
- Test: `src/test/auth/App.gating.test.jsx`

- [ ] **Step 1: Escrever o teste de gating**

Criar `src/test/auth/App.gating.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock pesado: substituir o AuthProvider real por um stub controlável.
let mockAuth = { user: null, loading: true, recoveryMode: false, signOut: vi.fn() }

vi.mock('../../auth/AuthProvider', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => mockAuth,
}))

// Stubs leves dos componentes pesados que não interessam aqui.
vi.mock('../../providers/SrdProvider', () => ({ SrdProvider: ({ children }) => children }))
vi.mock('../../context/DiceRollerContext', () => ({ DiceRollerProvider: ({ children }) => children }))
vi.mock('../../components/DiceRoller/DiceHistoryPanel', () => ({ DiceHistoryPanel: () => null }))
vi.mock('../../components/Bestiary/BestiaryButton', () => ({ BestiaryButton: () => null }))
vi.mock('../../components/PWAUpdatePrompt', () => ({ PWAUpdatePrompt: () => null }))
vi.mock('../../components/CharacterList', () => ({ CharacterList: () => <div>CHAR_LIST</div> }))
vi.mock('../../auth/LoginScreen', () => ({ LoginScreen: () => <div>LOGIN_SCREEN</div> }))
vi.mock('../../auth/ResetPasswordScreen', () => ({ ResetPasswordScreen: () => <div>RESET_SCREEN</div> }))

import App from '../../App'

describe('App gating', () => {
  it('mostra Loader quando loading', () => {
    mockAuth = { user: null, loading: true, recoveryMode: false, signOut: vi.fn() }
    render(<App />)
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('mostra LoginScreen quando sem user', () => {
    mockAuth = { user: null, loading: false, recoveryMode: false, signOut: vi.fn() }
    render(<App />)
    expect(screen.getByText('LOGIN_SCREEN')).toBeInTheDocument()
  })

  it('mostra ResetPasswordScreen em recoveryMode', () => {
    mockAuth = { user: { id: 'u' }, loading: false, recoveryMode: true, signOut: vi.fn() }
    render(<App />)
    expect(screen.getByText('RESET_SCREEN')).toBeInTheDocument()
  })

  it('mostra CharacterList quando autenticado', () => {
    mockAuth = { user: { id: 'u' }, loading: false, recoveryMode: false, signOut: vi.fn() }
    render(<App />)
    expect(screen.getByText('CHAR_LIST')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste — deve falhar**

Run: `npx vitest run src/test/auth/App.gating.test.jsx`
Expected: FAIL (App.jsx ainda não faz gating).

- [ ] **Step 3: Modificar `src/App.jsx`**

Substituir o conteúdo de `src/App.jsx`:
```jsx
import { useCallback, useState, lazy, Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { SrdProvider } from './providers/SrdProvider'
import { DiceRollerProvider } from './context/DiceRollerContext'
import { DiceHistoryPanel } from './components/DiceRoller/DiceHistoryPanel'
import { BestiaryButton } from './components/Bestiary/BestiaryButton'
import { CharacterList } from './components/CharacterList'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LoginScreen } from './auth/LoginScreen'
import { ResetPasswordScreen } from './auth/ResetPasswordScreen'
import './index.css'

const CharacterSheet = lazy(() =>
  import('./components/CharacterSheet/CharacterSheet').then(m => ({ default: m.CharacterSheet }))
)
const CharacterWizard = lazy(() =>
  import('./components/CharacterWizardV2').then(m => ({ default: m.CharacterWizardV2 }))
)

const VIEW = { LIST: 'list', NEW: 'new', SHEET: 'sheet' }

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-amber-400 text-sm">
      Carregando…
    </div>
  )
}

function AuthedApp() {
  const [view, setView] = useState({ kind: VIEW.LIST, id: null })
  const goToList  = useCallback(() => setView({ kind: VIEW.LIST,  id: null }), [])
  const goToNew   = useCallback(() => setView({ kind: VIEW.NEW,   id: null }), [])
  const goToSheet = useCallback(id =>  setView({ kind: VIEW.SHEET, id }),        [])

  return (
    <SrdProvider>
      <DiceRollerProvider>
        <div className="min-h-screen bg-gray-950 text-gray-100">
          <Suspense fallback={<Loader />}>
            {view.kind === VIEW.LIST && (
              <CharacterList onSelect={goToSheet} onCreate={goToNew} />
            )}
            {view.kind === VIEW.NEW && (
              <CharacterWizard onBack={goToList} onComplete={goToSheet} />
            )}
            {view.kind === VIEW.SHEET && (
              <CharacterSheet characterId={view.id} onBack={goToList} />
            )}
          </Suspense>
          <DiceHistoryPanel />
          <BestiaryButton />
          <PWAUpdatePrompt />
        </div>
      </DiceRollerProvider>
    </SrdProvider>
  )
}

function Gate() {
  const { user, loading, recoveryMode } = useAuth()
  if (loading) return <Loader />
  if (recoveryMode) return <ResetPasswordScreen />
  if (!user) return <LoginScreen />
  return <AuthedApp />
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
```

- [ ] **Step 4: Adicionar botão Sair temporário em `CharacterList.jsx`**

Em `src/components/CharacterList/CharacterList.jsx`:

Adicionar import no topo (junto aos outros):
```jsx
import { useAuth } from '../../auth/AuthProvider'
```

Dentro do componente `CharacterList`, logo no início (antes do `return`):
```jsx
const { signOut } = useAuth()
```

No header, dentro da `<div className="flex items-center gap-2">` que já contém `BackupMenu` e o botão Recrutar, **adicionar antes do BackupMenu**:
```jsx
<Button variant="ghost-dark" size="sm" onClick={() => signOut()}>
  Sair
</Button>
```

- [ ] **Step 5: Rodar teste de gating — deve passar**

Run: `npx vitest run src/test/auth/App.gating.test.jsx`
Expected: PASS (4 testes).

- [ ] **Step 6: Rodar suite inteira — sem regressão**

Run: `npm test`
Expected: todos os testes passam (incluindo os existentes de `CharacterList`, `storage`, etc).

> Se algum teste de `CharacterList` falhar por causa do `useAuth` adicionado, envolver o render do teste em `<AuthProvider>` ou mockar `useAuth` no setup do teste (mesma estratégia usada acima — `vi.mock('../../auth/AuthProvider', ...)`).

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/components/CharacterList/CharacterList.jsx src/test/auth/App.gating.test.jsx
git commit -m "feat(auth): gating em App.jsx + botão Sair em CharacterList"
```

---

### Task 10: Smoke manual end-to-end e atualização do CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Smoke manual local**

Pré-requisitos: passos 1-3 da Task 2 (setup manual no dashboard Supabase) completos e `.env.local` preenchido.

Rodar `npm run dev` e verificar manualmente:

1. Tela inicial mostra `LoginScreen`.
2. Clicar em "Criar conta", preencher email + senha (≥ 8 chars), submeter. Aparece mensagem "Confirme seu email para ativar a conta".
3. Conferir email recebido, clicar no link de confirmação.
4. Voltar ao app, fazer login com as credenciais. App entra mostrando `CharacterList`.
5. Clicar "Sair" — volta pra `LoginScreen`.
6. Clicar "Esqueci a senha", digitar email, submeter. Aparece "Enviamos um link…".
7. Conferir email, clicar no link de recovery. App entra em `ResetPasswordScreen`. Digitar nova senha (≥ 8 chars, igual nas duas), salvar. Volta pra app autenticado.
8. Fazer logout e login com nova senha. OK.
9. No painel Supabase, **Authentication → Users**, conferir que o usuário existe.
10. **Table Editor → public.profiles**, conferir 1 linha (criada pela trigger).

Anotar qualquer falha — não fechar a task até todos os 10 itens passarem.

- [ ] **Step 2: Atualizar `CHANGELOG.md`**

Adicionar no topo (abaixo do cabeçalho do CHANGELOG, antes da entrada mais recente):
```markdown
## [Unreleased]

### Adicionado
- Autenticação Supabase (email/senha). App passa a exigir login antes de mostrar a lista de fichas. Google OAuth fica pra PR futuro.
- Fluxo de "esqueci a senha" e tela de definição de nova senha após link de recovery.
- Tabela `profiles` no Supabase com trigger automático a partir de `auth.users`.

### Notas
- Fichas continuam armazenadas em `localStorage` neste release. A migração para Postgres ocorre no próximo PR.
- Setup manual obrigatório: ver `docs/supabase-setup.md`.
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): PR 1 — auth Supabase com gating"
```

- [ ] **Step 4: Push**

```bash
git push
```

---

## Critério de aceite do PR

- [ ] `npm test` passa sem warnings novos.
- [ ] `npm run lint` passa.
- [ ] `npm run build` passa.
- [ ] Smoke manual da Task 10 — 10 itens — completo.
- [ ] Sem chamadas a `localStorage` adicionadas em código novo (busca: `grep -r "localStorage" src/auth src/lib/supabase.js` deve retornar vazio).
- [ ] `.env.local` não está commitado (`git status --ignored` deve listar como ignorado).

## Fora do escopo deste PR (vai pra PR 2+)

- Migrar `storage.js` pra Supabase.
- Tabelas `campaigns`, `campaign_members`, `characters`.
- AccountMenu completo (Minha conta, Apagar conta).
- CSP no `vercel.json`.
- Rodapé LGPD.
- Realtime.
- E2E (Playwright) cobrindo auth — fica pra integrar quando tudo estiver mais estável.
