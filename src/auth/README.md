# Auth — padrão de uso

## Como pegar o usuário corrente

**Dentro de componentes React** → sempre use o hook:

```jsx
import { useAuth } from '../../auth'

function MyComponent() {
  const { user, loading } = useAuth()
  if (!user) return null
  // ...
}
```

`useAuth()` lê do `AuthProvider`, que assina `onAuthStateChange` uma única vez
no boot da app. É síncrono em todas as renders depois do primeiro frame, não
faz round-trip à API, e mantém todos os consumidores sincronizados.

**Em módulos fora de React** (storage, campaigns, lib utilitárias) → vá direto
no client Supabase:

```js
import { supabase } from '../lib/supabase'

export async function meuHelper() {
  const { data: { user } } = await supabase.auth.getUser()
  // ...
}
```

## Regra

- ❌ Não use `supabase.auth.getUser()` dentro de componente React — duplica
  trabalho do `AuthProvider`, adiciona latência e abre janela pra estado
  inconsistente entre componentes.
- ❌ Não use o hook `useAuth()` em arquivos `.js` fora da árvore React.
- ✅ Componente → `useAuth()`. Módulo → `supabase.auth.getUser()`.

## API do AuthProvider

```ts
const {
  user,                   // User | null
  loading,                // boolean — true durante boot
  signIn({ email, password }),
  signUp({ email, password }),
  signOut(),
  requestPasswordReset(email),
  updatePassword(newPassword),
  deleteAccount(),
} = useAuth()
```

## Sessão e expiração

Supabase renova o JWT automaticamente em background. Se `onAuthStateChange`
emite `SIGNED_OUT` (ex: refresh token expirou), o `<Gate />` desmonta a app
e mostra `LoginScreen` — não precisa de check manual em cada rota.
