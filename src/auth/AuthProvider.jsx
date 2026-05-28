import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { deleteMyAccount } from '../lib/campaigns'

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

  // Chama a RPC delete_my_account (cascade limpa profiles/characters/membros/
  // campanhas onde sou DM) e depois signOut. A linha em auth.users permanece —
  // apagar de vez exige admin API (fora deste PR).
  const deleteAccount = useCallback(async () => {
    const r = await deleteMyAccount()
    if (!r.ok) return { ok: false, reason: r.reason }
    await supabase.auth.signOut()
    return { ok: true }
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
