import { useState, useEffect } from 'react'
import { ABILITY_SCORES, SKILLS, SCHOOL_ABBR, SPELL_ABILITY_PT_TO_KEY, getModifier, getProficiencyBonus, RACE_LANGUAGES, calculateSpellSaveDC, calculateSpellAttackBonus } from '../../utils/calculations'
import { fetchSrd } from '../../utils/fetchSrd'
import { LevelProgression } from './LevelProgression'

const KEY_ABBR = Object.fromEntries(ABILITY_SCORES.map(a => [a.key, a.abbr]))

/* ── Paleta de cores da ficha impressa ── */
// Usamos classes Tailwind com valores customizados via style quando necessário.
const P = {
  bg:       'bg-[#f2e8c8]',
  border:   'border-[#7a5c2a]',
  text:     'text-[#3a2108]',
  header:   'bg-[#c8a45a] border-[#7a5c2a]',
  section:  'bg-[#ede0ba] border-[#7a5c2a]',
  circle:   'bg-[#f2e8c8] border-[#7a5c2a]',
  dot:      { filled: '#3a2108', empty: '#c8b89a' },
}

/* ── Helpers ── */
function fmt(n) { return n >= 0 ? `+${n}` : `${n}` }

function SectionHeader({ children }) {
  return (
    <div className={`text-center text-[9px] font-black tracking-widest uppercase py-0.5 ${P.header} ${P.border} border-t border-x rounded-t`}>
      {children}
    </div>
  )
}
function Box({ label, children, className = '' }) {
  return (
    <div className={`${P.border} border rounded ${className}`}>
      {label && <SectionHeader>{label}</SectionHeader>}
      <div className={`${P.section} ${P.border} border-b border-x rounded-b p-1`}>
        {children}
      </div>
    </div>
  )
}

function Dot({ filled }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-[#7a5c2a] shrink-0"
      style={{ background: filled ? P.dot.filled : P.dot.empty }}
    />
  )
}

function InfoField({ label, value }) {
  return (
    <div className={`border-b-2 ${P.border} text-center`}>
      <div className={`text-[9px] font-black uppercase tracking-wide ${P.text} mt-0.5`}>{label}</div>
      <div className={`text-[10px] font-semibold ${P.text} min-h-[18px] leading-tight py-0.5 break-words hyphens-auto`}>{value || ''}</div>
    </div>
  )
}

/* ── Caixa de atributo (círculo grande + score + nome) ── */
function AttributeBox({ name, score }) {
  const mod = getModifier(score)
  return (
    <div className="flex flex-col items-center">
      {/* Círculo do modificador */}
      <div className={`w-10 h-10 rounded-full border-2 ${P.border} ${P.circle} flex items-center justify-center`}>
        <span className={`text-base font-black ${P.text} leading-none`}>{fmt(mod)}</span>
      </div>
      {/* Score */}
      <div className={`-mt-1 w-8 h-6 border-2 ${P.border} ${P.section} rounded flex items-center justify-center`}>
        <span className={`text-xs font-bold ${P.text}`}>{score}</span>
      </div>
      {/* Label */}
      <span className={`text-[8px] font-black uppercase tracking-wide ${P.text} mt-0.5 text-center leading-tight`}>
        {name}
      </span>
    </div>
  )
}

/* ── Linha de Salvaguarda / Perícia ── */
function CheckRow({ proficient, label, value, subLabel }) {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <Dot filled={proficient} />
      <span className={`text-[10px] font-bold ${P.text} w-5 text-right shrink-0`}>{fmt(value)}</span>
      <span className={`text-[9px] ${P.text} leading-tight min-w-0`}>
        {label}
        {subLabel && <span className="text-[8px] opacity-60 ml-0.5">({subLabel})</span>}
      </span>
    </div>
  )
}

/* ── Linha de ataque ── */
function AttackRow({ name, bonus, damage, type }) {
  return (
    <div className={`grid gap-1 text-[9px] border-b ${P.border} py-0.5`}
         style={{ gridTemplateColumns: '2fr 1fr 2fr' }}>
      <span className={P.text}>{name}</span>
      <span className={`text-center font-bold ${P.text}`}>{bonus}</span>
      <span className={P.text}>{damage}{type ? ` ${type}` : ''}</span>
    </div>
  )
}

/* ── Moedas ── */
function Coins({ currency }) {
  const coins = [
    { key: 'pp', label: 'PP' }, { key: 'gp', label: 'PO' },
    { key: 'ep', label: 'PE' }, { key: 'sp', label: 'PP' }, { key: 'cp', label: 'PC' },
  ]
  return (
    <div className="flex flex-col gap-0.5">
      {coins.map(c => (
        <div key={c.key} className={`flex items-center gap-0.5 border ${P.border} rounded px-1 py-0.5 ${P.section}`}>
          <span className={`text-[8px] font-black ${P.text} w-4`}>{c.label}</span>
          <span className={`text-[9px] font-bold ${P.text}`}>{currency?.[c.key] ?? 0}</span>
        </div>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   Componente principal
   ════════════════════════════════════════════════════════════ */
export function CharacterView({
  character, races, classes, backgrounds,
  classData, onApplyLevelUp, onLevelChange, onAddMulticlass, onRemoveMulticlass, onChosenFeaturesChange, onNavigateToSpells,
  allowMulticlass = true,
  allowFeats = false,
}) {
  const [subTab, setSubTab] = useState('ficha')
  const [classChoices, setClassChoices] = useState({})

  useEffect(() => {
    fetchSrd('phb-class-choices-pt.json').then(setClassChoices).catch(() => {})
  }, [])

  const { info, attributes, combat, proficiencies, spellcasting, inventory, traits } = character
  const totalLevel = info.level + (info.multiclasses ?? []).reduce((s, m) => s + (m.level ?? 0), 0)
  const prof = getProficiencyBonus(totalLevel)

  const selectedRace    = races.find(r => r.index === info.race)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === info.subrace)
  const selectedClass   = classes.find(c => c.index === info.class)
  const selectedBg      = backgrounds.find(b => b.index === info.background)

  // Nome da raça exibido: "Elfo — Alto Elfo" quando há sub-raça
  const raceName = selectedRace
    ? (selectedSubrace ? `${selectedRace.name} — ${selectedSubrace.name}` : selectedRace.name)
    : ''

  // Perícias ordenadas alfabeticamente
  const sortedSkills = [...SKILLS].sort((a, b) => a.name.localeCompare(b.name, 'pt'))

  // Salvaguardas como CheckRows
  const saves = ABILITY_SCORES.map(({ key, name }) => ({
    key, name,
    isProficient: proficiencies.savingThrows?.includes(key),
    value: getModifier(attributes[key]) + (proficiencies.savingThrows?.includes(key) ? prof : 0),
  }))

  // Percepção passiva
  const wisMod = getModifier(attributes.wis)
  const _bgSkills  = proficiencies.backgroundSkills ?? []
  const percProf  = proficiencies.skills?.includes('perception')
    || _bgSkills.includes('perception')
    || _bgSkills.includes('Percepção')
  const passivePerception = 10 + wisMod + (percProf ? prof : 0)

  // Ataques: usar magias + itens como armas
  const weaponItems = inventory.items?.filter(i => i.weight || i.damage || i.damage_dice) || []
  const attackSpells = spellcasting.spells?.filter(s => s.attack_type) || []

  return (
    <div>
      {/* Mini-tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-700 pb-2">
        {[['ficha', 'Ficha Completa'], ['levelup', 'Upar Nível de Classe']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-4 py-1.5 rounded-t text-sm font-semibold transition-colors ${
              subTab === id
                ? 'bg-amber-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mini-tab: Upar Nível de Classe */}
      {subTab === 'levelup' && (
        <LevelProgression
          character={character}
          classData={classData}
          classes={classes}
          onLevelChange={onLevelChange}
          onApplyLevelUp={onApplyLevelUp}
          onAddMulticlass={onAddMulticlass}
          onRemoveMulticlass={onRemoveMulticlass}
          onChosenFeaturesChange={onChosenFeaturesChange}
          onNavigateToSpells={onNavigateToSpells}
          allowMulticlass={allowMulticlass}
          allowFeats={allowFeats}
        />
      )}

      {/* Mini-tab: Ficha Completa */}
      {subTab === 'ficha' && (
    <div id="print-character-view" className="overflow-x-auto"><div style={{ minWidth: '560px' }}>
    <div
      className={`${P.bg} ${P.text} text-[10px] font-serif p-2 rounded-lg`}
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
    >
      {/* ── CABEÇALHO ── */}
      <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: '90px 1fr' }}>
        {/* Logo D&D */}
        <div className="flex flex-col items-center justify-center">
          <span
            className="font-black text-[11px] leading-none text-center"
            style={{ color: '#8b1a1a', fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}
          >
            DUNGEONS<br />
            <span style={{ fontSize: '14px' }}>&amp;</span><br />
            DRAGONS
          </span>
          <div className={`mt-1 w-full text-center text-[8px] font-bold border ${P.border} ${P.section} rounded px-1`}>
            {info.name || 'Personagem'}
          </div>
        </div>

        {/* Campos de info */}
        <div className="grid gap-x-2 gap-y-1" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <InfoField label="Classe" value={(() => {
            if (!selectedClass) return ''
            const multiclasses = info.multiclasses ?? []
            if (!multiclasses.length) return selectedClass.name
            const total = info.level + multiclasses.reduce((s, m) => s + (m.level ?? 0), 0)
            const parts = multiclasses.map(m => {
              const mc = classes.find(c => c.index === m.class)
              return `${mc?.name ?? m.class} ${m.level}`
            }).join(' / ')
            return `${selectedClass.name} ${info.level} / ${parts} (Nv ${total})`
          })()} />
          <InfoField label="Antecedente" value={selectedBg?.name} />
          <InfoField label="Nome Jogador" value={info.playerName} />
          <InfoField label="Raça" value={raceName} />
          <InfoField label="Tendência" value={info.alignment} />
          <div className="flex gap-1">
            <InfoField label="Experiência" value={info.xp?.toLocaleString('pt-BR')} />
            <div className={`flex flex-col items-center justify-center border-2 ${P.border} rounded px-2 ${P.header} shrink-0`}>
              <span className="text-[8px] font-black uppercase">Nível</span>
              <span className="text-xl font-black leading-none">
                {info.level + (info.multiclasses ?? []).reduce((s, m) => s + (m.level ?? 0), 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Características de Classe escolhidas */}
        {info.class && (() => {
          const choices = classChoices[info.class]?.choices ?? []
          const chosen = info.chosenFeatures ?? {}
          const filled = choices.filter(c => c.level <= info.level && chosen[c.id])
          if (!filled.length) return null
          return (
            <div className={`mt-1 px-2 py-1 border ${P.border} rounded text-[8px] flex flex-wrap gap-x-3 gap-y-0.5`}>
              {filled.map(c => {
                const opt = c.options.find(o => o.value === chosen[c.id])
                return (
                  <span key={c.id} className="text-[#5c3d11]">
                    <span className="font-bold">{c.featureName}:</span> {opt?.name ?? chosen[c.id]}
                  </span>
                )
              })}
            </div>
          )
        })()}

        {/* Talentos adquiridos */}
        {(info.feats ?? []).length > 0 && (
          <div className={`mt-1 px-2 py-1 border ${P.border} rounded text-[8px] flex flex-wrap gap-x-3 gap-y-0.5`}>
            <span className="font-black text-[#5c3d11] w-full">Talentos:</span>
            {info.feats.map(f => (
              <span key={f.index} className="text-[#5c3d11]">🌟 {f.name}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── CORPO PRINCIPAL: 3 colunas ── */}
      <div className="grid gap-1" style={{ gridTemplateColumns: '80px 1fr 1fr' }}>

        {/* ═══ COL 1: Atributos ═══ */}
        <div className="flex flex-col gap-1">
          {/* Inspiração + Bônus Prof */}
          <div className={`border ${P.border} rounded ${P.section} p-1 space-y-1`}>
            <div className="flex items-center gap-1">
              <Dot filled={false} />
              <span className="text-[8px] font-black uppercase">Inspiração</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded-full border-2 ${P.border} ${P.circle} flex items-center justify-center`}>
                <span className="text-[9px] font-black">+{prof}</span>
              </div>
              <span className="text-[8px] font-black uppercase leading-tight">Bônus de Proficiência</span>
            </div>
          </div>

          {/* 6 atributos */}
          {ABILITY_SCORES.map(({ key, name }) => (
            <AttributeBox key={key} name={name} score={attributes[key]} />
          ))}

          {/* Percepção Passiva */}
          <div className={`border ${P.border} rounded ${P.section} p-1 text-center`}>
            <div className={`w-8 h-8 rounded-full border-2 ${P.border} ${P.circle} mx-auto flex items-center justify-center`}>
              <span className="text-sm font-black">{passivePerception}</span>
            </div>
            <div className="text-[7px] font-black uppercase leading-tight mt-0.5">Sabedoria Passiva (Percepção)</div>
          </div>

          {/* Idiomas e proficiências */}
          <Box label="Idiomas e Outras Proficiências" className="flex-1">
            <div className="min-h-[60px] text-[8px] leading-tight space-y-0.5">
              {proficiencies.armor?.length > 0 && <div><b>Armaduras:</b> {proficiencies.armor.join(', ')}</div>}
              {proficiencies.weapons?.length > 0 && <div><b>Armas:</b> {proficiencies.weapons.join(', ')}</div>}
              {proficiencies.tools?.length > 0 && <div><b>Ferramentas:</b> {proficiencies.tools.join(', ')}</div>}
              {(() => {
                const raceLangs = RACE_LANGUAGES[character.info?.race] ?? []
                const allLangs = [...new Set([...raceLangs, ...(proficiencies.languages ?? [])])]
                return allLangs.length > 0 ? <div><b>Idiomas:</b> {allLangs.join(', ')}</div> : null
              })()}
              {selectedBg?.skill_proficiencies?.length > 0 && (
                <div><b>Perícias:</b> {selectedBg.skill_proficiencies.join(', ')}</div>
              )}
            </div>
          </Box>
        </div>

        {/* ═══ COL 2: Saves + Skills + Combate ═══ */}
        <div className="flex flex-col gap-1">

          {/* Testes de Resistência */}
          <Box label="Testes de Resistência">
            {saves.map(s => (
              <CheckRow key={s.key} proficient={s.isProficient} label={s.name} value={s.value} />
            ))}
          </Box>

          {/* Perícias */}
          <Box label="Perícias" className="flex-1">
            {(() => {
              const bgSkills = proficiencies.backgroundSkills ?? []
              return sortedSkills.map(skill => {
                const isProficient = proficiencies.skills?.includes(skill.key)
                  || bgSkills.includes(skill.key)   // formato novo: chave inglesa
                  || bgSkills.includes(skill.name)  // formato antigo: nome PT-BR
                const val = getModifier(attributes[skill.ability]) + (isProficient ? prof : 0)
                return (
                  <CheckRow key={skill.key} proficient={isProficient}
                    label={skill.name} value={val} subLabel={skill.abbr} />
                )
              })
            })()}
          </Box>
        </div>

        {/* ═══ COL 3: Combate + HP + Ataques + Equipamento + Personalidade ═══ */}
        <div className="flex flex-col gap-1">

          {/* CA / Iniciativa / Deslocamento */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'Classe Armadura', value: (() => {
                const dex = getModifier(attributes.dex)
                let unarmoredAC = 10 + dex
                if (character.info?.class === 'barbaro') unarmoredAC += getModifier(attributes.con)
                if (character.info?.class === 'monge')   unarmoredAC += getModifier(attributes.wis)
                return Math.max(combat.armorClass ?? 0, unarmoredAC)
              })() },
              { label: 'Iniciativa', value: fmt(getModifier(attributes.dex)) },
              { label: 'Deslocamento', value: `${combat.speed}ft` },
            ].map(({ label, value }) => (
              <div key={label} className={`border-2 ${P.border} rounded text-center ${P.section} py-1`}>
                <div className="text-base font-black leading-none">{value}</div>
                <div className="text-[7px] font-black uppercase leading-tight mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Pontos de Vida */}
          <Box label="Pontos de Vida Atuais">
            <div className="flex justify-between items-end">
              <span className="text-xl font-black">{combat.currentHp}</span>
              <span className="text-[8px] text-right">
                <span className="font-bold">PV Totais: </span>{combat.maxHp}
              </span>
            </div>
          </Box>

          {/* PV Temporários */}
          <Box label="Pontos de Vida Temporários">
            <div className="text-xl font-black">{combat.tempHp || '—'}</div>
          </Box>

          {/* Dados de Vida + Testes contra a Morte */}
          <div className="grid grid-cols-2 gap-1">
            <Box label="Dados de Vida">
              <div className="font-bold">{combat.hitDice}</div>
            </Box>
            <Box label="Testes contra a Morte">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-bold w-12">Sucessos</span>
                  <div className="flex gap-0.5">
                    {[0,1,2].map(i => <Dot key={i} filled={combat.deathSaves?.successes > i} />)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-bold w-12">Fracassos</span>
                  <div className="flex gap-0.5">
                    {[0,1,2].map(i => <Dot key={i} filled={combat.deathSaves?.failures > i} />)}
                  </div>
                </div>
              </div>
            </Box>
          </div>

          {/* Ataques e Magias */}
          <Box label="Ataques e Magias">
            <div className={`grid gap-1 text-[8px] font-black border-b ${P.border} pb-0.5 mb-0.5`}
                 style={{ gridTemplateColumns: '2fr 1fr 2fr' }}>
              <span>NOME</span><span className="text-center">BÔNUS</span><span>DANO/TIPO</span>
            </div>
            {weaponItems.slice(0,3).map((item, i) => (
              <AttackRow key={i} name={item.name} bonus="+" damage={item.damage_dice || item.damage || '—'} />
            ))}
            {attackSpells.slice(0, Math.max(0, 5 - weaponItems.length)).map((sp, i) => (
              <AttackRow key={`sp-${i}`} name={sp.name}
                bonus={`+${getModifier(attributes[spellcasting.ability === 'INT' ? 'int' : spellcasting.ability === 'SAB' ? 'wis' : 'cha']) + prof}`}
                damage="Veja desc." />
            ))}
            {/* Linhas em branco */}
            {Array.from({ length: Math.max(0, 5 - weaponItems.length - attackSpells.length) }).map((_, i) => (
              <AttackRow key={`blank-${i}`} name="" bonus="" damage="" />
            ))}
          </Box>

          {/* Equipamentos */}
          <div className="flex gap-1 flex-1">
            <Box label="Equipamentos" className="flex-1">
              <div className="min-h-[80px] space-y-0.5">
                {inventory.items?.slice(0, 12).map(item => (
                  <div key={item.id} className="flex justify-between text-[9px]">
                    <span>{item.name}</span>
                    {item.quantity > 1 && <span className="text-[8px] opacity-60">×{item.quantity}</span>}
                  </div>
                ))}
                {(inventory.items?.length || 0) > 12 && (
                  <div className="text-[8px] opacity-60">+{inventory.items.length - 12} itens...</div>
                )}
              </div>
            </Box>
            {/* Moedas */}
            <Coins currency={inventory.currency} />
          </div>

          {/* ── Personalidade (direita-baixo) ── */}
          <Box label="Traços de Personalidade">
            <p className="min-h-[36px] text-[9px] leading-tight whitespace-pre-wrap">{traits.personalityTraits || ''}</p>
          </Box>
          <Box label="Ideais">
            <p className="min-h-[28px] text-[9px] leading-tight whitespace-pre-wrap">{traits.ideals || ''}</p>
          </Box>
          <Box label="Ligações">
            <p className="min-h-[28px] text-[9px] leading-tight whitespace-pre-wrap">{traits.bonds || ''}</p>
          </Box>
          <Box label="Defeitos">
            <p className="min-h-[28px] text-[9px] leading-tight whitespace-pre-wrap">{traits.flaws || ''}</p>
          </Box>
          <Box label="Características e Habilidades" className="flex-1">
            <p className="min-h-[60px] text-[9px] leading-tight whitespace-pre-wrap">{traits.featuresAndTraits || ''}</p>
          </Box>
        </div>
      </div>

      {/* ── Notas de campanha (linha inferior, se existir) ── */}
      {traits.notes && (
        <div className="mt-1">
          <Box label="Notas de Campanha">
            <p className="text-[9px] leading-tight whitespace-pre-wrap">{traits.notes}</p>
          </Box>
        </div>
      )}

      {/* ── PÁGINA DE MAGIAS (só se houver magias ou classe conjuradora) ── */}
      <SpellsPage character={character} selectedClass={selectedClass} attributes={attributes} prof={prof} />
    </div>
    </div></div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   Página de Magias
   ════════════════════════════════════════════════════════════ */
function SpellsPage({ character, selectedClass, attributes, prof }) {
  const { spellcasting } = character
  const spells = spellcasting?.spells ?? []

  const spellAbilityName = selectedClass?.spellcasting_ability
  const spellAbilityKey  = spellAbilityName ? (SPELL_ABILITY_PT_TO_KEY[spellAbilityName] ?? null) : null
  const isSpellcaster    = !!spellAbilityKey
  const hasSpells        = spells.length > 0

  if (!isSpellcaster && !hasSpells) return null

  const abilityScore = spellAbilityKey ? (attributes[spellAbilityKey] ?? 10) : 10
  const spellSaveDC  = calculateSpellSaveDC(abilityScore, prof)
  const spellAttack  = calculateSpellAttackBonus(abilityScore, prof)

  // Agrupar por nível
  const levels = [0,1,2,3,4,5,6,7,8,9]
  const grouped = levels.map(l => ({ level: l, list: spells.filter(s => s.level === l) }))
                        .filter(g => g.list.length > 0)

  // Slots de magia a partir do personagem (usedSlots guarda os usados)
  // Precisamos dos máximos — vamos inferir da classe + nível via character
  // (a CharacterView não tem acesso ao SRD-Levels, então usamos o tracker existente)

  return (
    <div className={`mt-2 border-t-4 ${P.border} pt-2`}>
      {/* Cabeçalho da página de magias */}
      <div className={`text-center text-[10px] font-black tracking-widest uppercase py-1 ${P.header} ${P.border} border rounded mb-1`}>
        ✦ Magias ✦
      </div>

      {/* Stats de conjuração */}
      {spellAbilityKey && (
        <div className="grid grid-cols-3 gap-1 mb-2">
          {[
            { label: 'Habilidade de Magia', value: KEY_ABBR[spellAbilityKey] },
            { label: 'CD de Magia', value: spellSaveDC },
            { label: 'Bônus de Ataque', value: fmt(spellAttack) },
          ].map(({ label, value }) => (
            <div key={label} className={`border-2 ${P.border} rounded text-center ${P.section} py-1`}>
              <div className="text-sm font-black leading-none">{value}</div>
              <div className="text-[7px] font-black uppercase leading-tight mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de magias agrupadas */}
      {grouped.length === 0 ? (
        <div className={`${P.section} ${P.border} border rounded p-2 text-center text-[9px] ${P.text} opacity-60`}>
          Nenhuma magia registrada
        </div>
      ) : (
        <div className="space-y-1">
          {grouped.map(({ level, list }) => (
            <div key={level}>
              <SectionHeader>{level === 0 ? 'Truques' : `Magias de ${level}º Nível`}</SectionHeader>
              <div className={`${P.section} ${P.border} border-b border-x rounded-b`}>
                {/* Cabeçalho da tabela */}
                <div className={`grid gap-1 text-[7px] font-black uppercase border-b ${P.border} px-1 py-0.5`}
                     style={{ gridTemplateColumns: '2fr 40px 60px 60px 40px' }}>
                  <span>Nome</span>
                  <span>Esc.</span>
                  <span>Tempo</span>
                  <span>Alcance</span>
                  <span>Badges</span>
                </div>
                {list.map(spell => {
                  const school = SCHOOL_ABBR[(spell.school || '').toLowerCase()] || (spell.school || '').slice(0,3)
                  return (
                    <div key={spell.id ?? spell.index}
                         className={`grid gap-1 text-[8px] border-b ${P.border} last:border-b-0 px-1 py-0.5 items-center`}
                         style={{ gridTemplateColumns: '2fr 40px 60px 60px 40px' }}>
                      <span className={`font-semibold ${P.text} leading-tight`}>{spell.name}</span>
                      <span className={`${P.text} opacity-70`}>{school}</span>
                      <span className={`${P.text} opacity-70 leading-tight`}>{(spell.castingTime || spell.casting_time || '').replace('ação', 'ação')}</span>
                      <span className={`${P.text} opacity-70`}>{spell.range || ''}</span>
                      <span className="flex gap-0.5">
                        {spell.ritual && <span className="text-green-700 text-[8px]">📿</span>}
                        {spell.concentration && <span className="text-blue-700 text-[8px]">⊙</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
