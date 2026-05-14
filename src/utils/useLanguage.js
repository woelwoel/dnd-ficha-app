import { useCallback, useEffect, useState } from 'react'

/* ─────────────────────────────────────────────────────────────────────
   useLanguage — preferência de idioma para datasets SRD.

   - Persiste em localStorage (chave 'dnd-ficha:lang')
   - Padrão: 'en' (conteúdo original)
   - Valores válidos: 'en' | 'pt'
   - Sincroniza entre abas via storage event
   ────────────────────────────────────────────────────────────────────*/

const STORAGE_KEY = 'dnd-ficha:lang'
const VALID = new Set(['en', 'pt'])
const DEFAULT_LANG = 'en'

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return VALID.has(v) ? v : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

export function useLanguage() {
  const [lang, setLangState] = useState(readStored)

  // Sincroniza entre abas / outros componentes
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== STORAGE_KEY) return
      const v = VALID.has(e.newValue) ? e.newValue : DEFAULT_LANG
      setLangState(v)
    }
    window.addEventListener('storage', onStorage)
    // Evento custom para mesma aba (storage só dispara em outras abas)
    function onLocal(e) {
      const v = VALID.has(e.detail) ? e.detail : DEFAULT_LANG
      setLangState(v)
    }
    window.addEventListener('dnd-ficha:lang-change', onLocal)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('dnd-ficha:lang-change', onLocal)
    }
  }, [])

  const setLang = useCallback((next) => {
    const v = VALID.has(next) ? next : DEFAULT_LANG
    try { localStorage.setItem(STORAGE_KEY, v) } catch { /* ignore */ }
    setLangState(v)
    // Notifica outros consumidores na mesma aba
    window.dispatchEvent(new CustomEvent('dnd-ficha:lang-change', { detail: v }))
  }, [])

  const toggle = useCallback(() => {
    setLang(lang === 'pt' ? 'en' : 'pt')
  }, [lang, setLang])

  return { lang, setLang, toggle }
}
