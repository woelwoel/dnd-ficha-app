/**
 * Tema global v2 (identidade escura da ficha aplicada ao site inteiro).
 * `?theme=parchment` é o escape hatch — desliga e persiste o opt-out;
 * `?theme=v2` religa e limpa. Sem query, ligado a menos que haja opt-out.
 * Era espelho do flag da ficha v2 — que já foi cortado junto com o layout v1.
 * Este aqui sobrevive porque o tema claro ainda é um escape hatch válido.
 */
export function isThemeV2Enabled(
  search = typeof window !== 'undefined' ? window.location.search : '',
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  const q = new URLSearchParams(search).get('theme')
  if (q === 'v2') { storage?.removeItem('themeParchment'); return true }
  if (q === 'parchment') { storage?.setItem('themeParchment', '1'); return false }
  return storage?.getItem('themeParchment') !== '1'
}
