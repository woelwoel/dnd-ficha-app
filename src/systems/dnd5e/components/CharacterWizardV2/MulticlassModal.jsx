import { useState, useEffect } from 'react'
import {
  meetsPrereqs, formatPrereqs, totalLevels, takenClassIndices,
} from './blocks/class/multiclass-helpers'
import { computeFinalAttributes } from './blocks/build-character'
import { Modal } from '../../../../components/ui/Modal'
import { ClassInfoButton } from './blocks/class/ClassInfoButton'

const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

export function MulticlassModal({ open, draft, classes, multiclassData, onAdd, onCancel }) {
  const [classIndex, setClassIndex] = useState('')
  const [level, setLevel] = useState(1)

  useEffect(() => {
    if (open) {
      setClassIndex('')
      setLevel(1)
    }
  }, [open])

  if (!open) return null

  const taken = takenClassIndices(draft)
  const available = classes.filter(c => !taken.has(c.index))
  const selectedClass = classes.find(c => c.index === classIndex) ?? null
  const mcData = multiclassData?.[classIndex] ?? null
  const prereqs = mcData?.prerequisites ?? null
  const profs = mcData?.proficiencies ?? null
  // Atributos FINAIS (base + racial + ASI) — mesma base usada na ficha e em RAW:
  // o pré-requisito é checado contra os valores atuais (PHB p.163).
  const attrs = computeFinalAttributes(draft)
  const newClassOk = meetsPrereqs(prereqs, attrs)
  // PHB p.163: para multiclassar é preciso atender o pré-requisito da classe
  // NOVA *e* de todas as classes que o personagem JÁ possui (origem).
  const failingOriginClasses = classIndex
    ? [...taken]
        .filter(ci => ci && !meetsPrereqs(multiclassData?.[ci]?.prerequisites, attrs))
        .map(ci => classes.find(c => c.index === ci)?.name ?? ci)
    : []
  const originOk = failingOriginClasses.length === 0
  const prereqOk = !classIndex || (newClassOk && originOk)
  const currentTotal = totalLevels(draft)
  // Nível total não pode passar de 20: só ofereça os níveis ainda disponíveis.
  const maxAddLevel = Math.max(1, 20 - currentTotal)
  const safeLevel = Math.min(level, maxAddLevel)
  const wouldExceed20 = currentTotal + safeLevel > 20

  const canAdd = !!classIndex && prereqOk && !wouldExceed20

  function handleConfirm() {
    if (!canAdd) return
    const cls = classes.find(c => c.index === classIndex)
    onAdd({
      class: classIndex,
      level: safeLevel,
      chosenFeatures: {},
      asiChoices: {},
      bonusSpells: [],
      hitDie: cls?.hit_die ?? 8,
      // Proficiências de multiclasse (PHB p.164) — gravadas para o build
      // mesclar em proficiencies. A(s) perícia(s) são escolhidas depois,
      // no card da multiclasse (mc.chosenSkills).
      proficiencies: profs ?? { armor: [], weapons: [], tools: [], skills: 0 },
      chosenSkills: [],
    })
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Adicionar Classe"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canAdd}
            className="px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide disabled:opacity-35 disabled:cursor-not-allowed"
          >
            Adicionar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs ink-italic tracking-[0.3em] uppercase text-ink-300 text-center -mt-1">Forjar Herói</p>
        <div>
          <label htmlFor="mc-class-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
            Classe <span className="text-red-700">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <select
                id="mc-class-select"
                value={classIndex}
                onChange={e => setClassIndex(e.target.value)}
                className={fieldCls}
              >
                <option value="">Escolher classe...</option>
                {available.map(c => (
                  <option key={c.index} value={c.index}>{c.name}</option>
                ))}
              </select>
            </div>
            <ClassInfoButton classData={selectedClass} />
          </div>
        </div>

        <div>
          <label htmlFor="mc-level-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
            Nível
          </label>
          <select
            id="mc-level-select"
            value={safeLevel}
            onChange={e => setLevel(Number(e.target.value))}
            className={fieldCls}
          >
            {Array.from({ length: maxAddLevel }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>Nível {n}</option>
            ))}
          </select>
        </div>

        {selectedClass && prereqs && (
          <div className={[
            'text-xs px-3 py-2 rounded-sm border-2 flex items-center gap-2',
            newClassOk
              ? 'border-emerald-700 bg-emerald-50 text-emerald-700'
              : 'border-red-700 bg-red-50 text-red-700',
          ].join(' ')}>
            {newClassOk ? '✓' : '✗'} Pré-requisito: {formatPrereqs(prereqs)}
          </div>
        )}

        {selectedClass && !originOk && (
          <div className="text-xs px-3 py-2 rounded-sm border-2 border-red-700 bg-red-50 text-red-700 flex items-center gap-2">
            ✗ Pré-requisito da classe atual não atendido: {failingOriginClasses.join(', ')} (PHB p.163)
          </div>
        )}

        {selectedClass && profs && (
          <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2 text-xs">
            <p className="font-display tracking-widest uppercase text-ink-300 mb-1">Proficiências ganhas</p>
            <div className="flex flex-col gap-0.5 text-ink-500">
              {profs.armor?.length > 0 && <p><span className="text-ink-300">Armaduras:</span> {profs.armor.join(', ')}</p>}
              {profs.weapons?.length > 0 && <p><span className="text-ink-300">Armas:</span> {profs.weapons.join(', ')}</p>}
              {profs.tools?.length > 0 && <p><span className="text-ink-300">Ferramentas:</span> {profs.tools.join(', ')}</p>}
              {profs.skills > 0 && <p><span className="text-ink-300">Perícias:</span> escolher {profs.skills}</p>}
            </div>
          </div>
        )}

        {wouldExceed20 && (
          <div className="text-xs px-3 py-2 rounded-sm border-2 border-amber-700 bg-amber-50 text-amber-700">
            ⚠ Total de níveis excederia 20 ({currentTotal} + {level} = {currentTotal + level})
          </div>
        )}
      </div>
    </Modal>
  )
}
