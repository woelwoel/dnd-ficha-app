const STORAGE_KEY = 'dnd-app-characters'

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadCharacters() {
  const data = safeGet(STORAGE_KEY, [])
  return Array.isArray(data) ? data : []
}

export function saveCharacters(characters) {
  return safeSet(STORAGE_KEY, characters)
}

export function loadCharacterById(id) {
  return loadCharacters().find(c => c.id === id) ?? null
}

export function upsertCharacter(character) {
  const all = loadCharacters()
  const idx = all.findIndex(c => c.id === character.id)
  if (idx >= 0) all[idx] = character
  else all.push(character)
  return safeSet(STORAGE_KEY, all)
}

export function deleteCharacter(id) {
  const all = loadCharacters().filter(c => c.id !== id)
  return safeSet(STORAGE_KEY, all)
}
