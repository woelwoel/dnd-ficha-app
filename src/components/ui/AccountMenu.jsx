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
          className="w-9 h-9 rounded-full bg-ink-500 text-parchment-50 text-sm font-bold font-display flex items-center justify-center hover:bg-ink-600 transition shadow-[var(--shadow-parchment-sm)]"
          aria-label="Menu da conta"
          aria-expanded={open}
        >
          {getInitials(user?.email)}
        </button>
        {open && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-sm border-2 border-parchment-600 bg-parchment-50 shadow-parchment-lg z-40 overflow-hidden"
            role="menu"
          >
            <div
              className="px-3 py-2 text-xs ink-italic text-ink-300 border-b border-parchment-600 truncate bg-parchment-100"
              title={user?.email}
            >
              {user?.email}
            </div>
            <button
              onClick={() => { setOpen(false); signOut() }}
              className="w-full text-left px-3 py-2 text-sm text-ink-500 hover:bg-parchment-200 font-display tracking-wide"
              role="menuitem"
            >
              Sair
            </button>
            <button
              onClick={() => { setOpen(false); setShowDelete(true) }}
              className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 border-t border-parchment-600 font-display tracking-wide"
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
