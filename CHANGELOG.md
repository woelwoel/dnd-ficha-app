# Changelog

Todas as mudanças relevantes neste projeto são documentadas aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento semântico: [SemVer](https://semver.org/lang/pt-BR/).

`schemaVersion` refere-se ao formato de persistência do personagem em
`localStorage` e na exportação JSON — ver `src/domain/characterSchema.js`.

## [Não lançado]

### Corrigido
- `utils/fetchSrd.js` agora checa `res.ok` e `content-type` antes de `.json()`,
  respeita `AbortController` e tenta cadeia de fallbacks em vez de engolir
  erros silenciosamente.
- Componentes `CantripsGrantPicker` e `CharacterView` passaram a consumir
  dados via `useSrd()` em vez de `fetch` direto — elimina race conditions,
  requisições duplicadas e vazamentos em unmount.

### Adicionado
- A11y completa nas abas (`SheetTabs`/`SheetContent`): `role=tablist`,
  `role=tab`, `role=tabpanel`, `aria-selected`, `aria-controls`,
  `aria-labelledby`, roving tabindex e navegação por teclado
  (←/→ circular, Home/End).
- `meta.schemaVersion` no schema de personagem + função `migrateCharacter`
  para migrações incrementais entre versões.
- `README.md` de projeto substituindo o template Vite.
- `CHANGELOG.md`.
- `React.memo` em `AttributeBox`, `CombatStats`, `StatBox`, `SavingThrows`,
  `SheetTabs`, `NavBlockedBanner`, `ImportErrorBanner`.

### Alterado
- `safeParseCharacter` e `parseCharacter` agora passam o payload por
  `migrateCharacter` antes do parse Zod.

## [0.1.0] — 2026-04

Primeira versão usável. `schemaVersion: 1`.

### Highlights
- Wizard de criação em passos com validação por aba (touched pattern).
- Ficha com abas: ficha, perícias, magias, inventário, notas, visualizar.
- Regras de conjuração multiclasse (PHB) + Pact Magic do Bruxo.
- Persistência local em `localStorage` com validação Zod.
- Import/export de JSON com `safeParseCharacter`.
- Error Boundary global.
- Code splitting com `React.lazy` em `CharacterSheet` e `CharacterWizard`.
- Auto-save debounced (500ms).
- CSP estrita em `index.html`.
