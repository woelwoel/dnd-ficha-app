/**
 * Redimensiona/comprime uma imagem (File) para um data URL pequeno, usado no
 * retrato do personagem. Sem isso, a foto original (vários MB de um celular)
 * era guardada em base64 dentro do JSON da ficha e reenviada em TODO autosave
 * e no realtime. Um avatar de 256px em webp fica em ~10-20 KB.
 *
 * Puro do ponto de vista de rede (só usa Canvas do browser). Retorna o data
 * URL menor entre webp e jpeg (nem todo browser exporta webp).
 */

const DEFAULT_MAX = 256 // px no maior lado (avatar circular)
const DEFAULT_QUALITY = 0.82

/** Calcula as dimensões destino preservando proporção, limitadas a `max`. */
export function fitWithin(width, height, max = DEFAULT_MAX) {
  if (width <= max && height <= max) return { width, height }
  const scale = max / Math.max(width, height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * @param {File|Blob} file
 * @param {{ max?: number, quality?: number }} [opts]
 * @returns {Promise<string>} data URL redimensionado
 */
export function resizeImageToDataUrl(file, opts = {}) {
  const max = opts.max ?? DEFAULT_MAX
  const quality = opts.quality ?? DEFAULT_QUALITY

  return new Promise((resolve, reject) => {
    // Lê como data: URL (não blob:) — a CSP do app é `img-src 'self' data:`,
    // e NÃO permite blob:, então carregar a imagem via createObjectURL falharia
    // (caindo no fallback e guardando o original inteiro). data: passa.
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('falha ao ler arquivo'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, max)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('canvas 2d indisponível')); return }
        ctx.drawImage(img, 0, 0, width, height)

        const webp = canvas.toDataURL('image/webp', quality)
        const jpeg = canvas.toDataURL('image/jpeg', quality)
        // Alguns browsers ignoram webp e devolvem png (maior); pega o menor
        // que de fato comprimiu.
        const candidates = [webp, jpeg].filter(u => u && u.length > 'data:image/x;base64,'.length)
        const best = candidates.sort((a, b) => a.length - b.length)[0] ?? jpeg
        resolve(best)
      }
      img.onerror = () => reject(new Error('falha ao decodificar imagem'))
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
