# Magias de Talento — Plano 2: Pickers + gating + retrofit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o jogador ESCOLHER as magias que o talento concede — no wizard, no level-up e (retrofit) numa ficha já salva.

**Architecture:** Um componente `FeatSpellPicker` auto-contido (lê o SRD sozinho, consome só o motor `featSpells.js` do plano 1) renderizado inline pelos DOIS pickers de talento que já existem. O gating reaproveita `isASIChoiceComplete`/`useBlockStatus`, que já travam o wizard sem o `featChosenAttr`. O retrofit é um botão na aba Habilidades que abre o MESMO componente num modal e chama `injectFeatSpells` (já pronto do plano 1).

**Tech Stack:** React + Vite, Vitest + Testing Library, Playwright (prova visual), dados SRD em `public/srd-data/*.json`.

**Spec:** `docs/superpowers/specs/2026-07-15-magias-de-talento-design.md` — §4 (UI), §5 (injeção), §6 (retrofit). **A spec é a fonte da verdade.**

**Plano 1 (MERGEADO, `7e39c60`):** `src/systems/dnd5e/domain/featSpells.js` já exporta tudo que este plano consome. **LEIA O ARQUIVO INTEIRO ANTES DE COMEÇAR.**

---

## Contexto essencial (não re-derive isto)

**O bug do dono:** Humano Variante com "Tocado pelas Fadas". O ASI funciona; a magia não existe. Hoje ele não consegue escolher a magia de 1º círculo de adivinhação/encantamento, e a ficha dele (já salva) não tem nem o Passo Nebuloso. **A Task 5 deste plano é o que conserta a ficha dele.**

**Estado em produção agora:** os 5 talentos de magia FIXA (Telepático, Telecinético, Teleporte das Fadas, Alta Magia Drow, Magia do Elfo da Floresta) já injetam ponta a ponta na criação e no level-up. Tocado pelas Fadas/Sombras injetam só a fixa. Os 4 de escolha pura (Iniciado em Magia, Conjurador de Ritual, Atirador de Magia, Iniciado Artífice) não injetam nada — é este plano que os liga.

**Invariantes do motor (custaram review pra descobrir — respeite):**
- `featGrant` é o índice **ABSOLUTO** em `def.grants`. `spellChoices.picks[ordinal]` é o ordinal **entre os `choose`**. Divergem no Tocado pelas Fadas (a fixa vem antes). **`getChooseGrants(featIndex)` → `[{grantIdx, ordinal, choose, grant}]` é o ÚNICO lugar que computa o ordinal — sempre use ele, nunca conte à mão.**
- `resolveFeatSpellOptions(featIndex, grantIdx, {list, srdSpells, spellMechanics})` usa `grantIdx` **absoluto** e **LANÇA** se o grant tem `attack: true` e `spellMechanics` não veio. O dataset é `lazy` no SrdProvider → o picker precisa esperar carregar antes de chamar.
- `isFeatSpellChoiceComplete(featIndex, spellChoices)` → `true` se o talento não concede magia; exige `list` quando há `pickList`; exige `picks[ordinal].length === count` **estrito** (over-pick também é incompleto).
- `injectFeatSpells(character, srdSpells)` é idempotente e retorna o **MESMO objeto** quando nada muda.

**Decisão deliberada — sem filtro por fonte nas magias.** `useClassSpells` (o picker de magia que já existe na ficha) usa `useSrd().spells` sem filtrar por fonte ativa. O `FeatSpellPicker` faz igual. Não invente uma regra nova aqui.

---

## Estrutura de arquivos

| Arquivo | Papel |
|---|---|
| Create `src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker.jsx` | O picker. Auto-contido: lê `useSrd()`/`useLazySrdDataset` sozinho; call sites passam só `featIndex`/`value`/`onChange` |
| Create `src/test/dnd5e/FeatSpellPicker.test.jsx` | Testes de componente do picker |
| Modify `src/systems/dnd5e/domain/featSpells.js` | + `getPendingFeatSpells(character)` (alimenta o retrofit) |
| Modify `src/test/dnd5e/featSpells.test.js` | Testes do `getPendingFeatSpells` |
| Modify `src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatPicker.jsx` | Renderiza o picker inline (wizard) |
| Modify `src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js` | `isASIChoiceComplete` passa a exigir a escolha de magia |
| Modify `src/systems/dnd5e/components/CharacterSheet/levelProgression/FeatPicker.jsx` | Renderiza o picker inline (level-up) |
| Modify `src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx` | Estado + gating + `featSpellChoices` no patch |
| Modify `src/systems/dnd5e/hooks/useCharacter.js` | + updater `setFeatSpellChoices` |
| Modify `src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx` | Aviso + botão de retrofit na seção Talentos |
| Modify `src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx` | Passa o updater novo (v1) |
| Modify `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx` | Passa o updater novo (v2) |
| Modify `src/systems/dnd5e/components/CharacterSheet/Spells.jsx` | Fix de `key` (magia injetada não tem `id`) |

**Convenções do repo:** comentários e commits em pt-BR (identificadores em inglês); **SEM ponto-e-vírgula no fim das linhas**; commits prefixados `@ ` e terminando com o trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; PowerShell no Windows (dois `-m` funcionam). Os arquivos que você tocar devem ficar **eslint-limpos** (o repo tem ~611 erros pré-existentes como débito — se um arquivo que você toca já tem erros, confirme via `git stash` que precedem você e diga isso; não conserte os alheios, não adicione novos).

**Sem bump de SW:** nenhum JSON de `public/srd-data` muda neste plano.

---

### Task 0: Branch

- [ ] **Step 1: Criar o branch**

```bash
git checkout -b feat/magias-talento-p2
```

---

### Task 1: FeatSpellPicker — magias fixas + escolha por escola

**Files:**
- Create: `src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker.jsx`
- Test: `src/test/dnd5e/FeatSpellPicker.test.jsx`

Esta task entrega o caminho do **Tocado pelas Fadas** (fixa + 1 escolha por escola, sem `pickList`). A Task 2 acrescenta o seletor de classe.

- [ ] **Step 1: Escrever os testes que falham**

Siga o padrão de `src/test/dnd5e/feat-spell-math-badge.test.jsx` (já existe, do plano 1) pro setup do provider. Criar `src/test/dnd5e/FeatSpellPicker.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { FeatSpellPicker } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker'

function renderPicker(props) {
  return render(
    <SrdProvider>
      <FeatSpellPicker {...props} />
    </SrdProvider>
  )
}

describe('FeatSpellPicker — talento sem pickList (Tocado pelas Fadas)', () => {
  it('talento sem concessão de magia não renderiza nada', () => {
    const { container } = renderPicker({ featIndex: 'robusto', value: null, onChange: () => {} })
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra a magia fixa como chip read-only', async () => {
    renderPicker({ featIndex: 'tocado-pelas-fadas', value: null, onChange: () => {} })
    expect(await screen.findByText(/Passo Nebuloso/)).toBeInTheDocument()
  })

  it('lista as 21 candidatas de 1º círculo de adivinhação/encantamento', async () => {
    renderPicker({ featIndex: 'tocado-pelas-fadas', value: null, onChange: () => {} })
    // Enfeitiçar Pessoa é encantamento de 1º — está na lista
    expect(await screen.findByRole('button', { name: /Enfeitiçar Pessoa/ })).toBeInTheDocument()
    // Bola de Fogo (evocação de 3º) NÃO está
    expect(screen.queryByRole('button', { name: /Bola de Fogo/ })).not.toBeInTheDocument()
  })

  it('clicar numa magia emite picks no ordinal certo (0, não o grantIdx 1)', async () => {
    const onChange = vi.fn()
    renderPicker({ featIndex: 'tocado-pelas-fadas', value: null, onChange })
    await userEvent.click(await screen.findByRole('button', { name: /Enfeitiçar Pessoa/ }))
    expect(onChange).toHaveBeenCalledWith({ list: null, picks: [['enfeiticar-pessoa']] })
  })

  it('clicar de novo desmarca', async () => {
    const onChange = vi.fn()
    renderPicker({
      featIndex: 'tocado-pelas-fadas',
      value: { list: null, picks: [['enfeiticar-pessoa']] },
      onChange,
    })
    await userEvent.click(await screen.findByRole('button', { name: /Enfeitiçar Pessoa/ }))
    expect(onChange).toHaveBeenCalledWith({ list: null, picks: [[]] })
  })

  it('contador mostra o progresso e trava no limite', async () => {
    const onChange = vi.fn()
    renderPicker({
      featIndex: 'tocado-pelas-fadas',
      value: { list: null, picks: [['enfeiticar-pessoa']] },
      onChange,
    })
    expect(await screen.findByText('1 / 1')).toBeInTheDocument()
    // count=1 já satisfeito: clicar em OUTRA magia não substitui nem adiciona
    await userEvent.click(screen.getByRole('button', { name: /Comando/ }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('magia escolhida fica marcada (aria-pressed)', async () => {
    renderPicker({
      featIndex: 'tocado-pelas-fadas',
      value: { list: null, picks: [['enfeiticar-pessoa']] },
      onChange: () => {},
    })
    const btn = await screen.findByRole('button', { name: /Enfeitiçar Pessoa/ })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('busca filtra a lista', async () => {
    renderPicker({ featIndex: 'tocado-pelas-fadas', value: null, onChange: () => {} })
    await screen.findByRole('button', { name: /Enfeitiçar Pessoa/ })
    await userEvent.type(screen.getByPlaceholderText(/Buscar/), 'enfeit')
    expect(screen.getByRole('button', { name: /Enfeitiçar Pessoa/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Comando/ })).not.toBeInTheDocument()
  })

  it('Tocado pelas Sombras: fixa Invisibilidade + ilusão/necromancia', async () => {
    renderPicker({ featIndex: 'tocado-pelas-sombras', value: null, onChange: () => {} })
    expect(await screen.findByText(/Invisibilidade/)).toBeInTheDocument()
    // Causar Medo é necromancia de 1º
    expect(screen.getByRole('button', { name: /Causar Medo/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enfeitiçar Pessoa/ })).not.toBeInTheDocument()
  })

  it('Alta Magia Drow: 3 fixas, nenhum bloco de escolha', async () => {
    renderPicker({ featIndex: 'alta-magia-drow', value: null, onChange: () => {} })
    expect(await screen.findByText(/Detectar Magia/)).toBeInTheDocument()
    expect(screen.getByText(/Levitação/)).toBeInTheDocument()
    expect(screen.getByText(/Dissipar Magia/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Buscar/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/FeatSpellPicker.test.jsx`
Expected: FAIL — `Failed to resolve import ".../FeatSpellPicker"`

- [ ] **Step 3: Implementar o componente**

Criar `src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker.jsx`:

```jsx
import { useState } from 'react'
import { useSrd, useLazySrdDataset } from '../../../data/SrdProvider'
import {
  getFeatSpellDef, getChooseGrants, resolveFeatSpellOptions,
} from '../../../domain/featSpells'

/**
 * Escolha das magias que um TALENTO concede (spec 2026-07-15 §4).
 *
 * Auto-contido de propósito: lê o catálogo do SRD sozinho, então os dois call
 * sites (wizard e level-up) passam só `featIndex`/`value`/`onChange`. Sem
 * filtro por fonte ativa — `useClassSpells` (o picker de magia que já existe
 * na ficha) também usa o catálogo inteiro; não inventamos regra nova aqui.
 *
 * Props:
 *  - featIndex: índice do talento (sem declaração → não renderiza nada)
 *  - value: { list, picks } | null — a forma persistida em info.feats[].spellChoices
 *  - onChange(next): mesma forma de `value`
 */

// `picks[ordinal]` alinha com o i-ésimo grant `choose`, NÃO com a posição
// absoluta em `grants` — getChooseGrants faz a ponte entre os dois índices.
const SCHOOL_LABEL = {
  'adivinhação': 'Adivinhação', 'encantamento': 'Encantamento',
  'ilusão': 'Ilusão', 'necromancia': 'Necromancia',
}

function grantLabel(choose) {
  const plural = choose.count > 1
  const what = choose.level === 0
    ? (plural ? 'truques' : 'truque')
    : (plural ? `magias de ${choose.level}º círculo` : `magia de ${choose.level}º círculo`)
  const quals = []
  if (choose.schools) {
    quals.push(`de ${choose.schools.map(s => SCHOOL_LABEL[s] ?? s).join(' ou ')}`)
  }
  if (choose.ritual) quals.push('com descritor ritual')
  if (choose.attack) quals.push('com jogada de ataque')
  return `Escolha ${choose.count} ${what}${quals.length ? ` ${quals.join(', ')}` : ''}`
}

export function FeatSpellPicker({ featIndex, value = null, onChange }) {
  const { spells: srdSpells } = useSrd()
  const spellMechanics = useLazySrdDataset('spellMechanics')
  const [search, setSearch] = useState({})   // ordinal → termo de busca

  const def = getFeatSpellDef(featIndex)
  if (!def) return null

  const fixed = (def.grants ?? [])
    .filter(g => g.fixed)
    .map(g => srdSpells?.find(s => s.index === g.fixed))
    .filter(Boolean)
  const chooseGrants = getChooseGrants(featIndex)

  function togglePick(ordinal, spellIndex, count) {
    const cur = value?.picks?.[ordinal] ?? []
    const next = cur.includes(spellIndex)
      ? cur.filter(i => i !== spellIndex)
      : cur.length < count ? [...cur, spellIndex] : null
    if (next === null) return   // limite atingido: clique em magia nova é no-op
    // Preenche buracos: picks[1] sem picks[0] viraria array esparso (que o
    // JSON serializa como null).
    const picks = [...(value?.picks ?? [])]
    while (picks.length <= ordinal) picks.push([])
    picks[ordinal] = next
    onChange({ list: value?.list ?? null, picks })
  }

  return (
    <div className="flex flex-col gap-2">
      {fixed.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-display tracking-widest uppercase text-ink-500">
            Magias concedidas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {fixed.map(s => (
              <span
                key={s.index}
                className="px-2 py-0.5 rounded-sm border-2 border-parchment-600 bg-parchment-100 text-[13px] text-ink-500"
              >
                ✓ {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {chooseGrants.map(({ grantIdx, ordinal, choose }) => {
        const picks = value?.picks?.[ordinal] ?? []
        // `spellMechanics` é lazy: chamar resolveFeatSpellOptions sem ele num
        // grant `attack` LANÇA (contrato do motor — lista vazia silenciosa
        // seria indistinguível de "nenhuma opção"). Espera carregar.
        if (choose.attack && !spellMechanics) {
          return (
            <p key={grantIdx} className="text-xs text-ink-300 italic">
              Carregando mecânicas das magias...
            </p>
          )
        }
        const options = resolveFeatSpellOptions(featIndex, grantIdx, {
          list: value?.list ?? null, srdSpells, spellMechanics,
        })
        const term = (search[ordinal] ?? '').toLowerCase()
        const shown = term
          ? options.filter(s => s.name.toLowerCase().includes(term))
          : options
        const done = picks.length === choose.count

        return (
          <div key={grantIdx} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs font-display text-ink-500">
                {grantLabel(choose)} <span className="text-red-700">*</span>
              </p>
              <span className={[
                'text-[13px] font-display tabular-nums',
                done ? 'text-emerald-700' : 'text-amber-700',
              ].join(' ')}>
                {picks.length} / {choose.count}
              </span>
            </div>

            <input
              type="text"
              placeholder="Buscar magia..."
              value={search[ordinal] ?? ''}
              onChange={e => setSearch(prev => ({ ...prev, [ordinal]: e.target.value }))}
              className="w-full px-2.5 py-1 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
            />

            <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-0.5">
              {shown.length === 0 && (
                <p className="text-xs text-ink-200 italic text-center py-3">
                  Nenhuma magia encontrada.
                </p>
              )}
              {shown.map(s => {
                const isSel = picks.includes(s.index)
                // Sem vaga e não selecionada → desabilita, deixando claro que
                // é preciso desmarcar antes de trocar.
                const isFull = !isSel && picks.length >= choose.count
                return (
                  <button
                    key={s.index}
                    type="button"
                    onClick={() => togglePick(ordinal, s.index, choose.count)}
                    disabled={isFull}
                    aria-pressed={isSel}
                    className={[
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-sm border-2 text-xs text-left transition-colors',
                      isSel
                        ? 'border-ink-500 bg-parchment-200 text-ink-500'
                        : isFull
                          ? 'border-parchment-600 bg-parchment-50 text-ink-200 cursor-not-allowed'
                          : 'border-parchment-600 bg-parchment-50 text-ink-500 hover:border-ink-300',
                    ].join(' ')}
                  >
                    <span className={[
                      'w-3 h-3 rounded-sm border-2 shrink-0',
                      isSel ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                    ].join(' ')} aria-hidden />
                    <span className="flex-1 min-w-0 font-display">{s.name}</span>
                    <span className="shrink-0 text-[13px] text-ink-300 italic">{s.school}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/FeatSpellPicker.test.jsx`
Expected: PASS (10 testes)

Se o teste da contagem falhar porque o catálogo mudou, NÃO relaxe o teste — investigue: `resolveFeatSpellOptions` tem guard-rail de contagem próprio no plano 1 (`featSpells.test.js` afirma 21 e 9).

- [ ] **Step 5: Lint**

Run: `npx eslint src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker.jsx src/test/dnd5e/FeatSpellPicker.test.jsx`
Expected: exit 0, sem saída

- [ ] **Step 6: MUTATION CHECK (obrigatório)**

Todo task do plano 1 embarcou pelo menos um predicado sem cobertura que só a mutação pegou. Quebre cada um, rode, confirme que ≥1 teste FALHA, restaure:
  a) `togglePick` usa `grantIdx` em vez de `ordinal` no `picks[...]` — deve falhar o teste do ordinal (esta é a armadilha do índice duplo)
  b) `cur.length < count ? ... : null` → sempre adiciona — deve falhar o teste do limite
  c) remove o `.filter(g => g.fixed)` dos chips (mostra todos os grants) — deve falhar algum teste de chip
  d) `aria-pressed={isSel}` → `aria-pressed={false}` — deve falhar o teste de marcação

Reporte quais estão pinados. Se algum sobreviver, ADICIONE teste antes de commitar.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker.jsx src/test/dnd5e/FeatSpellPicker.test.jsx
git commit -m "@ feat(feat-spells): FeatSpellPicker (fixas + escolha por escola)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: FeatSpellPicker — seletor de classe (pickList)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker.jsx`
- Test: `src/test/dnd5e/FeatSpellPicker.test.jsx`

Liga os 4 talentos que exigem escolher a classe antes das magias.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao FINAL de `src/test/dnd5e/FeatSpellPicker.test.jsx` (dentro do mesmo arquivo, novo `describe`):

```jsx
describe('FeatSpellPicker — talento com pickList (Iniciado em Magia)', () => {
  it('sem lista escolhida: mostra os botões de classe e nenhuma lista de magia', async () => {
    renderPicker({ featIndex: 'iniciado-em-magia', value: null, onChange: () => {} })
    expect(await screen.findByRole('button', { name: 'Mago' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clérigo' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Buscar magia/)).not.toBeInTheDocument()
  })

  it('escolher a classe emite list e zera picks', async () => {
    const onChange = vi.fn()
    renderPicker({
      featIndex: 'iniciado-em-magia',
      value: { list: 'clerigo', picks: [['luz'], ['comando']] },
      onChange,
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Mago' }))
    // Trocar de lista invalida as magias — elas eram da lista antiga.
    expect(onChange).toHaveBeenCalledWith({ list: 'mago', picks: [] })
  })

  it('com lista escolhida: mostra os 2 blocos (2 truques + 1 magia de 1º)', async () => {
    renderPicker({ featIndex: 'iniciado-em-magia', value: { list: 'mago', picks: [] }, onChange: () => {} })
    expect(await screen.findByText(/Escolha 2 truques/)).toBeInTheDocument()
    expect(screen.getByText(/Escolha 1 magia de 1º círculo/)).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText(/Buscar magia/)).toHaveLength(2)
  })

  it('as magias ofertadas são da lista escolhida', async () => {
    renderPicker({ featIndex: 'iniciado-em-magia', value: { list: 'mago', picks: [] }, onChange: () => {} })
    // Raio de Fogo é truque de mago
    expect(await screen.findByRole('button', { name: /Raio de Fogo/ })).toBeInTheDocument()
    // Chama Sagrada é truque de clérigo — não pode aparecer
    expect(screen.queryByRole('button', { name: /Chama Sagrada/ })).not.toBeInTheDocument()
  })

  it('classe escolhida fica marcada', async () => {
    renderPicker({ featIndex: 'iniciado-em-magia', value: { list: 'mago', picks: [] }, onChange: () => {} })
    expect(await screen.findByRole('button', { name: 'Mago' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Clérigo' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('o pick do 2º bloco cai no ordinal 1', async () => {
    const onChange = vi.fn()
    renderPicker({
      featIndex: 'iniciado-em-magia',
      value: { list: 'mago', picks: [['luz', 'raio-de-fogo']] },
      onChange,
    })
    await userEvent.click(await screen.findByRole('button', { name: /Escudo Arcano/ }))
    expect(onChange).toHaveBeenCalledWith({
      list: 'mago', picks: [['luz', 'raio-de-fogo'], ['escudo-arcano']],
    })
  })

  it('Atirador de Magia: só as 4 listas com truque de ataque', async () => {
    renderPicker({ featIndex: 'atirador-de-magia', value: null, onChange: () => {} })
    expect(await screen.findByRole('button', { name: 'Bruxo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Druida' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Feiticeiro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mago' })).toBeInTheDocument()
    // Bardo e clérigo não têm truque de ataque no catálogo — oferecê-los seria
    // um beco sem saída (o gate nunca completaria).
    expect(screen.queryByRole('button', { name: 'Bardo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clérigo' })).not.toBeInTheDocument()
  })

  it('Atirador de Magia + bruxo: só truques de ataque do bruxo', async () => {
    renderPicker({ featIndex: 'atirador-de-magia', value: { list: 'bruxo', picks: [] }, onChange: () => {} })
    expect(await screen.findByRole('button', { name: /Rajada Mística/ })).toBeInTheDocument()
    // Prestidigitação é truque, mas não tem jogada de ataque
    expect(screen.queryByRole('button', { name: /Prestidigitação/ })).not.toBeInTheDocument()
  })

  it('Conjurador de Ritual + mago: só rituais de 1º', async () => {
    renderPicker({ featIndex: 'conjurador-de-ritual', value: { list: 'mago', picks: [] }, onChange: () => {} })
    expect(await screen.findByText(/Escolha 2 magias de 1º círculo com descritor ritual/)).toBeInTheDocument()
    // Detectar Magia é ritual de 1º na lista do mago
    expect(screen.getByRole('button', { name: /Detectar Magia/ })).toBeInTheDocument()
    // Mísseis Mágicos é de 1º mas NÃO é ritual
    expect(screen.queryByRole('button', { name: /Mísseis Mágicos/ })).not.toBeInTheDocument()
  })

  it('Iniciado Artífice: list fixa, SEM botões de classe', async () => {
    renderPicker({ featIndex: 'iniciado-artifice', value: null, onChange: () => {} })
    // A lista é fixa na declaração (`list: 'artifice'`), não há pickList
    expect(await screen.findByText(/Escolha 1 truque/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mago' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/FeatSpellPicker.test.jsx`
Expected: FAIL — os testes de `pickList` falham (nenhum botão de classe é renderizado)

- [ ] **Step 3: Implementar**

Em `src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker.jsx`:

(a) Acrescentar o rótulo das listas logo abaixo de `SCHOOL_LABEL`:

```jsx
const LIST_LABEL = {
  bardo: 'Bardo', bruxo: 'Bruxo', clerigo: 'Clérigo',
  druida: 'Druida', feiticeiro: 'Feiticeiro', mago: 'Mago', artifice: 'Artífice',
}
```

(b) Dentro do componente, logo após `const chooseGrants = getChooseGrants(featIndex)`:

```jsx
  function selectList(list) {
    // Trocar de lista INVALIDA as escolhas: as magias eram da lista antiga.
    onChange({ list, picks: [] })
  }
```

(c) No JSX, ENTRE o bloco `{fixed.length > 0 && (...)}` e o `{chooseGrants.map(...)}`, inserir:

```jsx
      {def.pickList && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-display text-ink-500">
            Escolha a lista de magias <span className="text-red-700">*</span>
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {def.pickList.map(list => {
              const isSel = value?.list === list
              return (
                <button
                  key={list}
                  type="button"
                  onClick={() => selectList(list)}
                  aria-pressed={isSel}
                  className={[
                    'px-2.5 py-1 text-[13px] rounded-sm border-2 font-display transition-colors',
                    isSel
                      ? 'border-ink-500 bg-parchment-200 text-ink-500'
                      : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
                  ].join(' ')}
                >
                  {LIST_LABEL[list] ?? list}
                </button>
              )
            })}
          </div>
        </div>
      )}
```

(d) No `chooseGrants.map`, logo APÓS a guarda do `spellMechanics` e ANTES do `resolveFeatSpellOptions`, inserir a guarda da lista:

```jsx
        // Sem lista escolhida, resolveFeatSpellOptions devolve [] — não
        // renderiza um bloco de busca vazio e sem sentido.
        if (choose.fromList && !value?.list) return null
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/FeatSpellPicker.test.jsx`
Expected: PASS (20 testes: 10 da Task 1 + 10 desta)

- [ ] **Step 5: Lint**

Run: `npx eslint src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker.jsx src/test/dnd5e/FeatSpellPicker.test.jsx`
Expected: exit 0

- [ ] **Step 6: MUTATION CHECK (obrigatório)**

  a) `selectList` preserva os picks (`onChange({ list, picks: value?.picks ?? [] })`) — deve falhar o teste do zera-picks
  b) remove a guarda `if (choose.fromList && !value?.list) return null` — deve falhar o "nenhuma lista de magia"
  c) `aria-pressed={isSel}` nos botões de classe → hardcode `false` — deve falhar o teste de marcação

Reporte quais estão pinados.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatSpellPicker.jsx src/test/dnd5e/FeatSpellPicker.test.jsx
git commit -m "@ feat(feat-spells): seletor de lista de classe no FeatSpellPicker" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Wizard — picker inline + gating

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatPicker.jsx`
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js:27-40`
- Test: `src/test/wizardV2-class-helpers.test.js` (já existe — ACRESCENTE)
- Test: `src/test/wizardV2-FeatPicker.test.jsx` (já existe — ACRESCENTE)

O `useBlockStatus` do bloco Raça já chama `isASIChoiceComplete(draft.racialFeat ? { type: 'feat', ...draft.racialFeat } : null)` — o gate flui automaticamente quando `isASIChoiceComplete` passar a checar a magia. **Não mexa no `useBlockStatus`.**

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar em `src/test/wizardV2-class-helpers.test.js` (o import de `isASIChoiceComplete` já existe no arquivo):

```js
describe('isASIChoiceComplete — talento que concede magia', () => {
  const FEY = {
    type: 'feat', featIndex: 'tocado-pelas-fadas', featName: 'Tocado pelas Fadas',
    featAttrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 }, featChosenAttr: 'cha',
  }

  it('atributo escolhido mas magia pendente → incompleto', () => {
    expect(isASIChoiceComplete(FEY)).toBe(false)
  })

  it('atributo + magia escolhidos → completo', () => {
    expect(isASIChoiceComplete({
      ...FEY, featSpellChoices: { list: null, picks: [['enfeiticar-pessoa']] },
    })).toBe(true)
  })

  it('magia escolhida mas atributo pendente → incompleto', () => {
    expect(isASIChoiceComplete({
      ...FEY, featChosenAttr: null,
      featSpellChoices: { list: null, picks: [['enfeiticar-pessoa']] },
    })).toBe(false)
  })

  it('Iniciado em Magia exige lista + os dois blocos', () => {
    const base = { type: 'feat', featIndex: 'iniciado-em-magia', featName: 'Iniciado em Magia' }
    expect(isASIChoiceComplete(base)).toBe(false)
    expect(isASIChoiceComplete({ ...base, featSpellChoices: { list: 'mago', picks: [['luz'], ['escudo-arcano']] } })).toBe(false)
    expect(isASIChoiceComplete({ ...base, featSpellChoices: { list: 'mago', picks: [['luz', 'raio-de-fogo'], ['escudo-arcano']] } })).toBe(true)
  })

  it('talento sem magia continua completo só com o atributo (Robusto)', () => {
    expect(isASIChoiceComplete({ type: 'feat', featIndex: 'robusto', featName: 'Robusto' })).toBe(true)
  })
})
```

Acrescentar em `src/test/wizardV2-FeatPicker.test.jsx`:

```jsx
  it('talento com magia renderiza o FeatSpellPicker inline', async () => {
    const feats = [{
      index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', prereq: null, desc: 'Fadas.',
      attrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 },
    }]
    render(
      <SrdProvider>
        <FeatPicker
          feats={feats}
          value={{ featIndex: 'tocado-pelas-fadas', featName: 'Tocado pelas Fadas',
                   featAttrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 }, featChosenAttr: 'cha' }}
          onChange={() => {}}
        />
      </SrdProvider>
    )
    expect(await screen.findByText(/Magias concedidas/)).toBeInTheDocument()
    expect(screen.getByText(/Passo Nebuloso/)).toBeInTheDocument()
  })

  it('trocar de talento descarta as magias do talento anterior', async () => {
    const onChange = vi.fn()
    const feats = [
      { index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', prereq: null, desc: 'A',
        attrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 } },
      { index: 'robusto', name: 'Robusto', prereq: null, desc: 'B' },
    ]
    render(
      <SrdProvider>
        <FeatPicker
          feats={feats}
          value={{ featIndex: 'tocado-pelas-fadas', featName: 'Tocado pelas Fadas',
                   featAttrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 }, featChosenAttr: 'cha',
                   featSpellChoices: { list: null, picks: [['enfeiticar-pessoa']] } }}
          onChange={onChange}
        />
      </SrdProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: /^Selecionar Robusto$/i }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ featIndex: 'robusto' }))
    expect(onChange.mock.calls[0][0].featSpellChoices).toBeUndefined()
  })
```

O arquivo pode precisar dos imports `SrdProvider`, `vi` e `userEvent` — acrescente aos que já existem, sem criar import duplicado do mesmo módulo.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/wizardV2-class-helpers.test.js src/test/wizardV2-FeatPicker.test.jsx`
Expected: FAIL — os testes novos falham

- [ ] **Step 3: `isASIChoiceComplete` passa a exigir a magia**

Em `src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js`:

(a) Import no topo, junto do que já existe:

```js
import { isFeatSpellChoiceComplete } from '../../../domain/featSpells'
```

(b) Substituir o branch `feat` de `isASIChoiceComplete` (linhas ~33-38):

```js
  if (choice.type === 'feat') {
    if (!choice.featIndex) return false
    const choices = choice.featAttrBonus?.choices ?? []
    if (choices.length > 1 && !choice.featChosenAttr) return false
    // Talento que concede magia só está pronto com a magia escolhida — sem
    // isso o wizard deixaria avançar com a concessão pendente, que é o bug
    // de UX que originou este projeto.
    return isFeatSpellChoiceComplete(choice.featIndex, choice.featSpellChoices)
  }
```

- [ ] **Step 4: Renderizar o picker no FeatPicker do wizard**

Em `src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatPicker.jsx`:

(a) Imports no topo, junto dos existentes:

```js
import { FeatSpellPicker } from './FeatSpellPicker'
import { getFeatSpellDef } from '../../../domain/featSpells'
```

(b) `selectFeat` já reconstrói o objeto do zero, então `featSpellChoices` morre ao trocar de talento — comportamento correto. Documente a intenção acrescentando o comentário logo acima do `onChange` dentro de `selectFeat`:

```js
    // Reconstrói do zero: trocar de talento descarta `featSpellChoices` do
    // anterior (as magias eram daquele talento).
    onChange({
```

(c) No JSX, DEPOIS do bloco `{value?.featAttrBonus && ... }` (a sub-escolha de atributo, que termina por volta da linha 189) e ANTES do `</div>` final do componente, inserir:

```jsx
      {value?.featIndex && getFeatSpellDef(value.featIndex) && (
        <div className="mt-1 pt-2 border-t-2 border-parchment-600/50">
          <FeatSpellPicker
            featIndex={value.featIndex}
            value={value.featSpellChoices ?? null}
            onChange={sc => onChange({ ...value, featSpellChoices: sc })}
          />
        </div>
      )}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/test/wizardV2-class-helpers.test.js src/test/wizardV2-FeatPicker.test.jsx src/test/wizardV2-useBlockStatus.test.js src/test/wizardV2-RaceBlock.test.jsx src/test/wizardV2-ASIOrFeatPicker.test.jsx`
Expected: PASS

**Se algum teste PRÉ-EXISTENTE quebrar**, provavelmente é um fixture que usava um talento com magia e agora fica incompleto. Isso é a mudança de gate FUNCIONANDO. Conserte o fixture (troque pra `robusto`, ou acrescente `featSpellChoices` completo) — NÃO relaxe o `isASIChoiceComplete`. Reporte qual teste e o que fez.

- [ ] **Step 6: Lint**

Run: `npx eslint src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatPicker.jsx src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js src/test/wizardV2-class-helpers.test.js src/test/wizardV2-FeatPicker.test.jsx`
Expected: exit 0

- [ ] **Step 7: MUTATION CHECK (obrigatório)**

  a) `isASIChoiceComplete` volta a `return true` no fim do branch feat — deve falhar o "magia pendente → incompleto"
  b) a guarda `getFeatSpellDef(value.featIndex) &&` some do render — reporte se algum teste pega (provavelmente não; diga isso plainly em vez de inventar teste)

- [ ] **Step 8: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatPicker.jsx src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js src/test/wizardV2-class-helpers.test.js src/test/wizardV2-FeatPicker.test.jsx
git commit -m "@ feat(feat-spells): picker inline + gating no wizard" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Level-up — picker inline + gating + patch

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/levelProgression/FeatPicker.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx`
- Test: `src/test/dnd5e/levelup-FeatPicker-race.test.jsx` (já existe — ACRESCENTE)

**Importante:** este `FeatPicker` é OUTRO componente, com API diferente do wizard (recebe `selectedFeatIdx`/`setSelectedFeatIdx` em vez de `value`/`onChange`).

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar em `src/test/dnd5e/levelup-FeatPicker-race.test.jsx`:

```jsx
describe('FeatPicker do level-up — magias do talento', () => {
  const feats = [{
    index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', prereq: null, desc: 'Fadas.',
    attrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 },
  }]
  const baseProps = {
    feats, attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 },
    featSearch: '', setFeatSearch: () => {},
    selectedFeatIdx: 0, setSelectedFeatIdx: () => {},
    featChosenAttr: 'cha', setFeatChosenAttr: () => {},
    onFeatInfo: () => {},
  }

  it('renderiza o FeatSpellPicker quando o talento concede magia', async () => {
    render(
      <SrdProvider>
        <FeatPicker {...baseProps} featSpellChoices={null} setFeatSpellChoices={() => {}} />
      </SrdProvider>
    )
    expect(await screen.findByText(/Magias concedidas/)).toBeInTheDocument()
    expect(screen.getByText(/Passo Nebuloso/)).toBeInTheDocument()
  })

  it('talento sem magia não renderiza o picker', () => {
    render(
      <SrdProvider>
        <FeatPicker
          {...baseProps}
          feats={[{ index: 'robusto', name: 'Robusto', prereq: null, desc: 'PV.' }]}
          featSpellChoices={null} setFeatSpellChoices={() => {}}
        />
      </SrdProvider>
    )
    expect(screen.queryByText(/Magias concedidas/)).not.toBeInTheDocument()
  })

  it('trocar de talento zera as magias escolhidas', async () => {
    const setFeatChosenAttr = vi.fn()
    const setFeatSpellChoices = vi.fn()
    render(
      <SrdProvider>
        <FeatPicker
          {...baseProps}
          selectedFeatIdx={null}
          setSelectedFeatIdx={() => {}}
          setFeatChosenAttr={setFeatChosenAttr}
          featSpellChoices={{ list: null, picks: [['enfeiticar-pessoa']] }}
          setFeatSpellChoices={setFeatSpellChoices}
        />
      </SrdProvider>
    )
    await userEvent.click(screen.getByText('Tocado pelas Fadas'))
    expect(setFeatChosenAttr).toHaveBeenCalledWith(null)
    expect(setFeatSpellChoices).toHaveBeenCalledWith(null)
  })
})
```

Acrescente os imports que faltarem (`SrdProvider`, `vi`, `userEvent`) aos existentes — sem import duplicado do mesmo módulo.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/levelup-FeatPicker-race.test.jsx`
Expected: FAIL

- [ ] **Step 3: Implementar no FeatPicker do level-up**

Em `src/systems/dnd5e/components/CharacterSheet/levelProgression/FeatPicker.jsx`:

(a) Imports no topo:

```js
import { FeatSpellPicker } from '../../CharacterWizardV2/blocks/FeatSpellPicker'
import { getFeatSpellDef } from '../../../domain/featSpells'
```

(b) Assinatura — acrescentar as duas props novas:

```js
export function FeatPicker({
  feats, attributes,
  featSearch, setFeatSearch,
  selectedFeatIdx, setSelectedFeatIdx,
  featChosenAttr, setFeatChosenAttr,
  featSpellChoices, setFeatSpellChoices,
  onFeatInfo,
  raceInfo = null,
}) {
```

(c) O `onClick` que troca o talento (linha ~57) também zera as magias:

```jsx
              onClick={() => {
                setSelectedFeatIdx(sel ? null : realIdx)
                setFeatChosenAttr(null)
                // Trocar de talento invalida as magias — eram do anterior.
                setFeatSpellChoices?.(null)
              }}
```

(d) No JSX, DEPOIS do bloco `{chosenFeat?.attrBonus && (...)}` (o picker de atributo, termina ~linha 132) e ANTES do `</div>` final, inserir:

```jsx
      {chosenFeat && getFeatSpellDef(chosenFeat.index) && (
        <div className="p-3 bg-parchment-50 border border-parchment-600 rounded-lg">
          <FeatSpellPicker
            featIndex={chosenFeat.index}
            value={featSpellChoices ?? null}
            onChange={setFeatSpellChoices}
          />
        </div>
      )}
```

- [ ] **Step 4: Ligar no LevelUpPanel**

Em `src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx`:

(a) Import no topo, junto dos existentes:

```js
import { isFeatSpellChoiceComplete } from '../../../domain/featSpells'
```

(b) Estado novo, logo abaixo do `const [featChosenAttr, setFeatChosenAttr] = useState(null)` (linha ~28):

```js
  const [featSpellChoices,    setFeatSpellChoices]    = useState(null)
```

(c) O toggle ASI/Talento (linha ~161) também zera:

```jsx
                  onClick={() => {
                    setAsiMode(mode); setBoosts({})
                    setSelectedFeatIdx(null); setFeatChosenAttr(null); setFeatSpellChoices(null)
                  }}
```

(d) O gate (linha ~46-49) — acrescentar a checagem da magia:

```js
  // Se o talento tem attrBonus com múltiplas escolhas, exige que o usuário escolha
  const featNeedsAttrPick = chosenFeat?.attrBonus && (chosenFeat.attrBonus.choices?.length ?? 0) > 1
  const featAttrReady     = !featNeedsAttrPick || featChosenAttr !== null
  // Talento que concede magia só está pronto com a magia escolhida.
  const featSpellsReady   = !chosenFeat || isFeatSpellChoiceComplete(chosenFeat.index, featSpellChoices)

  // ASI pronto: se modo ASI precisam boosts; se modo talento precisa talento + atributo (se aplicável) + magias
  const asiReady    = !hasASI || (asiMode === 'asi' ? Object.keys(boosts).length > 0 : chosenFeat !== null && featAttrReady && featSpellsReady)
```

(e) Passar as props pro FeatPicker (linha ~181):

```jsx
            <FeatPicker
              feats={feats}
              attributes={attributes}
              featSearch={featSearch}
              setFeatSearch={setFeatSearch}
              selectedFeatIdx={selectedFeatIdx}
              setSelectedFeatIdx={setSelectedFeatIdx}
              featChosenAttr={featChosenAttr}
              setFeatChosenAttr={setFeatChosenAttr}
              featSpellChoices={featSpellChoices}
              setFeatSpellChoices={setFeatSpellChoices}
              onFeatInfo={setFeatModal}
              raceInfo={raceInfo}
            />
```

(f) O `onConfirm` (linha ~226) — mandar as escolhas no patch. `enrichWithFeatSpells` (plano 1) já lê `patch.featSpellChoices`:

```jsx
          onClick={() => canCommit && onConfirm({
            newLevel: nextLevel,
            hpIncrease: hpGain,
            attrBoosts: asiMode === 'asi' ? boosts : {},
            newChoices,
            bonusSpells: bonusCantripsChosen,
            chosenFeat: asiMode === 'feat' ? chosenFeat : null,
            featChosenAttr: asiMode === 'feat' ? (featChosenAttr ?? (chosenFeat?.attrBonus?.choices?.[0] ?? null)) : null,
            featSpellChoices: asiMode === 'feat' ? featSpellChoices : null,
          })}
```

(g) O rótulo do botão travado (linha ~245) — acrescentar o caso novo APÓS o do atributo:

```jsx
              : asiMode === 'feat' && !featAttrReady ? 'Escolha o atributo do talento'
              : asiMode === 'feat' && !featSpellsReady ? 'Escolha as magias do talento'
              : 'Escolha a melhoria de atributo')
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/levelup-FeatPicker-race.test.jsx`
Expected: PASS

Regressão do fluxo de level-up:

Run: `npx vitest run src/test/dnd5e/ src/test/audit-fixes.test.js`
Expected: PASS

- [ ] **Step 6: Lint**

Run: `npx eslint src/systems/dnd5e/components/CharacterSheet/levelProgression/FeatPicker.jsx src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx src/test/dnd5e/levelup-FeatPicker-race.test.jsx`
Expected: exit 0

- [ ] **Step 7: MUTATION CHECK (obrigatório)**

  a) remove `featSpellsReady` do `asiReady` — reporte se algum teste pega. Se não pegar, é buraco real: o `LevelUpPanel` não tem teste de componente hoje. Diga plainly; NÃO invente teste contrived. Se conseguir um teste honesto e barato do painel, ótimo.
  b) `featSpellChoices: asiMode === 'feat' ? featSpellChoices : null` → sempre `null` — reporte se pega
  c) o `setFeatSpellChoices?.(null)` some do onClick — deve falhar o "trocar de talento zera"

- [ ] **Step 8: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/levelProgression/FeatPicker.jsx src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx src/test/dnd5e/levelup-FeatPicker-race.test.jsx
git commit -m "@ feat(feat-spells): picker inline + gating no level-up" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Retrofit — domínio + updater + botão na ficha

**Files:**
- Modify: `src/systems/dnd5e/domain/featSpells.js`
- Modify: `src/test/dnd5e/featSpells.test.js`
- Modify: `src/systems/dnd5e/hooks/useCharacter.js`
- Modify: `src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx:334`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx:164`
- Test: `src/test/dnd5e/feat-spells-retrofit.test.jsx` (novo)

**Esta é a task que conserta a ficha do dono.**

- [ ] **Step 1: Escrever os testes de domínio que falham**

Acrescentar em `src/test/dnd5e/featSpells.test.js` (junte `getPendingFeatSpells` ao import existente do módulo — sem segundo import):

```js
describe('getPendingFeatSpells', () => {
  const char = (feats, spells = []) => ({
    info: { class: 'guerreiro', level: 4, multiclasses: [], feats },
    spellcasting: { spells },
  })

  it('personagem sem talento de magia → []', () => {
    expect(getPendingFeatSpells(char([{ index: 'robusto', name: 'Robusto' }]))).toEqual([])
  })

  it('talento de escolha sem escolha → pendente com needsChoice', () => {
    expect(getPendingFeatSpells(char([
      { index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', chosenAttr: 'cha' },
    ]))).toEqual([{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', needsChoice: true }])
  })

  it('talento só de fixas com as magias AUSENTES → pendente sem needsChoice', () => {
    expect(getPendingFeatSpells(char([
      { index: 'telepatico', name: 'Telepático', chosenAttr: 'wis' },
    ]))).toEqual([{ index: 'telepatico', name: 'Telepático', needsChoice: false }])
  })

  it('talento só de fixas com as magias PRESENTES → não pendente', () => {
    expect(getPendingFeatSpells(char(
      [{ index: 'telepatico', name: 'Telepático', chosenAttr: 'wis' }],
      [{ index: 'detectar-pensamentos', name: 'Detectar Pensamentos', level: 2 }],
    ))).toEqual([])
  })

  it('escolha completa mas magia escolhida ainda ausente → pendente', () => {
    expect(getPendingFeatSpells(char(
      [{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', chosenAttr: 'cha',
         spellChoices: { list: null, picks: [['enfeiticar-pessoa']] } }],
      [{ index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2 }],
    ))).toEqual([{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', needsChoice: false }])
  })

  it('escolha completa e TODAS as magias presentes → não pendente', () => {
    expect(getPendingFeatSpells(char(
      [{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', chosenAttr: 'cha',
         spellChoices: { list: null, picks: [['enfeiticar-pessoa']] } }],
      [{ index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2 },
       { index: 'enfeiticar-pessoa', name: 'Enfeitiçar Pessoa', level: 1 }],
    ))).toEqual([])
  })

  it('entrada nula em info.feats é ignorada', () => {
    expect(() => getPendingFeatSpells(char([null, { name: 'sem index' }]))).not.toThrow()
    expect(getPendingFeatSpells(char([null]))).toEqual([])
  })

  it('personagem sem info/spellcasting não explode', () => {
    expect(getPendingFeatSpells({})).toEqual([])
    expect(getPendingFeatSpells(null)).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/featSpells.test.js`
Expected: FAIL — `getPendingFeatSpells is not a function`

- [ ] **Step 3: Implementar `getPendingFeatSpells`**

Acrescentar em `src/systems/dnd5e/domain/featSpells.js`, DEPOIS de `injectFeatSpells` (ela usa a `getGrantedSpellRefs` privada, que já existe no módulo):

```js
/**
 * Talentos com concessão de magia PENDENTE — precisa de escolha que ainda não
 * foi feita, OU as magias concedidas ainda não estão em `spellcasting.spells`
 * (ficha criada antes deste motor existir). Alimenta o retrofit da aba
 * Habilidades (spec §6): o dono pega o talento, o app não dava as magias.
 *
 * `needsChoice` distingue os dois botões: quem precisa escolher abre o picker;
 * quem só tem magia fixa é um clique só.
 */
export function getPendingFeatSpells(character) {
  const present = new Set((character?.spellcasting?.spells ?? []).map(s => s.index))
  const out = []
  for (const feat of character?.info?.feats ?? []) {
    if (!feat?.index) continue
    const def = getFeatSpellDef(feat.index)
    if (!def) continue
    const needsChoice = !isFeatSpellChoiceComplete(feat.index, feat.spellChoices)
    const missing = getGrantedSpellRefs(def, feat).some(r => !present.has(r.index))
    if (needsChoice || missing) out.push({ index: feat.index, name: feat.name, needsChoice })
  }
  return out
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/featSpells.test.js`
Expected: PASS

- [ ] **Step 5: Updater em useCharacter**

Em `src/systems/dnd5e/hooks/useCharacter.js`:

(a) Import — acrescente ao bloco de imports do domínio no topo:

```js
import { injectFeatSpells } from '../domain/featSpells'
```

(b) Acrescentar o updater logo DEPOIS de `setChosenFeature` (~linha 328):

```js
  /**
   * Grava as escolhas de magia de um talento e injeta as magias concedidas.
   * Retrofit da ficha (spec §6): talento pego antes do picker existir.
   *
   * Espelha o setChosenFeature, mas recebe `srdSpells` por parâmetro — este
   * hook não tem acesso ao SrdProvider, e injectFeatSpells materializa a
   * magia a partir do catálogo. É idempotente: chamar de novo não duplica.
   */
  const setFeatSpellChoices = useCallback((featIndex, spellChoices, srdSpells) => {
    setCharacter(prev => injectFeatSpells({
      ...prev,
      info: {
        ...prev.info,
        feats: (prev.info?.feats ?? []).map(f =>
          f?.index === featIndex ? { ...f, spellChoices } : f
        ),
      },
    }, srdSpells))
  }, [setCharacter])
```

(c) Exportar — acrescentar `setFeatSpellChoices,` nas DUAS listas de retorno onde `setChosenFeature,` já aparece (~linhas 777 e 818).

- [ ] **Step 6: UI do retrofit na FeaturesTab**

Em `src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx`:

(a) Imports no topo, junto dos existentes (caminhos já conferidos a partir de `src/systems/dnd5e/components/CharacterSheet/`):

```js
import { Modal } from '../../../../components/ui/Modal'
import { getPendingFeatSpells, isFeatSpellChoiceComplete } from '../../domain/featSpells'
import { FeatSpellPicker } from '../CharacterWizardV2/blocks/FeatSpellPicker'
```

(b) Assinatura (~linha 439) — acrescentar a prop:

```js
export function FeaturesTab({ character, featureUses, onSpend, onRegain, onSetChosenFeature, onSetFeatSpellChoices }) {
```

(c) O destructuring do `useSrd` (~linha 442) ganha `spells` — NÃO chame `useSrd()` duas vezes:

```js
  const { progression, races, classChoices, spells: srdSpells } = useSrd()
```

(d) Logo após `const allFeats = useLazySrdDataset('feats')` (~linha 443):

```js
  const [featSpellModal, setFeatSpellModal] = useState(null)   // { index, name } | null
  const [draftChoices,   setDraftChoices]   = useState(null)
  const pendingFeatSpells = useMemo(() => getPendingFeatSpells(character), [character])
```

(d) Handlers, logo abaixo:

```js
  function openFeatSpellModal(feat) {
    const cur = (character.info?.feats ?? []).find(f => f.index === feat.index)
    setDraftChoices(cur?.spellChoices ?? null)
    setFeatSpellModal(feat)
  }

  function confirmFeatSpells() {
    onSetFeatSpellChoices?.(featSpellModal.index, draftChoices, srdSpells)
    setFeatSpellModal(null)
    setDraftChoices(null)
  }

  // Talento só de magia fixa: não há o que escolher, um clique injeta.
  function addFixedFeatSpells(feat) {
    const cur = (character.info?.feats ?? []).find(f => f.index === feat.index)
    onSetFeatSpellChoices?.(feat.index, cur?.spellChoices ?? null, srdSpells)
  }
```

(e) No JSX, DENTRO do bloco `{featFeatures.length > 0 && (...)}` (~linha 826), ANTES do `<FeatureGroup title="Talentos" ...>`, envolver com um fragment e inserir o aviso:

```jsx
          {featFeatures.length > 0 && (
            <>
              {onSetFeatSpellChoices && pendingFeatSpells.length > 0 && (
                <div className="rounded-lg border border-amber-700/60 bg-amber-900/20 p-3 space-y-2">
                  <p className="text-xs text-amber-200">
                    {pendingFeatSpells.length === 1
                      ? 'Um talento seu concede magias que ainda não estão na ficha.'
                      : `${pendingFeatSpells.length} talentos seus concedem magias que ainda não estão na ficha.`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pendingFeatSpells.map(f => (
                      <button
                        key={f.index}
                        type="button"
                        onClick={() => f.needsChoice ? openFeatSpellModal(f) : addFixedFeatSpells(f)}
                        className="px-2.5 py-1 rounded border border-amber-600 bg-amber-800/40 text-xs font-semibold text-amber-100 hover:bg-amber-700/50 transition-colors"
                      >
                        {f.needsChoice ? `Escolher magias: ${f.name}` : `Adicionar magias: ${f.name}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <FeatureGroup
                title="Talentos"
                icon={<Icon name="sparkle" size={12} strokeWidth={1.75} />}
                features={featFeatures} featureUses={featureUses} onSpend={onSpend} onRegain={onRegain}
              />
            </>
          )}
```

(f) O modal — inserir logo ANTES do `</div>` que fecha o return do componente (o mesmo nível dos outros blocos de vista):

```jsx
      <Modal
        open={!!featSpellModal}
        onClose={() => { setFeatSpellModal(null); setDraftChoices(null) }}
        title={featSpellModal ? `Magias de ${featSpellModal.name}` : ''}
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setFeatSpellModal(null); setDraftChoices(null) }}
              className="px-3 py-1.5 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-xs font-display text-ink-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!featSpellModal || !isFeatSpellChoiceComplete(featSpellModal.index, draftChoices)}
              onClick={confirmFeatSpells}
              className="px-3 py-1.5 rounded-sm border-2 border-ink-500 bg-ink-500 text-xs font-display text-parchment-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Adicionar à ficha
            </button>
          </div>
        }
      >
        {featSpellModal && (
          <FeatSpellPicker
            featIndex={featSpellModal.index}
            value={draftChoices}
            onChange={setDraftChoices}
          />
        )}
      </Modal>
```

`useState`/`useMemo` já são importados no arquivo.

- [ ] **Step 7: Passar o updater nos dois call sites**

Em `src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx` — destructure `setFeatSpellChoices` junto de `setChosenFeature` (~linha 99) e passe (~linha 334):

```jsx
          onSetFeatSpellChoices={setFeatSpellChoices}
```

Em `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx` — o mesmo (~linhas 83 e 164):

```jsx
              onSetFeatSpellChoices={setFeatSpellChoices}
```

- [ ] **Step 8: Teste de integração do retrofit**

Criar `src/test/dnd5e/feat-spells-retrofit.test.jsx`. Siga o setup de provider de `src/test/dnd5e/feat-spell-math-badge.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { FeaturesTab } from '../../systems/dnd5e/components/CharacterSheet/FeaturesTab'

// Ficha do dono: Humano Variante Guerreiro com Tocado pelas Fadas pego na
// criação, ANTES do motor existir — nenhuma magia na ficha, nenhuma escolha.
function fichaAntiga() {
  return {
    info: {
      name: 'Heitor', race: 'humano', subrace: 'tracos-raciais-alternativos',
      class: 'guerreiro', level: 4, multiclasses: [], chosenFeatures: {},
      feats: [{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 1, source: 'race', chosenAttr: 'cha' }],
    },
    attributes: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
    spellcasting: { ability: null, spells: [], usedSlots: {} },
    combat: { classFeatureUses: [] },
  }
}

function renderTab(props = {}) {
  return render(
    <SrdProvider>
      <FeaturesTab
        character={fichaAntiga()}
        featureUses={[]}
        onSpend={() => {}}
        onRegain={() => {}}
        {...props}
      />
    </SrdProvider>
  )
}

describe('retrofit de magias de talento na aba Habilidades', () => {
  it('ficha antiga mostra o aviso e o botão de escolher', async () => {
    renderTab({ onSetFeatSpellChoices: () => {} })
    await userEvent.click(await screen.findByRole('button', { name: /Habilidades/i }))
    expect(await screen.findByText(/concede magias que ainda não estão na ficha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Escolher magias: Tocado pelas Fadas/ })).toBeInTheDocument()
  })

  it('sem o handler (read-only) o aviso não aparece', async () => {
    renderTab()
    await userEvent.click(await screen.findByRole('button', { name: /Habilidades/i }))
    expect(screen.queryByText(/concede magias que ainda não estão na ficha/i)).not.toBeInTheDocument()
  })

  it('escolher a magia e confirmar chama o handler com as escolhas', async () => {
    const onSetFeatSpellChoices = vi.fn()
    renderTab({ onSetFeatSpellChoices })
    await userEvent.click(await screen.findByRole('button', { name: /Habilidades/i }))
    await userEvent.click(screen.getByRole('button', { name: /Escolher magias: Tocado pelas Fadas/ }))

    // O modal abre com o picker
    expect(await screen.findByText(/Magias concedidas/)).toBeInTheDocument()
    // Botão desabilitado enquanto a escolha não está completa
    const confirm = screen.getByRole('button', { name: 'Adicionar à ficha' })
    expect(confirm).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /Enfeitiçar Pessoa/ }))
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)

    expect(onSetFeatSpellChoices).toHaveBeenCalledWith(
      'tocado-pelas-fadas',
      { list: null, picks: [['enfeiticar-pessoa']] },
      expect.any(Array),
    )
  })

  it('talento só de magia fixa: botão de um clique, sem modal', async () => {
    const onSetFeatSpellChoices = vi.fn()
    const ficha = fichaAntiga()
    ficha.info.feats = [{ index: 'telepatico', name: 'Telepático', takenAtLevel: 4, chosenAttr: 'wis' }]
    render(
      <SrdProvider>
        <FeaturesTab character={ficha} featureUses={[]} onSpend={() => {}} onRegain={() => {}}
          onSetFeatSpellChoices={onSetFeatSpellChoices} />
      </SrdProvider>
    )
    await userEvent.click(await screen.findByRole('button', { name: /Habilidades/i }))
    await userEvent.click(await screen.findByRole('button', { name: /Adicionar magias: Telepático/ }))
    expect(onSetFeatSpellChoices).toHaveBeenCalledWith('telepatico', null, expect.any(Array))
    expect(screen.queryByText('Adicionar à ficha')).not.toBeInTheDocument()
  })
})
```

**Se o filtro "Habilidades" não abrir com esse seletor**, leia o componente e ajuste o seletor pro que ele realmente renderiza (é um controle segmentado de filtros). Diga o que usou.

- [ ] **Step 9: Rodar tudo**

Run: `npx vitest run src/test/dnd5e/feat-spells-retrofit.test.jsx src/test/dnd5e/featSpells.test.js`
Expected: PASS

Run: `npx vitest run src/test/useCharacter-featureuses.test.js src/test/dnd5e/`
Expected: PASS (regressão)

- [ ] **Step 10: Lint**

Run: `npx eslint src/systems/dnd5e/domain/featSpells.js src/systems/dnd5e/hooks/useCharacter.js src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx src/test/dnd5e/feat-spells-retrofit.test.jsx`
Expected: exit 0 nos arquivos que você tocou. Se `FeaturesTab.jsx` ou `MainBox.jsx` já tiverem erros pré-existentes, confirme via `git stash` e diga quais.

- [ ] **Step 11: MUTATION CHECK (obrigatório)**

  a) `getPendingFeatSpells`: `needsChoice || missing` → só `needsChoice` — deve falhar o teste das fixas ausentes
  b) `getPendingFeatSpells`: `.some(r => !present.has(r.index))` → `.every(...)` — deve falhar algum teste
  c) `setFeatSpellChoices` no useCharacter: não chama `injectFeatSpells` (só grava o spellChoices) — reporte se algum teste pega. Se não, é buraco real; um teste honesto do updater vale a pena (renderize o hook ou teste o corpo isolado).
  d) o botão "Adicionar à ficha" sem o `disabled` — deve falhar o teste do disabled

- [ ] **Step 12: Commit**

```bash
git add src/systems/dnd5e/domain/featSpells.js src/test/dnd5e/featSpells.test.js src/systems/dnd5e/hooks/useCharacter.js src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx src/test/dnd5e/feat-spells-retrofit.test.jsx
git commit -m "@ feat(feat-spells): retrofit das magias de talento na ficha salva" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Fix de `key` — magia injetada não tem `id`

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/Spells.jsx:471`
- Test: `src/test/dnd5e/feat-spell-math-badge.test.jsx` (já existe e JÁ renderiza `Spells` com sucesso — ACRESCENTE aqui, reaproveitando o fixture dele)

`mapSrdSpellToCharacter` não gera `id` (nem o `PACT_FAMILIAR_SPELL`). A linha renderiza com `key={spell.id}` → `undefined`. Com UMA magia injetada por nível passa despercebido; o **Iniciado em Magia concede 2 truques** (mesmo nível, mesma aba) → duas `key={undefined}` = React reclama de key duplicada e pode reconciliar errado. É pré-existente (magias de subclasse têm o mesmo problema), mas este plano torna comum.

Não gere `id` no domínio: `generateId()` é não-determinístico e quebraria a identidade que `injectFeatSpells` preserva (os testes de idempotência usam `toBe`).

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `src/test/dnd5e/feat-spell-math-badge.test.jsx`, reaproveitando o helper de render que o arquivo já tem (leia-o primeiro e siga o padrão dele):

```jsx
describe('magias injetadas sem id não colidem na key do React', () => {
  it('duas magias de talento no mesmo nível não geram aviso de key duplicada', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Iniciado em Magia (mago): dois truques, mesmo nível, ambos SEM `id` —
    // é o que injectFeatSpells produz (mapSrdSpellToCharacter não gera id).
    const spells = [
      { index: 'luz', name: 'Luz', level: 0, school: 'evocação', source: 'feat',
        featGrants: [{ featIndex: 'iniciado-em-magia', featGrant: 0 }] },
      { index: 'raio-de-fogo', name: 'Raio de Fogo', level: 0, school: 'evocação', source: 'feat',
        featGrants: [{ featIndex: 'iniciado-em-magia', featGrant: 0 }] },
    ]
    // ... renderize Spells com essas magias usando o helper do arquivo ...
    await screen.findByText('Luz')
    const dup = errSpy.mock.calls.some(c => String(c[0]).includes('same key'))
    expect(dup).toBe(false)
    errSpy.mockRestore()
  })
})
```

O comentário `// ... renderize ...` é o ÚNICO ponto do plano onde não dou o código pronto: o helper de render desse arquivo foi escrito por outro agente e eu não o tenho em contexto. Leia o arquivo, use o helper existente, e escreva a chamada. Se renderizar `Spells` com duas magias de nível 0 provar-se inviável, diga plainly e faça o fix sem esse teste (reportando que ficou sem pin) — não invente um teste contrived.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/feat-spells-retrofit.test.jsx`
Expected: FAIL — React avisa de key duplicada

- [ ] **Step 3: Implementar**

Em `src/systems/dnd5e/components/CharacterSheet/Spells.jsx`, linha ~471:

```jsx
                // Magias concedidas (talento, subclasse, familiar do pacto)
                // não têm `id` — mapSrdSpellToCharacter não gera. `index` é
                // único na lista (a injeção dedupa por index).
                key={spell.id ?? spell.index}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/feat-spell-math-badge.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/Spells.jsx src/test/dnd5e/feat-spell-math-badge.test.jsx
git commit -m "@ fix(feat-spells): key da linha de magia cai no index quando nao ha id" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Suíte completa + prova visual + merge

- [ ] **Step 1: Suíte inteira**

Run: `npx vitest run 2>&1 | tail -8`
Expected: tudo verde. Baseline após o plano 1: **1908 testes / 257 arquivos**. Há um flake conhecido de timeout em `sheetV2-HeaderV2-hp.test.jsx` e em LoginScreen/ResetPasswordScreen sob carga — se SÓ esses falharem, re-rode isolados pra confirmar e diga que é o flake conhecido.

- [ ] **Step 2: Prova visual do retrofit (e2e)**

Criar `e2e-pw/tmp-retrofit-visual.spec.js`. GOTCHA: `SHORT_ID_REGEX` (`src/utils/storage.js:26`) exige **exatamente 10 chars** sem ambíguos (I/O/0/1/l).

```js
import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// TEMPORÁRIO — prova visual do retrofit. Ficha do dono: Humano Variante
// Guerreiro com Tocado pelas Fadas, criada antes do motor existir: nenhuma
// magia, nenhuma escolha registrada.
const SEED = {
  shortId: 'RETROFIT22',
  info: {
    name: 'Heitor Antigo', race: 'humano', subrace: 'tracos-raciais-alternativos',
    class: 'guerreiro', level: 4, alignment: '', multiclasses: [], chosenFeatures: {},
    asiOrFeatByLevel: {}, background: 'soldado',
    feats: [{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 1, source: 'race', chosenAttr: 'cha' }],
  },
  attributes: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
  spellcasting: { ability: null, usedSlots: {}, pactSlotsUsed: 0, spells: [] },
}

test('retrofit: escolher a magia põe Passo Nebuloso E a escolhida na ficha', async ({ context, page }) => {
  const id = '55555555-5555-4555-8555-555555555555'
  await installAuthedApp(context, { characters: [makeCharacter(id, 'Heitor Antigo', SEED)] })
  await page.goto('/c/RETROFIT22')
  await expect(page.getByText('Heitor Antigo').first()).toBeVisible()

  // Aba Características → aviso do retrofit
  await page.getByRole('tab', { name: /Características/ }).first().click()
  await page.getByRole('button', { name: /Habilidades/i }).first().click()
  await expect(page.getByText(/concede magias que ainda não estão na ficha/i)).toBeVisible()
  await page.screenshot({ path: 'test-results/retrofit-aviso.png' })

  // Abre o picker, escolhe, confirma
  await page.getByRole('button', { name: /Escolher magias: Tocado pelas Fadas/ }).click()
  await expect(page.getByText(/Magias concedidas/)).toBeVisible()
  await page.screenshot({ path: 'test-results/retrofit-picker.png' })
  await page.getByRole('button', { name: /Enfeitiçar Pessoa/ }).click()
  await page.getByRole('button', { name: 'Adicionar à ficha' }).click()

  // As duas magias entraram, com a CD do talento (CAR 16, prof +2 → CD 13)
  await page.getByRole('tab', { name: 'Magias' }).first().click()
  await expect(page.getByText('Enfeitiçar Pessoa').first()).toBeVisible()
  await expect(page.getByText('CD 13 · CAR').first()).toBeVisible()
  await page.screenshot({ path: 'test-results/retrofit-magias.png' })

  await page.getByRole('tab', { name: /Nível 2/ }).first().click()
  await expect(page.getByText('Passo Nebuloso').first()).toBeVisible()

  // O aviso some depois do retrofit
  await page.getByRole('tab', { name: /Características/ }).first().click()
  await page.getByRole('button', { name: /Habilidades/i }).first().click()
  await expect(page.getByText(/concede magias que ainda não estão na ficha/i)).not.toBeVisible()
})
```

Run: `npx playwright test e2e-pw/tmp-retrofit-visual.spec.js --reporter=list`
Expected: PASS. Ajuste os seletores de aba/filtro ao que o app realmente renderiza (o toast "App pronto para uso offline" pode cobrir a lista — dispense-o se atrapalhar). **Olhe as capturas.**

- [ ] **Step 3: Apagar o e2e temporário**

```bash
rm e2e-pw/tmp-retrofit-visual.spec.js
```

Ele semeia um documento com forma específica e existe só pra provar a entrega — não é regressão que valha manter (o teste de componente da Task 5 cobre o contrato).

- [ ] **Step 4: Merge + push (dispara deploy)**

```bash
git checkout master
git merge --no-ff feat/magias-talento-p2 -m "merge: pickers, gating e retrofit de magias de talento (plano 2)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push
git branch -d feat/magias-talento-p2
```

- [ ] **Step 5: Sanidade pós-merge**

Run: `git log --oneline -3` — confirmar o merge no topo da master e o push.
Run: `git diff --stat <sha-base>..HEAD -- public/srd-data/` — deve vir VAZIO (sem bump de SW).

---

## O que este plano NÃO entrega (plano 3)

- Trackers 1×/descanso em `defaultClassFeatureUses` lendo `info.feats`.
- Botões no `SpellRow` via `getCastPolicy` (que hoje **não tem consumidor** fora dos testes): "1×/descanso" por entrada de `freeCast[]`, "à vontade" (`atWill`), esconder slots quando `slots` é false, ritual-only.
- Sem isso: Guerreiro com Tocado pelas Fadas VÊ as magias com a CD certa, mas não tem botão pra conjurar (não tem slot). Iniciado em Magia idem.
