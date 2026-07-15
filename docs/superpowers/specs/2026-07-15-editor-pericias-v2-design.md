# Editor de perícias nativo do v2 — design

**Data:** 2026-07-15
**Contexto:** ficha v2 (layout padrão em produção)

## Problema

A engrenagem do painel Perícias abre um `EditDialog` (560px) que embrulha o
`SkillsList` do v1. Quatro defeitos observáveis:

1. **Nomes truncados.** O grid do `SkillsList` usa breakpoints de *viewport*
   (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), não da largura do container.
   Num desktop o `lg` casa e ele abre 3 colunas dentro de 560px → ~150px por
   coluna. Descontando checkbox, ★, modificador (`w-8`) e botão de rolar, sobram
   ~20px pro nome e o `truncate` corta pra "A.", "E.", "I...".
2. **Caixa dentro de caixa.** O `SkillsList` traz a própria moldura
   (`bg-parchment-100 border rounded-lg p-4`) e o próprio `<h3>PERÍCIAS</h3>`
   dentro de um `v2-panel` que já tem moldura e `DialogTitle` "Perícias".
3. **Cores fora do tema.** As classes parchment/ink passam pela ponte CSS
   (`legacy-bridge.css`), que remapeia pro escuro mas entrega modificadores em
   vermelho/rosa e checkboxes claros — destoa do resto da ficha v2.
4. **Densidade.** Cinco elementos por linha (checkbox, ★, modificador, dado,
   nome) num espaço que não comporta.

Os outros editores do v2 (Condições, Defesa, Identidade, Pontos de vida) já são
nativos; perícias é o único que ainda reusa o v1.

## Decisão

Componente novo `v2/SkillsEditor.jsx`, nativo nos tokens `--v2-*`. O
`SkillsPanel` passa a usá-lo dentro do `EditDialog`.

`SkillsList` v1 fica **intocado**: ainda serve o `SheetContent` (ficha v1) e
morre junto com ele na Fase 5 Etapa B. Duplicar o componente por uma janela de
observação é mais barato que fazer um só componente servir dois design systems.

## Comportamento

### Layout

- Grid `repeat(auto-fill, minmax(200px, 1fr))` — o número de colunas sai da
  largura do container, não do viewport. Em 560px dá 2 colunas; encolheu, vira
  1. Nenhum breakpoint envolvido, nada a re-sintonizar se a largura do dialog
  mudar.
- Sem moldura e sem título próprios: o `EditDialog` já fornece os dois.
- Linha: checkbox/🎒 · ★ · nome + abreviação do atributo · modificador (direita).
  `min-height: 30px` pro alvo de toque no mobile.

### Cabeçalho do editor

Uma linha de subtítulo (não um card): contador à esquerda, legenda à direita.

- Contador: `N de M escolhidas`. Excedeu → `· K excedida(s)` em `--v2-warning`
  (âmbar). Exceder é aviso, não erro — é estado alcançável por ficha antiga ou
  mudança de classe.
- Sem limite de classe (`skill_choices.count` ausente) → só a legenda.
- Legenda: `prof +N · ★ especialização · 🎒 antecedente`. O 🎒 só aparece se o
  personagem tiver perícia de antecedente.

### Filtro por atributo

Chips `Tudo · FOR · DES · CON · INT · SAB · CAR` com `aria-pressed`. "Tudo"
substitui o link "limpar" do v1 — o estado neutro vira um chip como os outros.
Ativo usa `--v2-surface-2` + `--v2-text-1`; inativo `--v2-text-2`.

### Marcação

Mantém os dois controles explícitos do v1, restilizados:

- **Checkbox** = proficiência. `accent-color: var(--v2-accent)`. Perícia de
  antecedente troca o checkbox por 🎒 travado (`title="Proficiência do
  antecedente"`) — o antecedente não é editável na ficha.
- **★** = especialização. Só clicável quando a perícia já é proficiente (PHB
  p.96). Não-proficiente: `--v2-text-3` inerte (não `opacity: 0` como o v1) — a
  regra fica visível em vez de escondida.
- **Sem botão de dado.** No modal você escolhe proficiências; a ficha atrás já é
  rolável por linha (`RollableRow`).

### Limite

Atingiu o limite da classe (`classData.skill_choices.count`) → as não-marcadas
ficam com checkbox `disabled` e a linha em `--v2-text-3`. Marcadas continuam
desmarcáveis.

O `SkillsList` v1 soma um `extraSkillBudget` ao limite, mas a prop é morta:
nenhum call site (`SheetContent`, `SkillsPanel`) passa. O editor novo não a
carrega — se um dia existir orçamento extra de perícia, entra como prop com
teste.

## Reuso

- `skillProficiencyState` / `skillBonus` (`v2/skillBonus.js`) — mesma fonte de
  verdade que o painel de leitura usa. Sem recalcular modificador no editor.
- `updaters.toggleSkillProficiency` / `updaters.toggleExpertiseSkill` — os
  mesmos que o `SkillsPanel` já passa pro `SkillsList`.
- `SKILLS` / `ABILITY_SCORES` (`utils/calculations`).

## Testes

Arquivo novo `src/test/sheetV2-SkillsEditor.test.jsx`:

1. Renderiza as 18 perícias com nome completo (`getByText('Acrobacia')` etc.).
2. Clicar no checkbox chama `toggleSkillProficiency` com a chave certa.
3. ★ de perícia não-proficiente não chama `toggleExpertiseSkill`.
4. Perícia de antecedente não tem checkbox (tem o 🎒).
5. Filtro por atributo estreita a lista (SAB → some Acrobacia).
6. No limite, checkbox de não-marcada vem `disabled`.
7. Contador mostra excedido quando `selecionadas > limite`.

`src/test/sheetV2-SkillsPanel-edit.test.jsx` passa a mockar `SkillsEditor` no
lugar de `SkillsList`.

## Fora de escopo

- Reescrever o `SkillsList` v1 ou o `SheetContent`.
- Fase 5 Etapa B (apagar o v1) — continua gated pela observação do dono.
- Tornar perícia de antecedente editável.
