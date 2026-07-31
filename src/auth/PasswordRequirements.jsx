import { Icon } from '../components/ui/Icon'
import { PASSWORD_RULES, passwordChecks } from './passwordPolicy'

/* Checklist ao vivo dos requisitos de senha. Cada item acende quando a senha
 * digitada cumpre a regra — o usuário vê o que falta antes de submeter, em vez
 * de levar um erro cru do servidor depois. */
export function PasswordRequirements({ password, id }) {
  const checks = passwordChecks(password)

  return (
    <ul id={id} className="mt-2 space-y-0.5">
      {PASSWORD_RULES.map(rule => {
        const ok = checks[rule.key]
        return (
          <li
            key={rule.key}
            className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-700' : 'text-ink-300'}`}
          >
            <span aria-hidden className="inline-flex w-3.5 justify-center">
              {ok ? <Icon name="check" size={12} strokeWidth={3} /> : '•'}
            </span>
            <span>{rule.label}</span>
            <span className="sr-only">{ok ? '(ok)' : '(falta)'}</span>
          </li>
        )
      })}
    </ul>
  )
}
