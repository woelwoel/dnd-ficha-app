import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

/**
 * Rodapé com aviso mínimo de armazenamento (LGPD), contato e toggle de tema.
 * Discreto, fixo no fim do conteúdo.
 */
export function AppFooter() {
  const { theme, toggle } = useTheme()
  return (
    <footer className="text-center text-xs py-3 px-4 opacity-60 text-ink-200">
      Seus dados ficam armazenados no Supabase em conta vinculada ao seu email.{' '}
      <Link to="/privacidade" className="underline hover:opacity-100">
        Privacidade
      </Link>
      {' · '}
      <a
        href="mailto:gvfaria.gv@gmail.com"
        className="underline hover:opacity-100"
      >
        Contato
      </a>
      {' · '}
      <button
        type="button"
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        className="inline-flex items-center gap-1 underline hover:opacity-100 align-middle"
      >
        {theme === 'dark'
          ? <><Sun size={12} aria-hidden /> Tema claro</>
          : <><Moon size={12} aria-hidden /> Tema escuro</>}
      </button>
    </footer>
  )
}
