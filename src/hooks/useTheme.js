import { useCallback, useEffect, useState } from 'react'

/**
 * Tema claro/escuro do app. Três estados: preferência explícita
 * ('light'|'dark' no localStorage) ou auto (ausente → segue o SO via
 * prefers-color-scheme). Aplica `data-theme` no <html> — o index.css
 * re-tematiza tudo em cascata — e sincroniza a meta theme-color (PWA).
 */
const KEY = 'dnd-ficha:theme'

// Mesmo valor do index.html; o dark usa o tom base do "couro escuro".
const META_COLOR = { light: '#3b2a1a', dark: '#201812' }

const systemPrefersDark = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

const resolve = (pref) => pref ?? (systemPrefersDark() ? 'dark' : 'light')

function apply(theme) {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = META_COLOR[theme] ?? META_COLOR.light
}

export function useTheme() {
  const [pref, setPref] = useState(() => localStorage.getItem(KEY))
  const theme = resolve(pref)

  useEffect(() => { apply(theme) }, [theme])

  // No modo auto, acompanha mudanças do SO em tempo real.
  useEffect(() => {
    if (pref) return undefined
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return undefined
    const onChange = () => apply(resolve(null))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const toggle = useCallback(() => {
    // Ciclo simples claro↔escuro (auto vira explícito no primeiro toque).
    const next = resolve(pref) === 'dark' ? 'light' : 'dark'
    localStorage.setItem(KEY, next)
    setPref(next)
  }, [pref])

  return { theme, toggle }
}
