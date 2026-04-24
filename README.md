# Grimório de Personagens — D&D 5e

Ficha de personagem de **Dungeons & Dragons 5ª Edição** em PT-BR: criação
guiada por wizard, ficha completa com abas, regras de conjuração multiclasse,
import/export de JSON e persistência local no navegador.

Single-page app, 100% client-side. Nada vai para servidor algum — dados ficam
no `localStorage` da sua própria máquina.

## Stack

| Camada            | Ferramenta                         |
|-------------------|------------------------------------|
| UI                | React 19                           |
| Build/dev server  | Vite 8                             |
| Estilos           | Tailwind CSS 4                     |
| Validação runtime | Zod 3                              |
| Testes            | Vitest 4 + Testing Library + jsdom |
| Lint              | ESLint 9 (flat config)             |

Sem React Router, sem state library global, sem backend. A navegação é uma
state machine em `App.jsx` (`list` / `new` / `sheet`).

## Como rodar

```bash
npm install
npm run dev       # servidor de desenvolvimento
npm run build     # build de produção (saída: dist/)
npm run preview   # serve o build
npm test          # roda a suíte de testes (vitest run)
npm run test:watch
npm run lint
```

Requer Node ≥ 20.

## Estrutura de pastas

```
src/
  App.jsx                       # roteamento (state machine) + ErrorBoundary
  ErrorBoundary.jsx             # captura erros de render e mostra fallback
  main.jsx
  domain/                       # regras de domínio D&D 5e (puras, testáveis)
    attributes.js               # FOR/DES/CON/INT/SAB/CAR — mapeamento canônico
    characterSchema.js          # Zod schema + migração por schemaVersion
    rules.js
  utils/
    calculations.js             # modifier, prof bonus, skills, spell DC, etc.
    spellcasting.js             # slots multiclasse + Pact Magic (Bruxo)
    storage.js                  # safeGet/safeSet + upsert/delete + Zod
    fetchSrd.js                 # fallback seguro p/ JSON SRD fora do provider
  providers/
    SrdProvider.jsx             # context que carrega os 9 datasets SRD
  hooks/
    useCharacter.js             # estado da ficha + stampMeta
    useCharacterCalculations.js # memos derivados reativos
    useAutoSave.js              # debounce 500ms de persistência
    useClassSpells.js           # seleção derivada do provider
    useTabValidation.js         # erros por aba com padrão "touched"
  components/
    CharacterList.jsx
    CharacterSheet/…            # ficha com abas
    CharacterWizard/…           # wizard de criação (passos)
    DetailsModal.jsx, SpellDetailModal.jsx, etc.
  test/                         # Vitest (storage, spellcasting, wizard, ...)
public/srd-data/                # JSONs SRD em PT-BR (fallback p/ inglês)
```

## Regras e escolhas de design

- **Dados SRD passam todos pelo `SrdProvider`**. Nenhum componente faz `fetch`
  direto — o provider dedup via cache de Promise em nível de módulo e aborta
  em unmount. Use `useSrd()` ou hooks derivados como `useClassSpells`.
- **Persistência é client-only**. Tudo em `localStorage` sob a chave
  `dnd-ficha-app:characters`. Validação na leitura via Zod — registros
  corrompidos são silenciosamente descartados.
- **`schemaVersion`** em `meta.schemaVersion` permite migrações incrementais
  no futuro. Atualmente em v1. Ao bump, escreva a migração em
  `migrateCharacter` (domain/characterSchema.js).
- **Multiclasse de conjuradores** segue a PHB: tabela unificada de slots para
  Mago/Clérigo/Druida/Paladino/Feiticeiro/Bardo/Patrulheiro, com Pact Magic
  (Bruxo) calculada separadamente e somada depois.
- **A11y**:
  - Abas com `role=tablist`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`,
    roving tabindex e suporte a setas/Home/End.
  - Modais com `role=dialog`, `aria-modal`, ESC handler e focus management.
  - Erros de campo com `FormFieldError` + `aria-describedby`.
- **Performance**:
  - `React.lazy` para `CharacterSheet` e `CharacterWizard` — o bundle inicial é
    apenas `App` + `CharacterList`.
  - Auto-save com debounce de 500ms.
  - `React.memo` em `AttributeBox`, `CombatStats`, `StatBox`, `SavingThrows`,
    `SheetTabs`, banners.
  - `useMemo` com deps primitivas em `useCharacterCalculations`.
- **Segurança**:
  - CSP estrita em `index.html` (`default-src 'self'`, `object-src 'none'`,
    `frame-ancestors 'none'`).
  - Import de JSON **nunca** confia no payload: passa por `safeParseCharacter`
    (Zod) antes de tocar o estado.

## Formato do personagem (resumo)

Ver `src/domain/characterSchema.js` para o schema Zod completo.

```jsonc
{
  "id": "string",
  "meta": {
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601",
    "version": "1.0",
    "schemaVersion": 1,
    "settings": { "allowFeats": false, "allowMulticlass": false },
    "creationMethod": "wizard"
  },
  "info": { /* nome, raça, classe, multiclasses, xp, ... */ },
  "attributes": { "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10 },
  "appliedRacialBonuses": {},
  "combat": { "maxHp": 0, "currentHp": 0, "tempHp": 0, "armorClass": 10, "speed": 30, "hitDice": "1d8", "deathSaves": { "successes": 0, "failures": 0 } },
  "proficiencies": { "savingThrows": [], "skills": [], "expertiseSkills": [], "armor": [], "weapons": [], "tools": [], "languages": [] },
  "spellcasting": { "ability": null, "usedSlots": {}, "spells": [] },
  "inventory": { "currency": { "cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0 }, "items": [] },
  "traits": { "personalityTraits": "", "ideals": "", "bonds": "", "flaws": "", "featuresAndTraits": "", "notes": "" }
}
```

## Testes

```bash
npm test
```

Cobrem:
- `storage.test.js` — round-trip, tolerância a `localStorage` corrompido, upsert.
- `spellcasting.test.js` — slots multiclasse 1-20, Pact Magic, regras de preparação.
- `calculations.test.js` — modifiers, prof bonus, spell DC, bounds.
- `background.test.js` — parsing de equipamento de background.
- `wizard.test.js` — fluxo de criação.
- `tabValidation.test.js` — padrão touched-tab.
- `components.test.jsx` — smoke de componentes.

## Contribuindo

Antes de abrir PR: `npm run lint && npm test`. Commits em imperativo ("add X",
"fix Y"), em PT ou EN tanto faz.

## Licença

Uso pessoal. Conteúdo SRD 5e sob **Open Gaming License 1.0a** / **Creative
Commons CC-BY-4.0** (ver <https://dnd.wizards.com/resources/systems-reference-document>).
