import './tokens.css'
import './legacy-bridge.css'
import { useCharacterContext } from '../CharacterContext'
import { classAccentOf } from './classAccents'
import { HeaderV2 } from './HeaderV2'
import { AbilityStrip } from './AbilityStrip'
import { SavesPanel, SensesPanel, ProficienciesPanel } from './SidePanels'
import { SkillsPanel } from './SkillsPanel'
import { MainBox } from './MainBox'

export function SheetV2({ onBack, onExport, onPrint, onImport, onImportError, saving, saved, saveError, banner }) {
  const { character } = useCharacterContext()
  return (
    <div className="sheet-v2 min-h-screen" style={{ '--v2-accent': classAccentOf(character?.info?.class) }}>
      <div className="max-w-7xl mx-auto px-3 py-4 space-y-3">
        <HeaderV2
          onBack={onBack}
          onExport={onExport}
          onPrint={onPrint}
          onImport={onImport}
          onImportError={onImportError}
          saving={saving}
          saved={saved}
          saveError={saveError}
        />
        {banner}
        <AbilityStrip />
        <div className="grid grid-cols-1 lg:grid-cols-[210px_230px_minmax(0,1fr)] gap-3 items-start">
          <div className="space-y-3 min-w-0">
            <SavesPanel />
            <SensesPanel />
            <ProficienciesPanel />
          </div>
          <SkillsPanel />
          <MainBox />
        </div>
      </div>
    </div>
  )
}
