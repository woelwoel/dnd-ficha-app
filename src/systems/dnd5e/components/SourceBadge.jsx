import { SOURCES } from '../domain/sources'

/** Selo curto de procedência. Não renderiza nada pra 'phb' (básico) nem fonte
 *  desconhecida. Usa title pra acessibilidade (nome longo). */
export function SourceBadge({ source }) {
  const meta = SOURCES[source]
  if (!meta || source === 'phb') return null
  return (
    <span
      className="source-badge"
      title={meta.label}
      style={{ fontSize: '0.7em', padding: '0 4px', borderRadius: 4, border: '1px solid currentColor', opacity: 0.7 }}
    >
      {meta.abbr}
    </span>
  )
}
