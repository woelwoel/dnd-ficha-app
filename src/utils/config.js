/**
 * Configuração estática do app — caminhos de assets, nomes default,
 * chaves de localStorage. Sem dependências de runtime.
 *
 * Pra trocar o mapa de fundo, substitua o arquivo em /public/maps/default.svg
 * (ou aponte MAP_BACKGROUND_URL para outro caminho, ex: /maps/default.webp).
 * Veja /public/maps/CREDITS.md para detalhes do asset atual.
 */

export const MAP_BACKGROUND_URL = '/maps/default.svg'

export const CAMPAIGN_NAME_DEFAULT = '⚜ Companhia do Vale ⚜'

/** Limite de tokens listados no sidebar antes de virarem cluster "+ N outros". */
export const MAX_VISIBLE_TOKENS = 10

/** Chaves do localStorage (mantém namespace `dnd-ficha:`). */
export const CAMPAIGN_NAME_STORAGE_KEY = 'dnd-ficha:campaign-name'
export const VIEW_MODE_STORAGE_KEY = 'dnd-ficha:char-list-view'
/** Scope do CharacterList: 'personal' ou JSON `{campaignId}`. */
export const CAMPAIGN_SCOPE_STORAGE_KEY = 'dnd-ficha:campaign-scope'
