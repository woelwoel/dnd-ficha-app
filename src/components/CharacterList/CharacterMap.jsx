import { useMemo } from 'react'
import { CharacterToken } from './CharacterToken'
import { Banner } from '../ui/Banner'
import { MAP_BACKGROUND_URL, CAMPAIGN_NAME_DEFAULT } from '../../utils/config'
import { getDefaultPosition } from '../../utils/token-position'

/**
 * Mapa background com tokens posicionados. Auto-place quando o
 * personagem não tem position salva.
 */
export function CharacterMap({
  characters = [],
  campaignName = CAMPAIGN_NAME_DEFAULT,
  onSelect,
  onTokenDragStart,
}) {
  const positioned = useMemo(
    () => characters.map(c => ({
      ...c,
      position: c.position || getDefaultPosition(c, 'default'),
    })),
    [characters]
  )

  return (
    <div
      role="region"
      aria-label="Mapa da campanha"
      className="relative w-full h-full overflow-hidden rounded"
      style={{
        border: '12px solid',
        borderImage: 'linear-gradient(135deg, var(--color-gold-700), var(--color-shell-700), var(--color-gold-700)) 1',
        boxShadow: 'inset 0 0 60px rgba(42,31,20,0.45), 0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div
        data-testid="character-map-canvas"
        className="absolute inset-0"
        style={{
          backgroundImage: `url('${MAP_BACKGROUND_URL}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[300px] max-w-[80%] z-[3]">
        <Banner>{campaignName}</Banner>
      </div>

      <svg
        viewBox="0 0 78 78"
        className="absolute bottom-3 right-3 z-[4]"
        style={{ width: '78px', height: '78px', opacity: 0.85 }}
        aria-hidden="true"
      >
        <circle cx="39" cy="39" r="34" fill="rgba(244,234,211,0.55)" stroke="var(--color-shell-800)" strokeWidth="1.8"/>
        <circle cx="39" cy="39" r="26" fill="none" stroke="var(--color-shell-800)" strokeWidth="0.8"/>
        <circle cx="39" cy="39" r="3" fill="var(--color-shell-800)"/>
        <path d="M39,5 L43,39 L39,73 L35,39 Z" fill="var(--color-shell-800)"/>
        <path d="M5,39 L39,43 L73,39 L39,35 Z" fill="var(--color-shell-800)" opacity="0.55"/>
        <text x="39" y="3.5" textAnchor="middle" fontSize="7" fill="var(--color-shell-800)" fontWeight="700">N</text>
      </svg>

      {positioned.map(c => (
        <CharacterToken
          key={c.id}
          character={c}
          onSelect={onSelect}
          onDragStart={onTokenDragStart}
        />
      ))}
    </div>
  )
}
