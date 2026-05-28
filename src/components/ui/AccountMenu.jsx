import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { DeleteAccountModal } from './DeleteAccountModal'

function getInitials(email) {
  if (!email) return '?'
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

/**
 * Avatar circular + dropdown. Substitui o botão "Sair" solto no header e
 * centraliza Apagar Conta sob confirmação de modal.
 */
export function AccountMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-9 h-9 rounded-full bg-amber-900 text-amber-200 text-sm font-bold flex items-center justify-center hover:bg-amber-800 transition"
          aria-label="Menu da conta"
          aria-expanded={open}
        >
          {getInitials(user?.email)}
        </button>
        {open && (
          <div
            className="absolute right-0 mt-2 w-56 rounded border shadow-lg z-40"
            style={{ background: 'var(--color-shell-800)', borderColor: 'var(--color-shell-border)' }}
            role="menu"
          >
            <div
              className="px-3 py-2 text-xs text-gray-400 border-b truncate"
              style={{ borderColor: 'var(--color-shell-border)' }}
              title={user?.email}
            >
              {user?.email}
            </div>
            <button
              onClick={() => { setOpen(false); signOut() }}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
              role="menuitem"
            >
              Sair
            </button>
            <button
              onClick={() => { setOpen(false); setShowDelete(true) }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 border-t"
              style={{ borderColor: 'var(--color-shell-border)' }}
              role="menuitem"
            >
              Apagar conta
            </button>
          </div>
        )}
      </div>
      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}
    </>
  )
}
