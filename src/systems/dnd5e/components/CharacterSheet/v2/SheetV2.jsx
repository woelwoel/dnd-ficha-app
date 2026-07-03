import './tokens.css'
import { HeaderV2 } from './HeaderV2'
import { AbilityStrip } from './AbilityStrip'
import { SavesPanel, SensesPanel, ProficienciesPanel } from './SidePanels'
import { SkillsPanel } from './SkillsPanel'
import { MainBox } from './MainBox'

export function SheetV2({ onBack, onExport, onPrint, saving, saved, saveError }) {
  return (
    <div className="sheet-v2 min-h-screen">
      <div className="max-w-7xl mx-auto px-3 py-4 space-y-3">
        <HeaderV2
          onBack={onBack}
          onExport={onExport}
          onPrint={onPrint}
          saving={saving}
          saved={saved}
          saveError={saveError}
        />
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
