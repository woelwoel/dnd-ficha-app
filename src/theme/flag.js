/**
 * Tema global v2 (identidade escura da ficha aplicada ao site inteiro).
 * `?theme=parchment` é o escape hatch — desliga e persiste o opt-out;
 * `?theme=v2` religa e limpa. Sem query, ligado a menos que haja opt-out.
 * Espelho do isSheetV2Enabled. Removido no corte definitivo, após a
 * observação do dono em sessões reais.
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
