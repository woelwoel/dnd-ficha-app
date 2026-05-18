/* eslint-disable react-refresh/only-export-components */
/**
 * Silhuetas SVG por classe de personagem para uso em tokens, chips e
 * avatares. Cada path foi desenhado em um viewBox 32x32 e usa
 * `currentColor` pra herdar cor do contexto.
 *
 * Inspirado na linguagem visual de ícones de D&D: pictogramas
 * minimalistas com 1 elemento dominante por classe (sword, eye, paw,
 * lyre, etc.).
 *
 * Este módulo intencionalmente exporta um componente (`ClassIcon`) +
 * helpers (`getClassIconKey`, `CLASS_KEYS`) juntos pra manter a API
 * coesa. Split desabilita HMR fast-refresh — aceitável aqui.
 */

const PATHS = {
  /* Paladin — elmo com chifres + visor de fendas */
  paladino: (
    <>
      {/* Chifres curvando para fora */}
      <path d="M9,8 Q5,5 7,2 Q9,5 11,8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <path d="M23,8 Q27,5 25,2 Q23,5 21,8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      {/* Domo do elmo */}
      <path d="M8,14 Q8,7 16,6 Q24,7 24,14 L24,22 Q24,26 16,28 Q8,26 8,22 Z" fill="currentColor"/>
      {/* Fendas do visor */}
      <path d="M12,16 L12,21 M16,16 L16,22 M20,16 L20,21" stroke="#fcf3da" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
    </>
  ),

  /* Guerreiro — duas espadas cruzadas + ponto central */
  guerreiro: (
    <>
      {/* Espada 1 (NW → SE) */}
      <circle cx="7" cy="7" r="1.8" fill="currentColor"/>
      <path d="M5,11 L11,5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9,9 L23,23" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      {/* Espada 2 (NE → SW) */}
      <circle cx="25" cy="7" r="1.8" fill="currentColor"/>
      <path d="M27,11 L21,5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M23,9 L9,23" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      {/* Ponto central (rebite) */}
      <circle cx="16" cy="16" r="1.6" fill="currentColor"/>
    </>
  ),

  /* Bruxo — olho com raios pulsantes */
  bruxo: (
    <>
      {/* Contorno do olho */}
      <path d="M4,16 Q16,9 28,16 Q16,23 4,16 Z" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      {/* Íris */}
      <circle cx="16" cy="16" r="3.2" fill="currentColor"/>
      {/* Brilho */}
      <circle cx="14.5" cy="14.5" r="0.9" fill="#fcf3da"/>
      {/* Raios cardeais */}
      <path d="M16,3 L16,7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M16,25 L16,29" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M3,16 L7,16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M25,16 L29,16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      {/* Raios diagonais */}
      <path d="M7,7 L9.8,9.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M22.2,22.2 L25,25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M22.2,9.8 L25,7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9.8,22.2 L7,25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </>
  ),

  /* Bárbaro — machado de duas cabeças */
  barbaro: (
    <>
      {/* Cabo */}
      <path d="M16,7 L16,28" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      {/* Cabeça esquerda */}
      <path d="M16,8 Q9,7 4,11 Q5,13 11,13 Q14,12 16,11 Z" fill="currentColor"/>
      {/* Cabeça direita */}
      <path d="M16,8 Q23,7 28,11 Q27,13 21,13 Q18,12 16,11 Z" fill="currentColor"/>
      {/* Encaixe central no cabo */}
      <path d="M14,9 L18,9 L18,13 L14,13 Z" fill="currentColor"/>
      {/* Pomo inferior */}
      <circle cx="16" cy="28" r="1.4" fill="currentColor"/>
    </>
  ),

  /* Patrulheiro — arco com flecha pronta */
  patrulheiro: (
    <>
      {/* Arco em D */}
      <path d="M9,5 Q26,16 9,27" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      {/* Corda */}
      <path d="M9,5 L9,27" stroke="currentColor" strokeWidth="1.1" fill="none"/>
      {/* Haste da flecha */}
      <path d="M5,16 L24,16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      {/* Ponta */}
      <path d="M24,16 L20,13 M24,16 L20,19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      {/* Penas (fletching) */}
      <path d="M5,16 L3,14 M5,16 L3,18 M7,16 L5,14 M7,16 L5,18" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </>
  ),

  /* Monge — punho cerrado */
  monge: (
    <>
      {/* Punho */}
      <path d="M9,12 Q9,8 13,8 L21,8 Q24,8 24,12 L24,22 Q24,25 21,25 L13,25 Q9,25 9,22 Z" fill="currentColor"/>
      {/* Junta dos dedos (linha de knuckles) */}
      <path d="M11,13 Q12,11 13.5,13 Q15,11 16.5,13 Q18,11 19.5,13 Q21,11 22,13" stroke="#fcf3da" strokeWidth="0.9" fill="none"/>
      {/* Linha entre dedos (segregação) */}
      <path d="M12.5,15 L12.5,19 M16,15 L16,19 M19.5,15 L19.5,19" stroke="#fcf3da" strokeWidth="0.7" fill="none"/>
      {/* Polegar */}
      <path d="M9,18 Q5,18 5,21 Q6,23 9,22 Z" fill="currentColor"/>
    </>
  ),

  /* Bardo — lira com cordas */
  bardo: (
    <>
      {/* Braço esquerdo da lira */}
      <path d="M9,7 Q7,9 8,12 L8,19 Q8,23 11,25 L13,27" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Braço direito da lira */}
      <path d="M23,7 Q25,9 24,12 L24,19 Q24,23 21,25 L19,27" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Travessa superior */}
      <path d="M8,7 L24,7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      {/* Cordas */}
      <path d="M11.5,9 L11.5,24" stroke="currentColor" strokeWidth="0.8"/>
      <path d="M14.5,9 L14.5,25" stroke="currentColor" strokeWidth="0.8"/>
      <path d="M17.5,9 L17.5,25" stroke="currentColor" strokeWidth="0.8"/>
      <path d="M20.5,9 L20.5,24" stroke="currentColor" strokeWidth="0.8"/>
      {/* Base da lira */}
      <circle cx="16" cy="27" r="1.4" fill="currentColor"/>
    </>
  ),

  /* Ladino — adaga apontando pra baixo */
  ladino: (
    <>
      {/* Pomo */}
      <circle cx="16" cy="5" r="1.7" fill="currentColor"/>
      {/* Empunhadura */}
      <path d="M14.2,6.5 L17.8,6.5 L17.8,12 L14.2,12 Z" fill="currentColor"/>
      {/* Guarda transversal */}
      <path d="M8,11.5 L24,11.5 L24,13.5 L8,13.5 Z" fill="currentColor"/>
      {/* Lâmina (triângulo afilado) */}
      <path d="M13.5,13.5 L16,28 L18.5,13.5 Z" fill="currentColor"/>
      {/* Linha central da lâmina */}
      <path d="M16,15 L16,26" stroke="#fcf3da" strokeWidth="0.6"/>
    </>
  ),

  /* Mago — espiral arcana */
  mago: (
    <>
      {/* Espiral externa */}
      <path d="M16,4 Q26,4 26,16 Q26,27 14,27 Q5,27 5,18 Q5,11 12,11 Q19,11 19,17 Q19,21 15,21 Q12,21 12,18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      {/* Ponto central */}
      <circle cx="13" cy="18" r="1.4" fill="currentColor"/>
    </>
  ),

  /* Feiticeiro — chama com curl interno */
  feiticeiro: (
    <>
      {/* Contorno externo da chama */}
      <path d="M16,3 Q12,9 10,14 Q8,18 9,22 Q11,27 16,28 Q21,27 23,22 Q24,18 22,14 Q20,9 16,3 Z" fill="currentColor"/>
      {/* Curl interno (chama menor) */}
      <path d="M16,13 Q13,17 14,22 Q16,24 18,22 Q19,19 17,16 Q16,15 16,13 Z" fill="#fcf3da"/>
      {/* Núcleo escuro */}
      <circle cx="16" cy="20" r="1.2" fill="currentColor"/>
    </>
  ),

  /* Druida — pegada (paw print) */
  druida: (
    <>
      {/* 4 dedinhos no topo */}
      <ellipse cx="9" cy="11" rx="1.9" ry="2.7" fill="currentColor"/>
      <ellipse cx="13.5" cy="7.5" rx="1.9" ry="2.7" fill="currentColor"/>
      <ellipse cx="18.5" cy="7.5" rx="1.9" ry="2.7" fill="currentColor"/>
      <ellipse cx="23" cy="11" rx="1.9" ry="2.7" fill="currentColor"/>
      {/* Coxim central */}
      <path d="M10,18 Q10,14 16,14 Q22,14 22,18 L24,23 Q23,27 16,27 Q9,27 8,23 Z" fill="currentColor"/>
    </>
  ),

  /* Clérigo — cetro com raios de sol */
  clerigo: (
    <>
      {/* Cabeça do cetro (sol) */}
      <circle cx="16" cy="9" r="3.4" fill="currentColor"/>
      {/* Raios cardeais */}
      <path d="M16,2 L16,4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16,14 L16,16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9,9 L11.2,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M20.8,9 L23,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Raios diagonais */}
      <path d="M11,4 L12.5,5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M19.5,12.5 L21,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M11,14 L12.5,12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M19.5,5.5 L21,4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      {/* Haste do cetro */}
      <path d="M16,13 L16,28" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      {/* Punho/grip do cetro */}
      <path d="M13.5,19 L18.5,19 L18.5,22 L13.5,22 Z" fill="currentColor"/>
    </>
  ),

  /* Fallback — estrela de 5 pontas */
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

/**
 * Renderiza a silhueta SVG da classe. Aceita o nome cru
 * (`"Guerreiro 3 / Mago 2"`) ou o key canônico (`"guerreiro"`).
 */
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
