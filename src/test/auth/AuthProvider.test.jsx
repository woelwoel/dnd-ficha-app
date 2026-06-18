import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock do client Supabase — usar vi.hoisted para que a factory do vi.mock possa acessar
const { authState, supabaseMock } = vi.hoisted(() => {
  const authState = {
    session: null,
    listeners: new Set(),
    isAdmin: false,
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
    // AuthProvider chama ensureMyProfile() (supabase.rpc) ao autenticar.
    rpc: vi.fn(async () => ({ data: null, error: null })),
    from: vi.fn((table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => table === 'profiles'
            ? ({ data: { is_admin: authState.isAdmin }, error: null })
            : ({ data: null, error: null }),
        }),
      }),
    })),
  }

  return { authState, supabaseMock }
})

vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { AuthProvider, useAuth } from '../../auth/AuthProvider'

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="loading">{auth.loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{auth.user ? auth.user.email : 'none'}</span>
      <span data-testid="recovery">{auth.recoveryMode ? 'recovery' : 'normal'}</span>
      <span data-testid="admin">{auth.isAdmin ? 'admin' : 'normal'}</span>
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
    authState.isAdmin = false
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

  it('expõe isAdmin lido do profile quando sessão existe', async () => {
    authState.isAdmin = true
    authState.session = { user: { id: 'u1', email: 'a@b.com' } }
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('admin').textContent).toBe('admin'))
  })

  it('isAdmin é false sem sessão', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
    expect(screen.getByTestId('admin').textContent).toBe('normal')
  })

  it('signOut delega ao cliente', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
    await userEvent.click(screen.getByText('signout'))
    expect(supabaseMock.auth.signOut).toHaveBeenCalled()
  })
})
