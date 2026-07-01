import { roleStyle, ROLE_DEFINITIONS } from './class-roles'

/**
 * Corpo do modal "Sobre a Classe": pílulas de papel (visão rápida), legenda
 * sempre visível explicando cada papel (linguagem de novato), resumo e lore
 * completa. Sem estado — recebe o objeto de classe já resolvido.
 */
export function ClassInfoContent({ classData }) {
  if (!classData) return null
  const roles = Array.isArray(classData.roles) ? classData.roles : []

  return (
    <div className="flex flex-col gap-4">
      {roles.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {roles.map(r => (
              <span
                key={r}
                className={[
                  'px-2 py-0.5 rounded-full border-2 text-[11px] font-display tracking-wide uppercase',
                  roleStyle(r),
                ].join(' ')}
              >
                {r}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2.5">
            <p className="text-[11px] font-display tracking-widest uppercase text-ink-300">
              O que cada foco significa
            </p>
            {roles.map(r => (
              <div key={r} className="flex items-start gap-2">
                <span
                  className={[
                    'shrink-0 px-1.5 py-0.5 rounded-full border-2 text-[10px] font-display tracking-wide uppercase',
                    roleStyle(r),
                  ].join(' ')}
                >
                  {r}
                </span>
                <span className="text-xs text-ink-500 leading-relaxed">
                  {ROLE_DEFINITIONS[r] ?? ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {classData.summary && (
        <p className="text-sm text-ink-500 font-semibold leading-relaxed">
          {classData.summary}
        </p>
      )}

      {classData.fullDescription && (
        <p className="text-sm text-ink-500 leading-relaxed whitespace-pre-line">
          {classData.fullDescription}
        </p>
      )}
    </div>
  )
}
