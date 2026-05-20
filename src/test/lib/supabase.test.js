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
