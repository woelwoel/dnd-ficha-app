import './dice3d.css'

/**
 * Única ponte do app com a @3d-dice/dice-box-threejs (three.js + cannon-es).
 *
 * O 3D é TEATRO: o resultado lógico vem do parseAndRoll e os dados caem nos
 * valores forçados via notação "@" (ex.: "2d20@12,5"). Quem decide se usa 3D
 * é o DiceRollerProvider; este módulo só sabe animar, enfileirar e avisar
 * quando os dados pararam.
 */

/** Lados que a lib sabe animar — qualquer outro cai no fluxo clássico. */
export const DICE3D_SIDES = new Set([4, 6, 8, 10, 12, 20, 100])

const CONTAINER_ID = 'dice3d-overlay'
const SETTLE_TIMEOUT_MS = 5000 // nunca prende uma rolagem se o WebGL travar
const CLEAR_AFTER_MS = 2500
const TOAST_MS = 2500

// Colorset padrão (fora da ficha): tinta escura + dourado do app.
const DEFAULT_COLORSET = {
  foreground: '#e8ce6f',
  background: '#3b2a1a',
  outline: 'black',
  texture: 'none',
}

let accent = null          // hex do accent da classe (null = padrão)
let appliedAccent = null   // accent embutido na instância atual
let loadPromise = null     // Promise<DiceBox> singleton
let failed = false         // import/init falhou — indisponível pela sessão
let queue = Promise.resolve()
let supportedCache = null
let clearTimer = null
let toastTimer = null

export function isDice3dSupported() {
  if (supportedCache !== null) return supportedCache
  supportedCache = computeSupported()
  return supportedCache
}

function computeSupported() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function setDice3dAccent(hex) {
  accent = hex || null
}

/** Dispara o import+init em idle pra primeira rolagem não pagar o chunk. */
export function preloadDice3d() {
  const kick = () => { load().catch(() => {}) }
  if (typeof requestIdleCallback === 'function') requestIdleCallback(kick)
  else setTimeout(kick, 1500)
}

function ensureContainer() {
  let el = document.getElementById(CONTAINER_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = CONTAINER_ID
    document.body.appendChild(el)
  }
  return el
}

function currentColorset() {
  return accent
    ? { foreground: '#f4f7fa', background: accent, outline: 'black', texture: 'none' }
    : DEFAULT_COLORSET
}

function load() {
  if (failed) return Promise.reject(new Error('dice3d indisponível nesta sessão'))
  if (!loadPromise) {
    loadPromise = (async () => {
      const { default: DiceBox } = await import('@3d-dice/dice-box-threejs')
      ensureContainer()
      const box = new DiceBox(`#${CONTAINER_ID}`, {
        assetPath: '/dice-box/',
        sounds: false,
        theme_customColorset: currentColorset(),
        light_intensity: 0.9,
        strength: 1.5,
      })
      appliedAccent = accent
      await box.initialize()
      return box
    })().catch(err => {
      failed = true
      loadPromise = null
      throw err
    })
  }
  return loadPromise
}

/**
 * A lib não expõe troca de colorset em runtime; o accent só muda ao entrar/
 * sair da ficha, então recriar a instância nesse caso é barato o suficiente.
 */
async function getBox() {
  let box = await load()
  if (appliedAccent !== accent) {
    try { box.clearDice() } catch { /* ignore */ }
    document.getElementById(CONTAINER_ID)?.replaceChildren()
    loadPromise = null
    box = await load()
  }
  return box
}

function animateOnce(box, notation) {
  return new Promise(resolve => {
    let done = false
    const timer = setTimeout(finish, SETTLE_TIMEOUT_MS)
    function finish() {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve()
    }
    try {
      Promise.resolve(box.roll(notation)).then(finish, finish)
    } catch {
      finish()
    }
  })
}

function showToast(label, total) {
  const container = ensureContainer()
  let toast = container.querySelector('.dice3d-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 'dice3d-toast'
    toast.setAttribute('role', 'status')
    toast.setAttribute('aria-live', 'polite')
    const labelEl = document.createElement('span')
    labelEl.className = 'dice3d-toast-label'
    const totalEl = document.createElement('span')
    totalEl.className = 'dice3d-toast-total'
    toast.append(labelEl, totalEl)
    container.appendChild(toast)
  }
  toast.querySelector('.dice3d-toast-label').textContent = label || ''
  toast.querySelector('.dice3d-toast-total').textContent = String(total)
  toast.classList.add('dice3d-toast-visible')
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('dice3d-toast-visible'), TOAST_MS)
}

/**
 * Enfileira uma animação 3D (FIFO — ataque cai antes do dano). Resolve quando
 * os dados PARAM (ou no timeout): é a hora de liberar a entrada no histórico.
 * Resolve { animated: false } se o 3D não pôde animar (import/init falhou) —
 * o provider então cai no fluxo clássico.
 */
export function enqueueDice3d({ sides, values, label, total }) {
  const run = queue.then(async () => {
    let box
    try {
      box = await getBox()
    } catch {
      return { animated: false }
    }
    if (clearTimer) {
      clearTimeout(clearTimer)
      clearTimer = null
    }
    const notation = `${values.length}d${sides}@${values.join(',')}`
    await animateOnce(box, notation)
    showToast(label, total)
    clearTimer = setTimeout(() => {
      try { box.clearDice() } catch { /* ignore */ }
    }, CLEAR_AFTER_MS)
    return { animated: true }
  })
  queue = run.then(() => {}, () => {})
  return run
}

/** Reset dos singletons de módulo — SÓ pra testes. */
export function __resetDice3dForTests() {
  accent = null
  appliedAccent = null
  loadPromise = null
  failed = false
  queue = Promise.resolve()
  supportedCache = null
  if (clearTimer) { clearTimeout(clearTimer); clearTimer = null }
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null }
  document.getElementById(CONTAINER_ID)?.remove()
}
