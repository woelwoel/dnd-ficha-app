import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { deleteMyAccount } from '../lib/campaigns'

// Endpoint da serverless function que apaga auth.users via admin API.
// Em dev (Vite) a chamada vai falhar — desenvolvedor precisa rodar
// `vercel dev` ou só validar visualmente até deploy.
const DELETE_ACCOUNT_ENDPOINT = '/api/delete-account'

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

  // Apaga a conta de verdade:
  //   1) Chama /api/delete-account (Vercel function com service_role) que
  //      faz admin.deleteUser(uid). FK cascade limpa profiles/characters/
  //      membros/campanhas-onde-sou-DM em uma única operação.
  //   2) Se a função falhar (ex: env var ausente em dev), faz fallback pra
  //      RPC delete_my_account — apaga só o profile + cascade public; deixa
  //      auth.users órfão. Pior pior, signOut leva o user pra tela de login
  //      sem dados visíveis.
  //   3) signOut sempre, independente do caminho.
  const deleteAccount = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    let hardDeleted = false
    if (token) {
      try {
        const resp = await fetch(DELETE_ACCOUNT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ confirm: 'APAGAR' }),
        })
        hardDeleted = resp.ok
      } catch { /* network/dev — cai no fallback */ }
    }
    if (!hardDeleted) {
      const r = await deleteMyAccount()
      if (!r.ok) return { ok: false, reason: r.reason }
    }
    await supabase.auth.signOut()
    return { ok: true, hardDeleted }
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
    deleteAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
