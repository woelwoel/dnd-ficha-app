import { useState, useMemo, useEffect } from 'react'
import { ABILITY_SCORES, SCHOOL_ABBR, SPELL_ABILITY_PT_TO_KEY, formatModifier, calculateSpellSaveDC, calculateSpellAttackBonus, getProficiencyBonus } from '../../utils/calculations'
import { abbrOfKey } from '../../domain/attributes'
import { getSpellcastingRules, getWarlockPactSlots, getClassSpellMath, getSpellSlots } from '../../utils/spellcasting'
import { useClassSpells } from '../../hooks/useClassSpells'
import { SpellDetailModal } from '../SpellDetailModal'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { Icon } from '../../../../components/ui/Icon'
import { useDiceRoller } from '../../../../hooks/useDiceRoller'
import { useLazySrdDataset } from '../../data/SrdProvider'
import { spellRollPlan } from '../../domain/spellMechanics'
import { executeCastPlan } from './castSpell'
import { buildEffectInstance } from '../../domain/activeEffects'
import {
  matchesFilters,
  EMPTY_FILTERS,
  countActiveFilters,
  SCHOOL_LABELS,
  CASTING_TIME_LABELS,
} from '../../utils/spellFilters'

export function Spells({ character, attributes, level, profBonus: profBonusProp, classData, onUpdateSpellcasting, onAddSpell, onRemoveSpell, onTogglePrepared, onToggleSlot, onSetConcentration, onSpendPactSlot, onRegainPactSlot, onApplyHealing, onAddActiveEffect, focusSpellId, onClearFocusSpell }) {
  const [activeTab, setActiveTab] = useState(0)
  // Sub-aba da LISTA da ficha (Truques / Nível N) — separado do `activeTab`,
  // que controla o nível navegado no catálogo/picker.
  const [spellView, setSpellView] = useState(0)
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [detailSpell, setDetailSpell] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [restoreSlotsOpen, setRestoreSlotsOpen] = useState(false)

  const classIndex   = character.info?.class || ''
  const classAbility = classData?.spellcasting_ability
    ? (SPELL_ABILITY_PT_TO_KEY[classData.spellcasting_ability] ?? null)
    : null
  const isSpellcaster = classAbility !== null
  const spellAbility  = character.spellcasting.ability ?? classAbility
  // Usa profBonus passado pelo pai (nível total); fallback calcula pelo nível total internamente
  const mcs        = useMemo(() => character.info?.multiclasses ?? [], [character.info?.multiclasses])
  const totalLevel = level + mcs.reduce((s, m) => s + (m.level ?? 0), 0)
  const profBonus  = profBonusProp ?? getProficiencyBonus(totalLevel)
  const abilityScore  = spellAbility ? attributes[spellAbility] : 10
  const spellSaveDC   = calculateSpellSaveDC(abilityScore, profBonus)
  const spellAttack   = calculateSpellAttackBonus(abilityScore, profBonus)

  const { roll } = useDiceRoller()
  const spellMechanics = useLazySrdDataset('spellMechanics')
  const spellMod = spellAbility ? Math.floor((abilityScore - 10) / 2) : 0

  // Criar efeito de conjuração PRÓPRIA também marca a concentração — âncora
  // da expiração automática (spec 2026-07-07 efeitos ativos).
  function applyEffect(instance, spell, effectDef) {
    onAddActiveEffect?.(instance)
    if (effectDef.concentration) onSetConcentration?.(spell)
  }

  /**
   * Conjurar = gastar o recurso E rolar o plano da magia (spec 2026-07-06).
   * Shift no clique = vantagem, Alt = desvantagem (só nos d20 de ataque).
   * Magias com `effect` curado (buff — spec 2026-07-07): alcance Pessoal
   * aplica direto; alcance não-Pessoal devolve `effectOffer` pro SpellRow
   * oferecer o prompt "✦ Aplicar em você?" (ex.: Escudo da Fé em terceiros).
   * Retorna { healTotal, effectOffer } pro SpellRow exibir os botões (ou null
   * se a magia não tem mecânica nem efeito).
   */
  function handleCast(spell, { slotLevel = null, pact = false, event = null } = {}) {
    if (pact) {
      if (!pactSlots) return null
      onSpendPactSlot?.(pactSlots.qty)
    } else if (slotLevel != null) {
      onToggleSlot?.(slotLevel, (usedSlots[slotLevel] || 0) + 1)
    }

    const mech = spellMechanics?.[spell.index]

    const effectDef = mech?.effect
    let effectOffer = null
    if (effectDef) {
      const instance = buildEffectInstance(spell, effectDef, 'cast')
      const isSelf = /^pessoal/i.test(String(spell.range ?? ''))
      if (isSelf) {
        applyEffect(instance, spell, effectDef)
      } else {
        effectOffer = { instance, spell, effectDef }
      }
    }

    if (!mech) return effectDef ? { healTotal: 0, effectOffer } : null
    const plan = spellRollPlan(spell, mech, {
      slotLevel: pact ? pactSlots.slotLevel : slotLevel,
      characterLevel: totalLevel,
      spellAttack,
      spellMod,
      spellDC: spellSaveDC,
    })
    if (!plan) return effectDef ? { healTotal: 0, effectOffer } : null
    const mode = event?.shiftKey ? 'adv' : event?.altKey ? 'dis' : undefined
    const result = executeCastPlan(plan.steps, roll, { mode })
    return { ...(result ?? {}), effectOffer }
  }

  const { classSpells, levelData, availableTabs } =
    useClassSpells(classIndex, level)

  const rules = useMemo(
    () => getSpellcastingRules(classIndex, level, attributes, levelData),
    [classIndex, level, attributes, levelData]
  )
  const { type: castType, spellsLimit, cantripsLimit, spellsLabel, spellbookSize, hasSpellbook } = rules

  const usedSlots   = character.spellcasting.usedSlots || {}
  const mySpells    = character.spellcasting.spells || []

  // Auto-abre o modal de detalhe quando o usuário navega aqui a partir de
  // PreparedSpellsList (que passa o id/index da magia via focusSpellId).
  // Aceita id (interno) OU index (SRD reference) — o que vier primeiro.
  useEffect(() => {
    if (!focusSpellId) return
    const match = mySpells.find(s => s.id === focusSpellId || s.index === focusSpellId)
    if (match) setDetailSpell(match)
    onClearFocusSpell?.()
    // Intencional: só dispara quando focusSpellId muda. mySpells/onClearFocusSpell
    // são lidos no momento da execução.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSpellId])
  const myCantrips  = mySpells.filter(s => s.level === 0)
  const myLeveled   = mySpells.filter(s => s.level > 0)
  // Níveis (incl. truque=0) que a ficha realmente tem — cada um vira uma sub-aba.
  const presentSpellLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(lvl => mySpells.some(s => s.level === lvl))
  // Aba ativa da lista; se a selecionada esvaziou (ex.: removeu a última magia
  // do nível), cai pra primeira disponível sem precisar de efeito.
  const activeSpellView = presentSpellLevels.includes(spellView) ? spellView : (presentSpellLevels[0] ?? 0)
  // Conta como "preparada" qualquer magia leveled cujo flag não seja false
  // (undefined ou true = preparada — assim toda magia antiga já é castável).
  const myPrepared  = myLeveled.filter(s => s.prepared !== false)
  // Magias sempre-preparadas (subclasse: domínio/juramento/círculo) NÃO
  // contam pro limite (PHB). Excluímos elas do contador.
  const myPreparedCount = myPrepared.filter(s => s.alwaysPrepared !== true).length
  const concentrating = character.combat?.concentrating ?? null

  const isPrepared    = castType === 'prepared'
  const isMagoStyle   = isPrepared && hasSpellbook      // só o Mago tem grimório
  // Limite que o picker respeita: grimório p/ Mago, preparedas p/ C/D/P, conhecidas p/ known
  const pickerLimit   = isMagoStyle ? spellbookSize : spellsLimit
  const pickerLabel   = isMagoStyle ? 'Grimório' : spellsLabel

  // Slots regulares — tabela unificada PHB p.165 (single ou multiclasse).
  // getSpellSlots ignora o nível de Bruxo (Pact Magic é separado), então
  // Bruxo primário + Mago MC mostra os slots do Mago aqui corretamente.
  const unifiedSlots = useMemo(
    () => getSpellSlots(classIndex, level, mcs, character.info?.chosenFeatures) ?? {},
    [classIndex, level, mcs, character.info?.chosenFeatures]
  )
  const unifiedSlotLevels = useMemo(
    () => Object.keys(unifiedSlots).map(Number).sort((a, b) => a - b),
    [unifiedSlots]
  )

  // Pact Magic do Bruxo (PHB p.107) — slots separados, recarregam em descanso curto.
  // Soma nível de bruxo primário + multiclasse.
  const warlockLevel = (classIndex === 'bruxo' ? level : 0)
    + mcs.filter(m => m?.class === 'bruxo').reduce((s, m) => s + (m.level ?? 0), 0)
  const pactSlots = warlockLevel > 0 ? getWarlockPactSlots(warlockLevel) : null
  const pactUsed  = character.spellcasting?.pactSlotsUsed ?? 0

  // Matemática mágica por classe (multiclasse híbrida — PHB p.164)
  const spellcastingClasses = [classIndex, ...mcs.map(m => m.class)]
    .filter(c => c && getSpellcastingRules(c, 1, attributes, null).type !== 'none')
  const spellMathByClass = spellcastingClasses.length > 1
    ? Object.fromEntries(
        spellcastingClasses.map(cls => [cls, getClassSpellMath(cls, profBonus, attributes)])
      )
    : null

  // Picker filtrado
  const filteredPicker = useMemo(() => {
    let base = classSpells.filter(s => s.level === activeTab)
    // Filtros estruturados (escola/ritual/concentração/componentes/tempo)
    base = base.filter(s => matchesFilters(s, filters))
    // Busca textual livre
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.school || '').toLowerCase().includes(q) ||
      (s.casting_time || '').toLowerCase().includes(q)
    )
  }, [classSpells, activeTab, search, filters])

  const mySpellIds = new Set(mySpells.map(s => s.index))

  function addSpell(spell) {
    if (mySpellIds.has(spell.index)) return
    // Mago: adicionar = escrever no grimório (não prepara automaticamente).
    // Clérigo/Druida/Paladino: adicionar = preparar diretamente.
    // Truques: o flag é ignorado, mas evitamos defini-lo.
    const preparedFlag = spell.level === 0
      ? undefined
      : (isMagoStyle ? false : true)
    onAddSpell({
      index: spell.index,
      name: spell.name,
      level: spell.level,
      school: spell.school?.name || spell.school || '',
      castingTime: spell.casting_time,
      range: spell.range,
      duration: spell.duration,
      concentration: spell.concentration,
      components: Array.isArray(spell.components) ? spell.components.join(', ') : (spell.components || ''),
      desc: spell.desc,
      higherLevel: spell.higher_level,
      ritual: spell.ritual || false,
      source: spell.source || 'PHB-PT',
      ...(preparedFlag !== undefined ? { prepared: preparedFlag } : {}),
    })
  }

  return (
    <div className="space-y-4">
      {/* Banner de concentração ativa (PHB p.203) — duplica o chip do
          SheetCombatBar mas com mais contexto (mensagem de regra completa
          + botão Romper labelado). Aparece só nesta aba. */}
      {concentrating?.spellIndex && (
        <div className="bg-blue-50 border-2 border-blue-600 rounded-sm px-4 py-2 flex items-center gap-3">
          <Icon name="target" size={18} strokeWidth={2} className="text-blue-700 shrink-0" />
          <span className="text-sm text-blue-900 flex-1">
            Concentrando em <strong>{concentrating.spellName}</strong>
            <span className="text-xs ink-italic text-blue-700 ml-2">
              · teste de Concentração ao sofrer dano (CD 10 ou metade do dano)
            </span>
          </span>
          <button
            onClick={() => onSetConcentration?.(null)}
            className="text-xs text-blue-700 hover:text-blue-900 px-2 py-1 rounded-sm border-2 border-blue-600 hover:bg-blue-100 font-display tracking-wide"
          >
            Romper
          </button>
        </div>
      )}

      {/* Stats de conjuração */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Conjuração</h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          {[
            { label: 'CD de Magia', value: spellAbility ? spellSaveDC : '—' },
            { label: 'Ataque', value: spellAbility ? formatModifier(spellAttack) : '—' },
            { label: 'Atributo', value: spellAbility ? abbrOfKey(spellAbility) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center bg-gray-900 rounded p-2">
              <span className="text-xs text-gray-400 mb-1">{label}</span>
              <span className="text-xl font-bold text-white">{value}</span>
            </div>
          ))}
        </div>

        {/* Contadores */}
        {isSpellcaster && (
          <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-3">
            {cantripsLimit != null && (
              <span>
                Truques: <span className={myCantrips.length > cantripsLimit ? 'text-red-400 font-bold' : 'text-amber-300 font-semibold'}>
                  {myCantrips.length}/{cantripsLimit}
                </span>
              </span>
            )}
            {/* Mago: dois contadores (Grimório + Preparadas) */}
            {isMagoStyle && spellbookSize != null && (
              <span>
                Grimório: <span className={myLeveled.length > spellbookSize ? 'text-red-400 font-bold' : 'text-amber-300 font-semibold'}>
                  {myLeveled.length}/{spellbookSize}
                </span>
              </span>
            )}
            {isPrepared && spellsLimit != null && (
              <span>
                Preparadas: <span className={myPreparedCount > spellsLimit ? 'text-red-400 font-bold' : myPreparedCount === spellsLimit ? 'text-green-400 font-semibold' : 'text-amber-300 font-semibold'}>
                  {myPreparedCount}/{spellsLimit}
                </span>
                {myPrepared.length > myPreparedCount && (
                  <span className="text-amber-500/70 italic ml-1">
                    (+{myPrepared.length - myPreparedCount} subclasse)
                  </span>
                )}
              </span>
            )}
            {/* Conhecidas (bardo/feiticeiro/bruxo/patrulheiro) — exclui alwaysPrepared do contador */}
            {!isPrepared && spellsLimit != null && (() => {
              const knownCount = myLeveled.filter(s => s.alwaysPrepared !== true).length
              const bonusCount = myLeveled.length - knownCount
              return (
                <span>
                  {spellsLabel}: <span className={knownCount > spellsLimit ? 'text-red-400 font-bold' : 'text-amber-300 font-semibold'}>
                    {knownCount}/{spellsLimit}
                  </span>
                  {bonusCount > 0 && (
                    <span className="text-amber-500/70 italic ml-1">
                      (+{bonusCount} subclasse)
                    </span>
                  )}
                </span>
              )
            })()}
            {isPrepared && (
              <span className="text-gray-600 italic">
                {isMagoStyle
                  ? 'Adicione magias ao grimório (custo: 50 po/nível, 2h por nível). Prepare ao terminar descanso longo.'
                  : `Preparadas = ${rules.ability.toUpperCase()} mod + nível · troque ao terminar descanso longo`}
              </span>
            )}
          </div>
        )}

        {/* Tracker de slots regulares (multiclasse unificada — PHB p.164) */}
        {unifiedSlotLevels.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Espaços de Magia</span>
              <button
                onClick={() => setRestoreSlotsOpen(true)}
                className="text-xs text-amber-600 hover:text-amber-400"
                title="Restaurar todos os espaços (sem afetar PV/HD)"
              >
                Restaurar espaços
              </button>
            </div>
            <div className="space-y-1.5">
              {unifiedSlotLevels.map(sl => {
                const max = unifiedSlots[sl]
                const used = usedSlots[sl] || 0
                return (
                  <div key={sl} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-14">Nível {sl}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: max }, (_, i) => {
                        const isUsed = i < used
                        return (
                          <button
                            key={i}
                            onClick={() => onToggleSlot(sl, isUsed ? used - 1 : used + 1)}
                            className={`w-5 h-5 rounded-full border-2 transition-colors ${isUsed ? 'bg-gray-700 border-gray-600' : 'bg-amber-400 border-amber-400'}`}
                            title={isUsed ? 'Recuperar espaço' : 'Gastar espaço'}
                          />
                        )
                      })}
                    </div>
                    <span className="text-xs text-gray-500">{max - used}/{max}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Pact Magic (Bruxo) — slots separados, recarregam em descanso curto */}
        {pactSlots && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-purple-300 uppercase tracking-wide font-semibold">
                Pact Magic <span className="text-gray-500 font-normal normal-case">(Bruxo Nv {warlockLevel} — desc. curto)</span>
              </span>
              <button
                onClick={() => onRegainPactSlot?.()}
                className="text-xs text-purple-400 hover:text-purple-300"
                title="Recuperar todos os Pact Slots"
              >
                Restaurar
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-14">Nv {pactSlots.slotLevel}</span>
              <div className="flex gap-1">
                {Array.from({ length: pactSlots.qty }, (_, i) => {
                  const isUsed = i < pactUsed
                  return (
                    <button
                      key={i}
                      onClick={() => isUsed
                        ? onRegainPactSlot?.()
                        : onSpendPactSlot?.(pactSlots.qty)
                      }
                      className={`w-5 h-5 rounded-full border-2 transition-colors ${
                        isUsed ? 'bg-gray-700 border-gray-600' : 'bg-purple-500 border-purple-400'
                      }`}
                      title={isUsed ? 'Recuperar Pact Slot' : 'Gastar Pact Slot'}
                    />
                  )
                })}
              </div>
              <span className="text-xs text-gray-500">{pactSlots.qty - pactUsed}/{pactSlots.qty}</span>
              <span className="text-xs text-purple-400/70 italic ml-auto">
                Sempre no nível mais alto disponível
              </span>
            </div>
          </div>
        )}

        {/* ── Matemática mágica por classe — multiclasse híbrida ── */}
        {spellMathByClass && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-amber-300 uppercase tracking-wide font-semibold mb-2">
              CD/Ataque por classe (multiclasse — PHB p.164)
            </p>
            <div className="space-y-1">
              {Object.entries(spellMathByClass).map(([cls, math]) => (
                <div key={cls} className="flex items-center gap-3 text-xs">
                  <span className="text-gray-300 capitalize w-20">{cls}</span>
                  <span className="text-gray-500">
                    CD <span className="text-amber-300 font-bold">{math.save}</span>
                  </span>
                  <span className="text-gray-500">
                    Ataque <span className="text-amber-300 font-bold">{formatModifier(math.attack)}</span>
                  </span>
                  <span className="text-gray-600 uppercase">({math.ability})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {classIndex && !isSpellcaster && !pactSlots && (
          <p className="text-xs text-gray-500">{classData?.name ?? classIndex} não possui conjuração.</p>
        )}
        {!classIndex && (
          <p className="text-xs text-gray-500">Selecione uma classe para ver espaços de magia.</p>
        )}
      </div>

      {/* Magias da ficha — sub-abas por nível/truque (sem scroll gigante) */}
      {presentSpellLevels.length > 0 && (
        <div className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
          <div role="tablist" aria-label="Magias por nível" className="flex overflow-x-auto border-b border-gray-700 bg-gray-900">
            {presentSpellLevels.map(lvl => {
              const count = mySpells.filter(s => s.level === lvl).length
              const label = lvl === 0 ? 'Truques' : `Nível ${lvl}`
              return (
                <button
                  key={lvl}
                  role="tab"
                  type="button"
                  aria-selected={activeSpellView === lvl}
                  onClick={() => setSpellView(lvl)}
                  className={`flex-shrink-0 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeSpellView === lvl
                      ? 'bg-amber-900/40 text-amber-300 border-b-2 border-amber-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {label}
                  <span className="ml-1.5 text-gray-500 font-normal">{count}</span>
                </button>
              )
            })}
          </div>
          <div className="p-4 space-y-2">
            {mySpells.filter(s => s.level === activeSpellView).map(spell => (
              <SpellRow
                key={spell.id}
                spell={spell}
                slotLevels={unifiedSlotLevels}
                slotMax={(slotLevel) => unifiedSlots[slotLevel] ?? 0}
                usedSlots={usedSlots}
                hasMechanics={!!spellMechanics?.[spell.index]}
                onCast={(opts) => handleCast(spell, opts)}
                pactOption={pactSlots ? { slotLevel: pactSlots.slotLevel, remaining: pactSlots.qty - pactUsed } : null}
                onApplyHealing={onApplyHealing}
                onApplyEffect={({ instance, spell: sp, effectDef }) => applyEffect(instance, sp, effectDef)}
                canCast={spell.level === 0 || (isPrepared ? spell.prepared !== false : true)}
                isPrepared={spell.level === 0 || spell.prepared !== false}
                showPreparedToggle={isPrepared && spell.level > 0 && !!onTogglePrepared && spell.alwaysPrepared !== true}
                onTogglePrepared={() => onTogglePrepared?.(spell.id)}
                isConcentrating={concentrating?.spellIndex === spell.index}
                canConcentrate={!!spell.concentration && !!onSetConcentration}
                onToggleConcentration={() =>
                  concentrating?.spellIndex === spell.index
                    ? onSetConcentration?.(null)
                    : onSetConcentration?.(spell)
                }
                onDetail={() => setDetailSpell(spell)}
                onRemove={spell.alwaysPrepared === true ? null : () => onRemoveSpell(spell.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Botão para abrir picker */}
      {isSpellcaster && (
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-full py-2.5 rounded-lg border-2 border-dashed border-gray-600 hover:border-amber-600 text-gray-500 hover:text-amber-400 text-sm font-medium transition-colors"
        >
          {pickerOpen
            ? '− Fechar catálogo'
            : isMagoStyle
              ? '+ Adicionar ao grimório'
              : isPrepared
                ? '+ Preparar magia'
                : '+ Adicionar magia'}
        </button>
      )}

      {/* Picker integrado */}
      {pickerOpen && isSpellcaster && (
        <SpellPicker
          tabs={availableTabs}
          activeTab={activeTab}
          onTabChange={t => { setActiveTab(t); setSearch('') }}
          search={search}
          onSearch={setSearch}
          spells={filteredPicker}
          mySpellIds={mySpellIds}
          onAdd={addSpell}
          onDetail={setDetailSpell}
          classIndex={classIndex}
          cantripsLimit={cantripsLimit}
          spellsLimit={pickerLimit}
          spellsLabel={pickerLabel}
          myCantripsCount={myCantrips.length}
          myLeveledCount={myLeveled.length}
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}

      {/* Modal de detalhes da magia */}
      {detailSpell && <SpellDetailModal spell={detailSpell} onClose={() => setDetailSpell(null)} />}

      <ConfirmDialog
        open={restoreSlotsOpen}
        title="Restaurar espaços?"
        message="Marca todos os espaços de magia como disponíveis novamente. Não altera PV nem Dados de Vida — use o Descanso Longo na aba Ficha pra resetar tudo."
        confirmLabel="Restaurar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          onUpdateSpellcasting('usedSlots', {})
          setRestoreSlotsOpen(false)
        }}
        onCancel={() => setRestoreSlotsOpen(false)}
      />
    </div>
  )
}

function SpellRow({ spell, onDetail, onRemove, isPrepared = true, showPreparedToggle, onTogglePrepared, isConcentrating, canConcentrate, onToggleConcentration, slotLevels = [], slotMax, usedSlots = {}, canCast = true, hasMechanics, onCast, pactOption, onApplyHealing, onApplyEffect }) {
  const schoolAbbr = SCHOOL_ABBR[(spell.school || '').toLowerCase()] || (spell.school || '').slice(0, 3)
  const dimmed = showPreparedToggle && !isPrepared
  const [castOpen, setCastOpen] = useState(false)
  const [castedAt, setCastedAt] = useState(null)
  const [pendingHeal, setPendingHeal] = useState(null)
  const [pendingEffect, setPendingEffect] = useState(null)
  // Slots disponíveis para esta magia: nível ≥ nível da magia E sobrando ≥ 1
  const availableSlots = spell.level > 0 && canCast
    ? slotLevels.filter(sl => sl >= spell.level && ((slotMax?.(sl) ?? 0) - (usedSlots[sl] || 0)) > 0)
    : []
  const pactAvailable = spell.level > 0 && canCast && pactOption
    && pactOption.remaining > 0 && pactOption.slotLevel >= spell.level

  function castAt(slotLevel, e, { pact = false } = {}) {
    const result = onCast?.({ slotLevel: pact ? null : slotLevel, pact, event: e })
    setCastOpen(false)
    setCastedAt(slotLevel)
    setTimeout(() => setCastedAt(null), 1800)
    if (result?.healTotal > 0) {
      setPendingHeal(result.healTotal)
      setTimeout(() => setPendingHeal(null), 10000)
    }
    if (result?.effectOffer) {
      setPendingEffect(result.effectOffer)
      setTimeout(() => setPendingEffect(null), 10000)
    }
  }

  return (
    <div className={`bg-gray-900 rounded-lg flex flex-col gap-1 px-3 py-2 hover:bg-gray-800 transition-colors ${isConcentrating ? 'ring-1 ring-blue-500/60' : ''} ${dimmed ? 'opacity-50' : ''}`}>
    <div className="flex items-center gap-2">
      {showPreparedToggle && (
        <button
          onClick={onTogglePrepared}
          title={isPrepared ? 'Despreparar (não conjurável)' : 'Preparar (conjurável hoje)'}
          aria-label={isPrepared ? 'Despreparar magia' : 'Preparar magia'}
          className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-base transition-colors ${
            isPrepared
              ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/30'
              : 'text-gray-600 hover:text-amber-400 hover:bg-gray-800'
          }`}
        >
          {isPrepared ? '★' : '☆'}
        </button>
      )}
      <button
        onClick={onDetail}
        className="text-sm font-medium text-white flex-1 text-left hover:text-amber-300 transition-colors"
      >
        {spell.alwaysPrepared && (
          <span
            className="text-amber-400 mr-1"
            title={spell.sourceLabel
              ? `${spell.sourceLabel} — sempre preparada (não conta no limite)`
              : 'Sempre preparada (subclasse)'}
          >
            ✦
          </span>
        )}
        {spell.name}
      </button>
      <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
        {spell.ritual && (
          <span className="text-green-700 inline-flex" title="Ritual">
            <Icon name="scroll" size={12} strokeWidth={2} />
          </span>
        )}
        {spell.concentration && (
          <span className="text-blue-700 inline-flex" title="Concentração">
            <Icon name="target" size={12} strokeWidth={2} />
          </span>
        )}
        <span className="text-gray-600">{schoolAbbr}</span>
        <span className="text-gray-600 text-xs">{spell.castingTime || ''}</span>
      </div>
      {canConcentrate && (
        <button
          onClick={onToggleConcentration}
          title={isConcentrating ? 'Romper concentração' : 'Concentrar (substitui a magia atual em concentração)'}
          className={`flex-shrink-0 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border transition-colors ${
            isConcentrating
              ? 'border-blue-500 bg-blue-900/30 text-blue-300'
              : 'border-gray-700 text-gray-500 hover:text-blue-300 hover:border-blue-700'
          }`}
        >
          <Icon name="target" size={11} strokeWidth={2} />
          {isConcentrating && <span>ativa</span>}
        </button>
      )}
      <button
        onClick={onDetail}
        className="text-gray-600 hover:text-amber-400 text-xs px-1 transition-colors flex-shrink-0"
        title="Ver descrição"
      >
        ℹ
      </button>
      {spell.level === 0 && hasMechanics && (
        <button
          onClick={(e) => onCast?.({ event: e })}
          title={'Rolar truque\nShift+click: vantagem · Alt+click: desvantagem'}
          aria-label={`Rolar ${spell.name}`}
          className="flex-shrink-0 inline-flex items-center justify-center text-xs px-1.5 py-1 rounded border transition-colors border-amber-700 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40"
        >
          <Icon name="bolt" size={12} strokeWidth={2} />
        </button>
      )}
      {spell.level > 0 && (
        <button
          onClick={() => (availableSlots.length > 0 || pactAvailable) && setCastOpen(v => !v)}
          disabled={!canCast || (availableSlots.length === 0 && !pactAvailable)}
          title={
            !canCast
              ? 'Magia não está preparada'
              : (availableSlots.length === 0 && !pactAvailable)
                ? 'Sem espaços disponíveis'
                : 'Conjurar (escolher nível do espaço)'
          }
          className={`flex-shrink-0 inline-flex items-center justify-center text-xs px-1.5 py-1 rounded border transition-colors ${
            (availableSlots.length > 0 || pactAvailable) && canCast
              ? 'border-amber-700 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
              : 'border-gray-700 text-gray-600 cursor-not-allowed'
          }`}
          aria-label="Conjurar"
        >
          <Icon name="bolt" size={12} strokeWidth={2} />
        </button>
      )}
      {castedAt && (
        <span className="flex-shrink-0 text-xs text-emerald-400 font-bold animate-pulse">
          ✓ Nv {castedAt}
        </span>
      )}
      {pendingHeal != null && (
        <button
          onClick={() => { onApplyHealing?.(pendingHeal); setPendingHeal(null) }}
          className="flex-shrink-0 text-xs px-2 py-0.5 rounded border font-bold transition-colors border-emerald-600 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
        >
          ✚ Aplicar {pendingHeal} PV
        </button>
      )}
      {pendingEffect != null && (
        <button
          onClick={() => { onApplyEffect?.(pendingEffect); setPendingEffect(null) }}
          className="flex-shrink-0 text-xs px-2 py-0.5 rounded border font-bold transition-colors border-amber-700 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40"
        >
          ✦ Aplicar em você?
        </button>
      )}
      {onRemove ? (
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-400 text-lg leading-none flex-shrink-0"
          aria-label="Remover magia"
        >
          ×
        </button>
      ) : (
        <span
          className="text-gray-700 leading-none flex-shrink-0 cursor-help inline-flex"
          title="Concedida pela subclasse — não pode ser removida"
          aria-label="Concedida pela subclasse"
        >
          <Icon name="lock" size={12} strokeWidth={2} />
        </span>
      )}
    </div>
    {castOpen && (availableSlots.length > 0 || pactAvailable) && (
      <div className="flex flex-wrap gap-1 mt-1 pt-1.5 border-t border-gray-700/60">
        <span className="text-xs text-gray-500 self-center mr-1">Conjurar em:</span>
        {availableSlots.map(sl => {
          const remaining = (slotMax?.(sl) ?? 0) - (usedSlots[sl] || 0)
          const isUpcast  = sl > spell.level
          return (
            <button
              key={sl}
              onClick={(e) => castAt(sl, e)}
              title={isUpcast ? `Espaço de nível ${sl} (efeito de nível superior)` : `Espaço de nível ${sl}`}
              className={`text-xs px-2 py-0.5 rounded border font-mono transition-colors ${
                isUpcast
                  ? 'border-amber-600 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
                  : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-amber-700'
              }`}
            >
              Nv {sl} ({remaining})
              {isUpcast && <span className="ml-0.5 text-amber-500">↑</span>}
            </button>
          )
        })}
        {pactAvailable && (
          <button
            onClick={(e) => castAt(pactOption.slotLevel, e, { pact: true })}
            title={`Pact Magic — espaço de nível ${pactOption.slotLevel} (recarrega em descanso curto)`}
            className="text-xs px-2 py-0.5 rounded border font-mono transition-colors border-purple-500 bg-purple-900/20 text-purple-300 hover:bg-purple-900/40"
          >
            Pacto Nv {pactOption.slotLevel} ({pactOption.remaining})
          </button>
        )}
        {spell.higherLevel && (
          <button
            onClick={onDetail}
            title="Ver efeito em nível superior"
            className="text-xs text-blue-400 hover:text-blue-300 underline self-center"
          >
            ver efeito ↑
          </button>
        )}
      </div>
    )}
    </div>
  )
}

function SpellPicker({
  tabs, activeTab, onTabChange,
  search, onSearch,
  spells, mySpellIds, onAdd, onDetail,
  cantripsLimit, spellsLimit, spellsLabel,
  myCantripsCount, myLeveledCount,
  filters, onFiltersChange,
}) {
  const atCantripLimit = cantripsLimit != null && myCantripsCount >= cantripsLimit && activeTab === 0
  const atSpellLimit   = spellsLimit   != null && myLeveledCount >= spellsLimit   && activeTab > 0
  const [panelOpen, setPanelOpen] = useState(false)
  const activeCount = countActiveFilters(filters ?? EMPTY_FILTERS)

  return (
    <div className="bg-gray-800 border border-amber-700/40 rounded-lg overflow-hidden">
      {/* Abas por nível */}
      <div className="flex overflow-x-auto border-b border-gray-700 bg-gray-900">
        {tabs.map(lvl => (
          <button
            key={lvl}
            onClick={() => onTabChange(lvl)}
            className={`flex-shrink-0 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === lvl
                ? 'bg-amber-900/40 text-amber-300 border-b-2 border-amber-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {lvl === 0 ? 'Truques' : `Nv ${lvl}`}
          </button>
        ))}
      </div>

      {/* Busca + Filtros */}
      <div className="p-3 border-b border-gray-700 space-y-2">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Buscar magia..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-600"
          />
          <button
            type="button"
            onClick={() => setPanelOpen(v => !v)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded border font-semibold transition-colors ${
              activeCount > 0
                ? 'border-amber-500 bg-amber-900/40 text-amber-200'
                : 'border-gray-600 text-gray-300 hover:border-gray-500'
            }`}
          >
            Filtros{activeCount > 0 ? ` · ${activeCount}` : ''}
          </button>
          <span className="text-[13px] text-gray-500 flex-shrink-0">
            {spells.length} magia{spells.length === 1 ? '' : 's'}
          </span>
        </div>

        {panelOpen && (
          <FilterPanel
            filters={filters ?? EMPTY_FILTERS}
            onChange={onFiltersChange}
          />
        )}

        {(atCantripLimit || atSpellLimit) && (
          <p className="text-xs text-amber-500 mt-1.5">
            ⚠ Limite atingido {activeTab === 0
              ? `(${myCantripsCount}/${cantripsLimit} truques)`
              : `(${myLeveledCount}/${spellsLimit} ${spellsLabel?.toLowerCase() ?? 'magias'})`}
            . Remova uma magia para adicionar outra.
          </p>
        )}
      </div>

      {/* Lista de magias */}
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-700/50">
        {spells.length === 0 && (
          <p className="text-xs text-gray-600 p-4 text-center">Nenhuma magia encontrada.</p>
        )}
        {spells.map(spell => {
          const alreadyHas = mySpellIds.has(spell.index)
          const blocked    = !alreadyHas && (atCantripLimit || atSpellLimit)
          const schoolAbbr = SCHOOL_ABBR[(spell.school || '').toLowerCase()] || ''
          return (
            <div
              key={spell.index}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${alreadyHas ? 'opacity-40' : blocked ? 'opacity-50' : 'hover:bg-gray-700/50'}`}
            >
              {/* Nome clicável → abre descrição */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onDetail(spell)}
                  className="text-left w-full"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-white hover:text-amber-300 transition-colors">{spell.name}</span>
                    {spell.ritual && (
                      <span className="text-green-700 inline-flex" title="Ritual">
                        <Icon name="scroll" size={11} strokeWidth={2} />
                      </span>
                    )}
                    {spell.concentration && (
                      <span className="text-blue-700 inline-flex" title="Concentração">
                        <Icon name="target" size={11} strokeWidth={2} />
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{schoolAbbr}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{spell.casting_time} · {spell.range}</div>
                </button>
              </div>
              {/* Botão info */}
              <button
                onClick={() => onDetail(spell)}
                className="flex-shrink-0 text-gray-600 hover:text-amber-400 text-xs px-1 transition-colors"
                title="Ver descrição"
              >
                ℹ
              </button>
              {/* Botão adicionar */}
              <button
                onClick={() => !alreadyHas && !blocked && onAdd(spell)}
                disabled={alreadyHas || blocked}
                className={`flex-shrink-0 text-xs px-2 py-1 rounded font-bold transition-colors ${
                  alreadyHas
                    ? 'text-gray-600 cursor-default'
                    : blocked
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/30'
                }`}
              >
                {alreadyHas ? '✓' : '+'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FilterPanel({ filters, onChange }) {
  function toggleSchool(school) {
    const next = new Set(filters.schools)
    if (next.has(school)) next.delete(school)
    else next.add(school)
    onChange({ ...filters, schools: next })
  }
  function toggleCastingTime(key) {
    const next = new Set(filters.castingTimes)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange({ ...filters, castingTimes: next })
  }
  function setComponent(letter, mode) {
    onChange({ ...filters, components: { ...filters.components, [letter]: mode } })
  }
  function reset() {
    onChange({
      schools: new Set(),
      concentration: 'any',
      ritual: 'any',
      components: { v: 'any', s: 'any', m: 'any' },
      castingTimes: new Set(),
    })
  }

  const chip = (active) =>
    `text-[13px] px-2 py-1 rounded border transition-colors ${
      active
        ? 'border-amber-500 bg-amber-900/40 text-amber-200'
        : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
    }`

  const selectCls = `text-[13px] bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-gray-200`

  return (
    <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 space-y-2.5">
      {/* Escolas */}
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Escolas</div>
        <div className="flex flex-wrap gap-1">
          {SCHOOL_LABELS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSchool(s)}
              className={chip(filters.schools.has(s))}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tempo de conjuração */}
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Tempo</div>
        <div className="flex flex-wrap gap-1">
          {CASTING_TIME_LABELS.map(ct => (
            <button
              key={ct.key}
              type="button"
              onClick={() => toggleCastingTime(ct.key)}
              className={chip(filters.castingTimes.has(ct.key))}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Componentes V/S/M */}
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Componentes</div>
        <div className="flex flex-wrap gap-3">
          {['v', 's', 'm'].map(letter => (
            <label key={letter} className="flex items-center gap-1.5 text-[13px] text-gray-300">
              <span className="font-semibold w-3">{letter.toUpperCase()}</span>
              <select
                value={filters.components[letter]}
                onChange={e => setComponent(letter, e.target.value)}
                className={selectCls}
              >
                <option value="any">qualquer</option>
                <option value="yes">com</option>
                <option value="no">sem</option>
              </select>
            </label>
          ))}
        </div>
      </div>

      {/* Outros */}
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Outros</div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-[13px] text-gray-300">
            <span>Concentração</span>
            <select
              value={filters.concentration}
              onChange={e => onChange({ ...filters, concentration: e.target.value })}
              className={selectCls}
            >
              <option value="any">qualquer</option>
              <option value="yes">sim</option>
              <option value="no">não</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[13px] text-gray-300">
            <span>Ritual</span>
            <select
              value={filters.ritual}
              onChange={e => onChange({ ...filters, ritual: e.target.value })}
              className={selectCls}
            >
              <option value="any">qualquer</option>
              <option value="yes">só ritual</option>
            </select>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-1 border-t border-gray-700/50">
        <button
          type="button"
          onClick={reset}
          className="text-[13px] text-gray-500 hover:text-amber-400 transition-colors"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  )
}
