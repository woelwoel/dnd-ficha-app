import { Link } from 'react-router-dom'

/**
 * Rodapé com aviso mínimo de armazenamento (LGPD) e contato.
 * Discreto, fixo no fim do conteúdo.
 */
export function AppFooter() {
  return (
    <footer
      className="text-center text-xs py-3 px-4 opacity-60"
      style={{ color: 'var(--color-ink-200, #b5a583)' }}
    >
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
    </footer>
  )
}
