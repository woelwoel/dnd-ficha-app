import './tokens.css'
import './legacy-bridge.css'
import { useState } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { classAccentOf } from './classAccents'
import { DiceAccentSync } from './DiceAccentSync'
import { HeaderV2 } from './HeaderV2'
import { AbilityStrip } from './AbilityStrip'
import { SavesPanel, SensesPanel, ProficienciesPanel } from './SidePanels'
import { SkillsPanel } from './SkillsPanel'
import { MainBox } from './MainBox'
import { BottomNav } from './BottomNav'

export function SheetV2({ onBack, onExport, onPrint, onImport, onImportError, saving, saved, saveError, banner }) {
  const { character } = useCharacterContext()
  // Navegação mobile (< lg). Desktop ignora — alterna 100% por CSS (sem media
  // query em JS). 'mais' abre o sub-seletor Características/Notas via maisTab.
  const [mobileSection, setMobileSection] = useState('ficha')
  const [maisTab, setMaisTab] = useState('caracteristicas')

  // No mobile roda UM MainBox controlado. 'mais' mapeia pro sub-tab escolhido.
  const mobileMainTab = mobileSection === 'mais' ? maisTab : mobileSection
  // hideTablist esconde os botões de aba, então o único onTabChange que dispara
  // é o efeito de focusSpellId ('magias') — salta pra seção Magias.
  const handleMobileTabChange = (id) => { if (id === 'magias') setMobileSection('magias') }

  return (
    <div className="sheet-v2 min-h-screen" style={{ '--v2-accent': classAccentOf(character?.info?.class) }}>
      <DiceAccentSync />
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

        {/* ── Desktop (≥ lg): faixa + 3 colunas — IDÊNTICO à fase 3 ── */}
        <div className="hidden lg:block space-y-3">
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

        {/* ── Mobile (< lg): uma seção por vez, navegação na base ── */}
        <div className="lg:hidden" style={{ paddingBottom: 72 }}>
          {mobileSection === 'ficha' && (
            <div className="space-y-3">
              <AbilityStrip />
              <SavesPanel />
              <SensesPanel />
              <ProficienciesPanel />
              <SkillsPanel />
            </div>
          )}

          {mobileSection !== 'ficha' && (
            <div className="space-y-3">
              {mobileSection === 'mais' && (
                <>
                  <div role="tablist" aria-label="Mais" style={{ display: 'flex', gap: 6 }}>
                    {[['caracteristicas', 'Características'], ['notas', 'Notas']].map(([id, label]) => (
                      <button
                        key={id}
                        role="tab"
                        type="button"
                        className="v2-tab"
                        aria-selected={maisTab === id}
                        onClick={() => setMaisTab(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <MoreUtilities onExport={onExport} onPrint={onPrint} />
                </>
              )}
              <MainBox activeTab={mobileMainTab} onTabChange={handleMobileTabChange} hideTablist />
            </div>
          )}
        </div>
      </div>

      <BottomNav active={mobileSection} onChange={setMobileSection} />
    </div>
  )
}

/* Utilidades que o header compacto esconde no mobile (Exportar/Imprimir são
   prop-driven; Descansos/⚙/▲Nível seguem no header, que é compacto o bastante). */
function MoreUtilities({ onExport, onPrint }) {
  return (
    <div className="v2-panel">
      <div className="v2-title" style={{ margin: 0, marginBottom: 8 }}>Utilidades</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="v2-btn" onClick={onExport}>Exportar</button>
        <button type="button" className="v2-btn" onClick={onPrint}>Imprimir</button>
      </div>
    </div>
  )
}
