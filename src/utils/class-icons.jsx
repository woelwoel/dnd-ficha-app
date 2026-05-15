/**
 * Silhuetas SVG por classe de personagem para uso em tokens, chips e
 * avatares. Cada path foi desenhado em um viewBox 32x32 e usa
 * `currentColor` pra herdar cor do contexto.
 */

const PATHS = {
  guerreiro: (
    <>
      <path d="M16 3 L16 28 M11 8 L21 8 M8 13 L24 13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <circle cx="16" cy="4" r="2" fill="currentColor"/>
    </>
  ),
  mago: (
    <>
      <path d="M16 4 L9 22 L23 22 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor"/>
      <path d="M16 22 L16 28 M11 28 L21 28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M16 11 L17 14 L20 14 L17.5 16 L18.5 19 L16 17 L13.5 19 L14.5 16 L12 14 L15 14 Z" fill="#fcf3da"/>
    </>
  ),
  clerigo: (
    <>
      <path d="M16 4 L16 28 M8 12 L24 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="16" cy="12" r="3" fill="currentColor"/>
    </>
  ),
  ladino: (
    <>
      <path d="M8 6 L24 26 M24 6 L8 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="8" cy="6" r="2" fill="currentColor"/>
      <circle cx="24" cy="6" r="2" fill="currentColor"/>
    </>
  ),
  barbaro: (
    <>
      <path d="M16 4 L16 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M8 12 Q12 8 16 12 Q20 8 24 12 L24 18 Q20 14 16 18 Q12 14 8 18 Z" fill="currentColor"/>
    </>
  ),
  bardo: (
    <>
      <path d="M10 6 L22 6 L20 26 L12 26 Z M14 8 L14 24 M18 8 L18 24" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <circle cx="16" cy="6" r="2" fill="currentColor"/>
    </>
  ),
  druida: (
    <>
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M16 9 Q12 13 13 18 Q14 22 16 23 Q18 22 19 18 Q20 13 16 9 Z M16 13 L16 23" fill="currentColor"/>
    </>
  ),
  patrulheiro: (
    <>
      <path d="M8 8 Q16 4 24 8 Q24 16 24 24" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M10 24 L24 10 M19 10 L24 10 L24 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </>
  ),
  paladino: (
    <>
      <path d="M16 3 L16 28 M11 8 L21 8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M11 6 Q6 9 8 14 L11 12 Z M21 6 Q26 9 24 14 L21 12 Z" fill="currentColor"/>
    </>
  ),
  feiticeiro: (
    <>
      <ellipse cx="16" cy="16" rx="11" ry="7" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="16" cy="16" r="3.5" fill="currentColor"/>
      <path d="M16 5 Q14 8 16 11 Q18 8 16 5 M16 27 Q14 24 16 21 Q18 24 16 27" fill="currentColor"/>
    </>
  ),
  bruxo: (
    <>
      <circle cx="16" cy="14" r="9" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
      <circle cx="12.5" cy="13" r="1.8" fill="#fcf3da"/>
      <circle cx="19.5" cy="13" r="1.8" fill="#fcf3da"/>
      <path d="M12 20 L20 20 M13 22 L19 22" stroke="#fcf3da" strokeWidth="1" fill="none"/>
    </>
  ),
  monge: (
    <>
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M16 8 Q12 12 12 16 Q12 20 16 24 Q20 20 20 16 Q20 12 16 8 Z" fill="currentColor"/>
      <circle cx="13" cy="14" r="1.2" fill="#fcf3da"/>
      <circle cx="19" cy="18" r="1.2" fill="#fcf3da"/>
    </>
  ),
  fallback: (
    <>
      <path d="M16 4 L18 13 L27 13 L20 18 L23 27 L16 22 L9 27 L12 18 L5 13 L14 13 Z" fill="currentColor"/>
    </>
  ),
}

export const CLASS_KEYS = Object.keys(PATHS)

const CLASS_TO_KEY = [
  ['guerreir', 'guerreiro'],
  ['mago', 'mago'],
  ['clerig', 'clerigo'],
  ['ladin', 'ladino'],
  ['barbar', 'barbaro'],
  ['bardo', 'bardo'],
  ['druid', 'druida'],
  ['patrulheir', 'patrulheiro'],
  ['ranger', 'patrulheiro'],
  ['paladin', 'paladino'],
  ['feiticeir', 'feiticeiro'],
  ['sorcerer', 'feiticeiro'],
  ['bruxo', 'bruxo'],
  ['warlock', 'bruxo'],
  ['monge', 'monge'],
  ['monk', 'monge'],
]

function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function getClassIconKey(classNameRaw) {
  if (classNameRaw == null) return 'fallback'
  const lower = normalize(classNameRaw)
  if (!lower.trim()) return 'fallback'
  for (const [needle, key] of CLASS_TO_KEY) {
    if (lower.includes(needle)) return key
  }
  return 'fallback'
}

export function ClassIcon({ classKey, size = 32, color, ...rest }) {
  const key = PATHS[classKey] ? classKey : getClassIconKey(classKey)
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      color={color}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[key]}
    </svg>
  )
}
