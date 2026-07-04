/**
 * Soft cut do redesign da ficha (fase 5, etapa A): o v2 é o layout PADRÃO.
 * `?sheetV2=0` é o escape hatch — desliga e persiste o opt-out; `?sheetV2=1`
 * religa e limpa o opt-out. Sem query, o v2 fica ligado a menos que o usuário
 * tenha optado por sair. A chave de storage é `sheetV2Off` (o estado persistido
 * agora é o opt-OUT), então quem tinha opt-IN antigo cai no novo default ligado.
 * Removido de vez no corte final (etapa B).
 */
export function isSheetV2Enabled(
  search = typeof window !== 'undefined' ? window.location.search : '',
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  const q = new URLSearchParams(search).get('sheetV2')
  if (q === '1') { storage?.removeItem('sheetV2Off'); return true }
  if (q === '0') { storage?.setItem('sheetV2Off', '1'); return false }
  return storage?.getItem('sheetV2Off') !== '1'
}
