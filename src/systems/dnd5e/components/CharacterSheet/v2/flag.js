/**
 * Toggle temporário do redesign da ficha (spec 2026-07-03).
 * ?sheetV2=1 liga e persiste; ?sheetV2=0 desliga e limpa; sem query, lê o storage.
 * Removido no corte final (plano da fase 5).
 */
export function isSheetV2Enabled(
  search = typeof window !== 'undefined' ? window.location.search : '',
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  const q = new URLSearchParams(search).get('sheetV2')
  if (q === '1') { storage?.setItem('sheetV2', '1'); return true }
  if (q === '0') { storage?.removeItem('sheetV2'); return false }
  return storage?.getItem('sheetV2') === '1'
}
