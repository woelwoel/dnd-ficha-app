import { useRef, useState } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useDiceRoller } from '../../../../../hooks/useDiceRoller'

/**
 * Prompt de teste de concentração do shell v2 (PHB p.203).
 * Aparece quando o último evento de dano trouxe concentrationCheckDC
 * (sideEffect que rules.applyDamage já emite) e o personagem segue
 * concentrando — cobre modal de dano E controles rápidos, porque o gancho
 * é o sideEffect, não a UI de origem.
 * NÃO rompe sozinho: na falha o botão Romper ganha destaque — a decisão
 * é do jogador (War Caster, contexto do mestre etc.; Shift = vantagem).
 */
export function ConcentrationPromptV2() {
  const { character, calc, updaters, readOnly } = useCharacterContext()
  const { roll } = useDiceRoller()
  const [result, setResult] = useState(null)

  const event = updaters.lastDamageEvent
  // Novo evento de dano zera o resultado anterior (reset de estado derivado).
  const eventRef = useRef(event)
  if (eventRef.current !== event) {
    eventRef.current = event
    if (result) setResult(null)
  }

  const dc = event?.concentrationCheckDC
  const spell = character.combat?.concentrating
  if (readOnly || dc == null || !spell?.spellIndex) return null

  const bonus = calc.savingThrows?.con ?? 0

  function handleRoll(e) {
    const mode = e.shiftKey ? 'adv' : e.altKey ? 'dis' : undefined
    const entry = roll(`1d20${calc.fmt(bonus)}`, `Concentração · salvaguarda de CON (CD ${dc})`, mode ? { mode } : {})
    if (entry) setResult({ total: entry.total, passed: entry.total >= dc })
  }

  function dismiss() {
    setResult(null)
    updaters.clearLastDamageEvent?.()
  }

  return (
    <div className="v2-panel" role="alert" style={{ borderColor: 'var(--v2-accent)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, minWidth: 200 }}>
        Teste de Concentração — <strong>CD {dc}</strong>
        <span className="v2-mut"> · {spell.spellName}</span>
        {result && (
          <span style={{ marginLeft: 8, fontWeight: 600, color: result.passed ? 'var(--v2-success)' : 'var(--v2-danger)' }}>
            {result.total} vs CD {dc} — {result.passed ? '✓ mantida' : '✗ falhou'}
          </span>
        )}
      </span>
      {!result && (
        <button type="button" className="v2-btn" onClick={handleRoll} title="Shift: vantagem · Alt: desvantagem">
          Rolar salvaguarda de CON
        </button>
      )}
      <button
        type="button"
        className="v2-btn"
        onClick={() => { updaters.setConcentration?.(null); dismiss() }}
        style={result && !result.passed ? { borderColor: 'var(--v2-danger)', color: 'var(--v2-danger)' } : undefined}
      >
        Romper
      </button>
      <button type="button" className="v2-btn" aria-label="Fechar aviso de concentração" onClick={dismiss}>✕</button>
    </div>
  )
}
