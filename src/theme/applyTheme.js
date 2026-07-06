import { isThemeV2Enabled } from './flag'

/**
 * Aplica (ou não) o tema global v2 no <html>. Chamado no main.jsx ANTES do
 * primeiro render — evita flash de parchment. A meta theme-color (PWA) vira
 * o surface-0 escuro; sob opt-out, quem cuida dela é o useTheme (parchment).
 */
export function applyThemeV2() {
  const on = isThemeV2Enabled()
  document.documentElement.classList.toggle('theme-v2', on)
  if (on) {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = '#0f141a'
  }
  return on
}
