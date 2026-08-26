import { effectiveSpeed, getEffectiveSaveProficiencies } from '../../domain/rules'
import { characterLevel } from '../../domain/party'
import {
  getModifier, getProficiencyBonus, formatModifier, calculatePassivePerception,
} from '../../utils/calculations'

const SAVES = [
  { key: 'str', label: 'FOR' },
  { key: 'dex', label: 'DES' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'SAB' },
  { key: 'cha', label: 'CAR' },
]

/**
 * O que o Mestre precisa consultar no turno de um jogador — não a ficha
 * inteira: quem quer a ficha abre a ficha.
 *
 * Os modificadores saem dos valores gravados na ficha (atributos, proficiências
 * e bônus de proficiência). Efeitos ativos de magia (bênção, escudo etc.) NÃO
 * entram, porque calculá-los exige o provider de SRD e a matriz de vantagem que
 * só a tela da ficha monta — por isso o rodapé avisa em vez de mentir.
 */
export function PcTacticalCard({ doc }) {
  if (!doc) {
    return <p className="text-sm ink-italic text-ink-300">Ficha indisponível — o jogador saiu da mesa?</p>
  }

  const combat = doc.combat ?? {}
  const attrs = doc.attributes ?? {}
  const nivel = characterLevel(doc)
  const prof = getProficiencyBonus(nivel)
  const saveProfs = getEffectiveSaveProficiencies(doc)
  const perceptionProf = (doc.skills ?? []).includes('perception')
  const perceptionExpert = (doc.expertiseSkills ?? []).includes('perception')
  const passiva = calculatePassivePerception(
    attrs.wis ?? 10, prof, perceptionProf, perceptionExpert, { feats: doc.info?.feats ?? [] },
  )
  const desloc = effectiveSpeed(doc)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
        <span><strong>CA</strong> {combat.armorClass ?? '—'}</span>
        <span><strong>PV</strong> {combat.currentHp ?? 0}/{combat.maxHp ?? 0}
          {(combat.tempHp ?? 0) > 0 && <span className="ink-italic text-ink-300"> +{combat.tempHp}</span>}
        </span>
        <span><strong>Percepção passiva</strong> {passiva}</span>
        <span><strong>Deslocamento</strong> {desloc} m</span>
      </div>

      <div>
        <h4 className="text-xs font-display tracking-widest uppercase text-ink-500 mb-1">Salvaguardas</h4>
        <ul className="flex flex-wrap gap-1">
          {SAVES.map(s => {
            const proficiente = saveProfs.includes(s.key)
            const mod = getModifier(attrs[s.key] ?? 10) + (proficiente ? prof : 0)
            return (
              <li
                key={s.key}
                className={`text-xs px-2 py-1 rounded-sm border-2 tabular-nums ${
                  proficiente
                    ? 'border-ink-600 bg-parchment-200 text-ink-500'
                    : 'border-parchment-600 text-ink-300'
                }`}
              >
                {s.label} {formatModifier(mod)}
              </li>
            )
          })}
        </ul>
      </div>

      {combat.deathSaves && (combat.currentHp ?? 0) === 0 && (
        <p className="text-xs text-red-700">
          Salvaguardas de morte — {combat.deathSaves.successes ?? 0} sucesso(s),
          {' '}{combat.deathSaves.failures ?? 0} falha(s)
          {combat.isStable && ' · estável'}
        </p>
      )}

      <p className="text-xs ink-italic text-ink-300">
        Valores da ficha; efeitos ativos de magia não estão somados aqui.
      </p>
    </div>
  )
}
