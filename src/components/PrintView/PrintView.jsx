/**
 * PrintView — Ficha completa em formato para impressão / PDF.
 *
 * Renderizado via React Portal diretamente em document.body.
 * Normalmente invisível (display:none); em @media print o CSS
 * mostra apenas este elemento e esconde o resto da aplicação.
 *
 * Estrutura: Página 1 (stats + perícias + combate + inventário)
 *            Página 2 (características + personalidade)
 *            Página 3 (magias — apenas para conjuradores)
 */
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSrd } from '../../providers/SrdProvider'
import {
  getModifier, formatModifier,
  SKILLS, ABILITY_SCORES,
  calculateSkillModifier, calculateSavingThrow,
  ATTR_NAME_TO_KEY,
} from '../../utils/calculations'

/* ══════════════════════════════════════════════════════════════════
   Paleta de impressão (pergaminho arcano)
   ══════════════════════════════════════════════════════════════════ */
const INK    = '#1a1209'
const BORDER = '#8b7355'
const HEAD   = '#5c3d0e'
const SHADE  = 'rgba(139,115,85,0.13)'

/* ── Utilitários de estilo inline ─────────────────────────────── */
function boxStyle(extra = {}) {
  return {
    border: `1px solid ${BORDER}`,
    borderRadius: '3px',
    padding: '2px 5px',
    backgroundColor: SHADE,
    ...extra,
  }
}

function headStyle(extra = {}) {
  return {
    fontSize: '7.5pt',
    fontWeight: 'bold',
    color: HEAD,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: `1px solid ${BORDER}`,
    paddingBottom: '2px',
    marginBottom: '5px',
    ...extra,
  }
}

function dotStyle(filled) {
  return {
    display: 'inline-block',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    border: `1px solid ${BORDER}`,
    backgroundColor: filled ? HEAD : 'transparent',
    marginRight: '4px',
    flexShrink: 0,
    verticalAlign: 'middle',
  }
}

/* ══════════════════════════════════════════════════════════════════
   Sub-componentes de página 1
   ══════════════════════════════════════════════════════════════════ */

/** Coluna esquerda: atributos + salvaguardas + prof bônus */
function AttrColumn({ attributes, profBonus, classData }) {
  const savingProfs = useMemo(
    () => (classData?.saving_throws ?? []).map(n => ATTR_NAME_TO_KEY[n]).filter(Boolean),
    [classData],
  )

  return (
    <div style={{ width: '88px', flexShrink: 0 }}>

      {/* Atributos */}
      <div style={headStyle()}>Atributos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
        {ABILITY_SCORES.map(({ key, abbr }) => {
          const score = attributes[key] ?? 10
          const mod   = getModifier(score)
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '32px', height: '32px',
                border: `1px solid ${BORDER}`, borderRadius: '4px',
                backgroundColor: SHADE,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '10.5pt', fontWeight: 'bold', lineHeight: 1, color: INK }}>
                  {formatModifier(mod)}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '7pt', color: HEAD, fontWeight: 'bold', lineHeight: 1.2 }}>{abbr}</div>
                <div style={{ fontSize: '7pt', color: '#777', lineHeight: 1.2 }}>{score}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Salvaguardas */}
      <div style={headStyle()}>Salvaguardas</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
        {ABILITY_SCORES.map(({ key, abbr }) => {
          const prof = savingProfs.includes(key)
          const mod  = calculateSavingThrow(attributes[key] ?? 10, profBonus, prof)
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8pt' }}>
              <span style={dotStyle(prof)} />
              <span style={{ fontWeight: prof ? 'bold' : 'normal', minWidth: '24px', color: prof ? INK : '#888' }}>
                {formatModifier(mod)}
              </span>
              <span style={{ color: prof ? INK : '#999', fontSize: '7.5pt' }}>{abbr}</span>
            </div>
          )
        })}
      </div>

      {/* Prof. Bônus */}
      <div style={headStyle()}>Prof. Bônus</div>
      <div style={boxStyle({ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', marginBottom: '8px', padding: '3px' })}>
        {formatModifier(profBonus)}
      </div>

    </div>
  )
}

/** Coluna central: perícias + percepção passiva + idiomas */
function SkillsColumn({ attributes, proficiencies, profBonus, passivePerception }) {
  const bgSkills      = proficiencies.backgroundSkills ?? []
  const expertise     = proficiencies.expertiseSkills  ?? []

  return (
    <div style={{ flex: 1, minWidth: 0 }}>

      <div style={headStyle()}>Perícias</div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '1px 10px', marginBottom: '8px',
      }}>
        {SKILLS.map(({ key, name, ability, abbr }) => {
          const isClass  = proficiencies.skills.includes(key)
          const isBg     = bgSkills.includes(key)
          const prof     = isClass || isBg
          const expert   = prof && expertise.includes(key)
          const mod      = calculateSkillModifier(attributes[ability] ?? 10, profBonus, prof, expert)
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '7.5pt' }}>
              <span style={dotStyle(prof)} />
              {expert && (
                <span style={{ color: HEAD, fontSize: '6pt', marginRight: '1px' }}>★</span>
              )}
              <span style={{ fontWeight: prof ? 'bold' : 'normal', minWidth: '22px', color: prof ? INK : '#888' }}>
                {formatModifier(mod)}
              </span>
              <span style={{
                color: prof ? INK : '#999',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {name}
              </span>
            </div>
          )
        })}
      </div>

      {/* Percepção Passiva */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={headStyle({ margin: 0, border: 'none', paddingBottom: 0 })}>Percep. Passiva</span>
        <span style={boxStyle({ fontWeight: 'bold', fontSize: '10pt', padding: '1px 8px' })}>
          {passivePerception}
        </span>
      </div>

      {/* Idiomas */}
      {(proficiencies.languages ?? []).length > 0 && (
        <div style={{ marginBottom: '6px' }}>
          <div style={headStyle()}>Idiomas</div>
          <div style={{ fontSize: '7.5pt', color: '#555', lineHeight: 1.4 }}>
            {proficiencies.languages.join(', ')}
          </div>
        </div>
      )}

      {/* Proficiências */}
      {((proficiencies.armor ?? []).length > 0 || (proficiencies.weapons ?? []).length > 0) && (
        <div>
          <div style={headStyle()}>Proficiências</div>
          <div style={{ fontSize: '7pt', color: '#555', lineHeight: 1.4 }}>
            {[...(proficiencies.armor ?? []), ...(proficiencies.weapons ?? [])].join(', ')}
          </div>
        </div>
      )}

    </div>
  )
}

/** Coluna direita: combate + ataques */
function CombatColumn({ combat, calc, classData }) {
  const { profBonus, initiative } = calc
  const attacks = combat?.attacks ?? []
  const hitDie  = classData?.hit_die ? `d${classData.hit_die}` : '—'
  const speed   = combat?.speed ?? 9

  return (
    <div style={{ width: '170px', flexShrink: 0 }}>

      {/* CA / Iniciativa / Velocidade */}
      <div style={headStyle()}>Combate</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '7px' }}>
        {[
          { label: 'CA',   value: combat?.armorClass ?? '—' },
          { label: 'Init', value: formatModifier(initiative ?? 0) },
          { label: 'Vel',  value: `${speed}m` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            textAlign: 'center',
            border: `1px solid ${BORDER}`, borderRadius: '3px',
            padding: '3px 2px', backgroundColor: SHADE,
          }}>
            <div style={{ fontSize: '10.5pt', fontWeight: 'bold', lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: '6.5pt', color: HEAD, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* HP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '6px' }}>
        {[
          { label: 'HP Máximo', value: combat?.maxHp     ?? '—' },
          { label: 'HP Atual',  value: combat?.currentHp ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} style={boxStyle({ padding: '3px 4px' })}>
            <div style={{ fontSize: '6.5pt', color: HEAD, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '12pt', fontWeight: 'bold', lineHeight: 1.2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Dado de Vida + Prof Bônus */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
        {[
          { label: 'Dado de Vida',  value: hitDie },
          { label: 'Prof. Bônus',   value: formatModifier(profBonus) },
        ].map(({ label, value }) => (
          <div key={label} style={boxStyle({ textAlign: 'center', padding: '3px' })}>
            <div style={{ fontSize: '6.5pt', color: HEAD }}>{label}</div>
            <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Testes de Morte */}
      <div style={headStyle()}>Testes de Morte</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '10px' }}>
        {['Sucessos', 'Fracassos'].map(label => (
          <div key={label}>
            <div style={{ color: HEAD, fontSize: '6.5pt', marginBottom: '3px' }}>{label}</div>
            <div style={{ display: 'flex', gap: '3px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '13px', height: '13px',
                  border: `1px solid ${BORDER}`, borderRadius: '2px',
                  backgroundColor: SHADE,
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Ataques */}
      {attacks.length > 0 && (
        <>
          <div style={headStyle()}>Ataques</div>
          <table style={{ width: '100%', fontSize: '7.5pt', borderCollapse: 'collapse', marginBottom: '6px' }}>
            <thead>
              <tr>
                {['Nome', 'Atq', 'Dano/Tipo'].map(th => (
                  <th key={th} style={{
                    textAlign: 'left', color: HEAD, fontWeight: 'bold',
                    paddingBottom: '2px', borderBottom: `1px solid ${BORDER}`,
                    paddingRight: '4px',
                  }}>{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attacks.map((atk, i) => (
                <tr key={i} style={{ borderBottom: `1px solid rgba(139,115,85,0.15)` }}>
                  <td style={{ padding: '1px 4px 1px 0', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {atk.name}
                  </td>
                  <td style={{ padding: '1px 4px', textAlign: 'center' }}>
                    {atk.attackBonus != null ? formatModifier(atk.attackBonus) : '—'}
                  </td>
                  <td style={{ padding: '1px 0' }}>
                    {[atk.damage, atk.damageType].filter(Boolean).join(' ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Linhas em branco para anotações manuais */}
          {Array.from({ length: Math.max(0, 5 - attacks.length) }).map((_, i) => (
            <div key={i} style={{ borderBottom: `1px solid rgba(139,115,85,0.2)`, height: '14px', marginBottom: '2px' }} />
          ))}
        </>
      )}

    </div>
  )
}

/** Rodapé pág 1: moedas + itens */
function InventorySection({ inventory }) {
  const currency = inventory?.currency ?? {}
  const items    = inventory?.items    ?? []

  const COINS = [
    { key: 'pp', label: 'PP' },
    { key: 'gp', label: 'PO' },
    { key: 'ep', label: 'PE' },
    { key: 'sp', label: 'PT' },
    { key: 'cp', label: 'PC' },
  ]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={headStyle({ margin: 0, border: 'none', paddingBottom: 0, marginRight: '4px' })}>Moedas</span>
        {COINS.map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8pt' }}>
            <span style={boxStyle({ fontWeight: 'bold', minWidth: '22px', textAlign: 'center', padding: '1px 6px' })}>
              {currency[key] ?? 0}
            </span>
            <span style={{ color: HEAD, fontSize: '7pt', fontWeight: 'bold' }}>{label}</span>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <>
          <div style={headStyle()}>Equipamento e Itens</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px 10px', fontSize: '7.5pt' }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                borderBottom: `1px solid rgba(139,115,85,0.2)`, paddingBottom: '1px',
              }}>
                <span>{item.qty > 1 ? `${item.qty}× ` : ''}{item.name}</span>
                {item.weight ? <span style={{ color: '#888' }}>{item.weight}kg</span> : null}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════
   Página 2: Características + Personalidade
   ══════════════════════════════════════════════════════════════════ */
function FeaturesSection({ classFeatures, raceFeatures }) {
  const allFeatures = [
    ...classFeatures.map(f => ({ ...f, origin: 'Classe' })),
    ...raceFeatures.map(f => ({ ...f, name: f.title ?? f.name, origin: 'Raça' })),
  ]

  if (!allFeatures.length) {
    return (
      <div style={{ color: '#aaa', fontSize: '8pt', fontStyle: 'italic' }}>
        Nenhuma característica encontrada.
      </div>
    )
  }

  return (
    <div style={{ columns: 2, columnGap: '10px' }}>
      {allFeatures.map((f, i) => (
        <div key={i} style={{ breakInside: 'avoid', marginBottom: '6px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '8pt', color: HEAD }}>
            {f.name}
            {f.level != null && (
              <span style={{ fontWeight: 'normal', fontSize: '7pt', color: '#888', marginLeft: '4px' }}>
                Nv {f.level}
              </span>
            )}
          </div>
          {f.desc && (
            <div style={{ fontSize: '7.5pt', color: '#444', lineHeight: 1.35 }}>
              {f.desc.length > 300 ? f.desc.slice(0, 300) + '…' : f.desc}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PersonalitySection({ traits }) {
  const fields = [
    { key: 'personalityTraits', label: 'Traços de Personalidade' },
    { key: 'ideals',            label: 'Ideais' },
    { key: 'bonds',             label: 'Vínculos' },
    { key: 'flaws',             label: 'Defeitos' },
  ]

  return (
    <div style={{ width: '200px', flexShrink: 0 }}>
      {fields.map(({ key, label }) =>
        traits?.[key] ? (
          <div key={key} style={{ marginBottom: '8px' }}>
            <div style={headStyle()}>{label}</div>
            <div style={boxStyle({ fontSize: '8pt', lineHeight: 1.4, minHeight: '28px', whiteSpace: 'pre-wrap' })}>
              {traits[key]}
            </div>
          </div>
        ) : null,
      )}

      {/* Espaços em branco para personalidade não preenchida */}
      {!fields.some(f => traits?.[f.key]) && (
        fields.map(({ label }, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <div style={headStyle()}>{label}</div>
            <div style={boxStyle({ fontSize: '8pt', minHeight: '36px' })} />
          </div>
        ))
      )}

      {traits?.backstory && (
        <div style={{ marginBottom: '8px' }}>
          <div style={headStyle()}>História</div>
          <div style={boxStyle({ fontSize: '7.5pt', lineHeight: 1.4, whiteSpace: 'pre-wrap' })}>
            {traits.backstory.slice(0, 600)}{traits.backstory.length > 600 ? '…' : ''}
          </div>
        </div>
      )}

      {traits?.notes && (
        <div>
          <div style={headStyle()}>Anotações</div>
          <div style={boxStyle({ fontSize: '7.5pt', lineHeight: 1.4, whiteSpace: 'pre-wrap' })}>
            {traits.notes}
          </div>
        </div>
      )}

      {/* Espaço livre para anotações manuais */}
      {!traits?.notes && (
        <div>
          <div style={headStyle()}>Anotações</div>
          <div style={boxStyle({ minHeight: '60px' })} />
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   Página 3: Magias
   ══════════════════════════════════════════════════════════════════ */
function SpellsPage({ character, classData, profBonus }) {
  const { spellcasting = {}, attributes } = character

  const ability      = spellcasting?.ability
  const abilityScore = attributes?.[ability] ?? 10
  const abilityAbbr  = ABILITY_SCORES.find(a => a.key === ability)?.abbr ?? '—'
  const attackBonus  = profBonus + getModifier(abilityScore)
  const saveDC       = 8 + profBonus + getModifier(abilityScore)

  const spells = spellcasting?.spells ?? []
  const byLevel = useMemo(() => {
    const map = {}
    for (const sp of spells) {
      const lvl = sp.level ?? 0
      if (!map[lvl]) map[lvl] = []
      map[lvl].push(sp)
    }
    return map
  }, [spells])

  const slots  = spellcasting?.slots ?? []
  const LEVEL_LABELS = ['Truques', 'Nível 1', 'Nível 2', 'Nível 3', 'Nível 4', 'Nível 5', 'Nível 6', 'Nível 7', 'Nível 8', 'Nível 9']
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b)

  return (
    <>
      {/* Cabeçalho de conjuração */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '8px', fontSize: '9pt' }}>
        <div>
          <span style={{ color: HEAD, fontWeight: 'bold' }}>Habilidade: </span>
          {abilityAbbr}
        </div>
        <div>
          <span style={{ color: HEAD, fontWeight: 'bold' }}>Bônus de Ataque: </span>
          {formatModifier(attackBonus)}
        </div>
        <div>
          <span style={{ color: HEAD, fontWeight: 'bold' }}>CD de Magia: </span>
          {saveDC}
        </div>
      </div>

      {/* Espaços de magia */}
      {slots.some(s => s?.total > 0) && (
        <div style={{ marginBottom: '10px' }}>
          <div style={headStyle()}>Espaços de Magia</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
            {slots.map((slot, i) => {
              if (!slot?.total) return null
              const rem = slot.total - (slot.used ?? 0)
              return (
                <div key={i} style={boxStyle({ fontSize: '8pt', padding: '2px 8px' })}>
                  <span style={{ color: HEAD, fontWeight: 'bold' }}>Nv {i + 1}: </span>
                  <span style={{ fontWeight: 'bold' }}>{rem}/{slot.total}</span>
                  {/* Caixinhas de slot */}
                  <span style={{ marginLeft: '5px' }}>
                    {Array.from({ length: slot.total }).map((_, j) => (
                      <span key={j} style={{
                        display: 'inline-block',
                        width: '10px', height: '10px',
                        border: `1px solid ${BORDER}`,
                        borderRadius: '2px',
                        backgroundColor: j < rem ? SHADE : 'rgba(139,115,85,0.4)',
                        marginLeft: '2px',
                        verticalAlign: 'middle',
                      }} />
                    ))}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de magias por nível */}
      <div style={{ columns: 2, columnGap: '12px' }}>
        {levels.map(lvl => {
          const levelSpells = byLevel[lvl] ?? []
          return (
            <div key={lvl} style={{ breakInside: 'avoid', marginBottom: '8px' }}>
              <div style={headStyle({ fontSize: '7pt' })}>{LEVEL_LABELS[lvl] ?? `Nível ${lvl}`}</div>
              {levelSpells.map((sp, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '8pt', marginBottom: '2px',
                  borderBottom: `1px solid rgba(139,115,85,0.15)`, paddingBottom: '1px',
                }}>
                  {sp.prepared != null && <span style={dotStyle(sp.prepared)} />}
                  <span style={{ fontWeight: sp.prepared ? 'bold' : 'normal' }}>{sp.name}</span>
                  {sp.school && (
                    <span style={{ color: '#888', fontSize: '6.5pt', marginLeft: '2px' }}>
                      ({typeof sp.school === 'string' ? sp.school.slice(0, 3) : '?'})
                    </span>
                  )}
                  {sp.concentration && (
                    <span style={{ color: '#b8860b', fontSize: '6.5pt', fontWeight: 'bold' }}>C</span>
                  )}
                  {sp.casting_time && (
                    <span style={{ color: '#aaa', fontSize: '6.5pt', marginLeft: 'auto' }}>
                      {sp.casting_time}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════ */
export function PrintView({ character, calc, classData, backgrounds }) {
  const { progression, races } = useSrd()
  const { info, attributes, combat, proficiencies, inventory, spellcasting, traits } = character

  /* Features de classe */
  const classFeatures = useMemo(() => {
    const data = progression?.[info.class]
    return data?.levels?.filter(l => l.level <= (info.level ?? 1))
      .flatMap(l => l.features ?? []) ?? []
  }, [progression, info.class, info.level])

  /* Traços raciais */
  const raceFeatures = useMemo(() => {
    const race = races.find(r => r.index === info.race)
    const sub  = race?.subraces?.find(s => s.index === info.subrace)
    return [
      ...(race?.topics ?? race?.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []),
      ...(sub?.topics  ?? sub?.traits?.map(t  => ({ title: t.name, desc: t.desc })) ?? []),
    ].filter(t => (t.title ?? t.name) && t.desc)
  }, [races, info.race, info.subrace])

  /* Conjurador? */
  const isSpellcaster = (spellcasting?.spells?.length ?? 0) > 0
    || (spellcasting?.slots ?? []).some(s => s?.total > 0)

  /* Linha de identidade */
  const classLine = (() => {
    const base = classData?.name ?? info.class ?? ''
    const multi = (info.multiclasses ?? []).map(mc => `${mc.class} ${mc.level}`).join(' / ')
    if (multi) return `${base} ${info.level} / ${multi}`
    return base ? `${base} — Nível ${info.level ?? 1}` : `Nível ${info.level ?? 1}`
  })()

  const bgName = backgrounds?.find(b => b.index === info.background)?.name ?? info.background ?? ''

  /* ── Conteúdo ─────────────────────────────────────────────────── */
  const content = (
    <div
      id="print-character-view"
      style={{ display: 'none', fontFamily: 'Georgia, serif', color: INK, fontSize: '9pt', lineHeight: 1.4 }}
    >

      {/* ══ PÁGINA 1: Stats ══════════════════════════════════════ */}
      <div style={{ padding: '10mm 8mm', boxSizing: 'border-box' }}>

        {/* Cabeçalho de identidade */}
        <div style={{
          textAlign: 'center',
          borderBottom: `2px solid ${BORDER}`,
          paddingBottom: '8px', marginBottom: '10px',
        }}>
          <h1 style={{
            margin: 0, fontSize: '20pt',
            fontFamily: 'Georgia, serif', fontVariant: 'small-caps',
            letterSpacing: '0.06em', color: HEAD,
          }}>
            {info.name || 'Personagem Sem Nome'}
          </h1>
          <div style={{
            fontSize: '8.5pt', color: '#555', marginTop: '4px',
            display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap',
          }}>
            {classLine  && <span><strong style={{ color: HEAD }}>Classe:</strong> {classLine}</span>}
            {info.race  && <span><strong style={{ color: HEAD }}>Raça:</strong> {info.race}{info.subrace ? ` (${info.subrace})` : ''}</span>}
            {bgName     && <span><strong style={{ color: HEAD }}>Antecedente:</strong> {bgName}</span>}
            {info.alignment && <span><strong style={{ color: HEAD }}>Alinhamento:</strong> {info.alignment}</span>}
            {info.xp != null && info.xp > 0 && <span><strong style={{ color: HEAD }}>XP:</strong> {info.xp}</span>}
          </div>
        </div>

        {/* 3 colunas */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <AttrColumn   attributes={attributes}   profBonus={calc.profBonus}   classData={classData} />
          <SkillsColumn attributes={attributes}   proficiencies={proficiencies} profBonus={calc.profBonus} passivePerception={calc.passivePerception} />
          <CombatColumn combat={combat}            calc={calc}                  classData={classData} />
        </div>

        {/* Inventário */}
        <div style={{ marginTop: '10px', borderTop: `1px solid ${BORDER}`, paddingTop: '6px' }}>
          <InventorySection inventory={inventory} />
        </div>

      </div>

      {/* ══ PÁGINA 2: Características + Personalidade ════════════ */}
      <div style={{ pageBreakBefore: 'always', breakBefore: 'page', padding: '10mm 8mm', boxSizing: 'border-box' }}>
        <h2 style={{
          margin: '0 0 8px', fontSize: '12pt',
          fontFamily: 'Georgia, serif', fontVariant: 'small-caps',
          color: HEAD, borderBottom: `1px solid ${BORDER}`, paddingBottom: '4px',
        }}>
          {info.name || 'Personagem'} — Características &amp; Personalidade
        </h2>

        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={headStyle()}>Características</div>
            <FeaturesSection classFeatures={classFeatures} raceFeatures={raceFeatures} />
          </div>
          <PersonalitySection traits={traits} />
        </div>
      </div>

      {/* ══ PÁGINA 3: Magias (conjuradores) ══════════════════════ */}
      {isSpellcaster && (
        <div style={{ pageBreakBefore: 'always', breakBefore: 'page', padding: '10mm 8mm', boxSizing: 'border-box' }}>
          <h2 style={{
            margin: '0 0 8px', fontSize: '12pt',
            fontFamily: 'Georgia, serif', fontVariant: 'small-caps',
            color: HEAD, borderBottom: `1px solid ${BORDER}`, paddingBottom: '4px',
          }}>
            {info.name || 'Personagem'} — Magias
          </h2>
          <SpellsPage character={character} classData={classData} profBonus={calc.profBonus} />
        </div>
      )}

    </div>
  )

  return createPortal(content, document.body)
}
