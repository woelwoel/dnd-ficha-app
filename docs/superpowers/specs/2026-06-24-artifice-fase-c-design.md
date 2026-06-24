# Artífice — Fase C (features numéricas) Design

Data: 2026-06-24
Branch: `multi-sistema-fronteira`. Pré-requisito: Artífice Fases A e B entregues.

## Objetivo

Fechar o Artífice 100% com as três features que têm efeito numérico/recurso e
que ainda estão só como texto (vindas da progressão da Fase A):

1. **Teto de sintonia** crescente por nível de Artífice.
2. **Lampejo de Genialidade** (nv7) como recurso limitado.
3. **Item de Armazenar Magia** (nv11) como recurso limitado.

## Decisões (do brainstorming)

- Peças 2 e 3 = **trackers** (`classFeatureUse`: max/used/recharge), igual a
  Ki/Fúria/Canalizar Divindade. A descrição já vem da progressão.
- Teto de sintonia = **data-driven** pelo nível de Artífice; sem auto-aplicar
  outros efeitos.
- "Versado em Itens Mágicos" (nv14) também ignora pré-requisitos de sintonia —
  mas o app NÃO valida esses pré-requisitos hoje, então é **no-op** (texto).
  Fora de escopo: criar validação de pré-requisito de item.

## Componentes

### 1. Teto de sintonia por nível de Artífice

Hoje o cap é fixo: `MAX_ATTUNED = 3` em
`src/systems/dnd5e/components/CharacterSheet/Inventory.jsx` (~linha 201), usado
para `attunedCount < MAX_ATTUNED`.

- Nova função pura `getMaxAttunement(character)` em `domain/artificerInfusions.js`
  (ou um `domain/attunement.js` novo — decidir no plano; reusa
  `artificerLevelOf`): base **3**, vira **4** (Artífice nv≥10), **5** (nv≥14),
  **6** (nv≥18).
- `Inventory.jsx` passa a derivar o cap dessa função em vez do literal `3`.
  Mantém o comportamento atual (cap 3) para qualquer personagem não-Artífice ou
  Artífice < nv10.
- O texto "Máx. 3 itens mágicos (PHB p.136)" passa a refletir o cap real.

### 2. Lampejo de Genialidade (nv7) — recurso

Em `src/systems/dnd5e/domain/rules.js`, na geração de `classFeatureUses` por
classe (onde já entram Ki/Fúria/etc.), adicionar para `cls === 'artifice'`:

```
if (cls === 'artifice' && level >= 7) {
  out.push({ id: 'artifice-flash-of-genius', name: 'Lampejo de Genialidade',
    max: Math.max(1, intMod), used: 0, recharge: 'long', source: 'artifice' })
}
```

`intMod` = modificador de Inteligência (a função já calcula `cha` para o Bardo;
adicionar o `int` da mesma forma a partir dos atributos do personagem).

### 3. Item de Armazenar Magia (nv11) — recurso

Mesma geração, para `cls === 'artifice' && level >= 11`:

```
out.push({ id: 'artifice-spell-storing-item', name: 'Item de Armazenar Magia',
  max: 2 * Math.max(1, intMod), used: 0, recharge: 'long', source: 'artifice' })
```

Aproximação: a feature guarda uma magia usável `2×INT` vezes até re-armazenar;
modelamos como `2×INT` cargas que recarregam no descanso longo (re-armazenar).

## Testes

- `getMaxAttunement`: 3 (não-Artífice / Artífice nv<10), 4 (nv10–13), 5 (nv14–17),
  6 (nv18+); Artífice em multiclasse usa o nível DA classe.
- `Inventory.jsx`: usa o cap derivado (Artífice nv10 mostra 4; não-Artífice 3).
- Geração de `classFeatureUses`: Artífice nv7 ganha Lampejo (max=INT mod, long);
  nv11 ganha Item de Armazenar Magia (max=2×INT, long); nv6 não tem nenhum dos
  dois; INT mod baixo respeita mínimo 1 no Lampejo.
- Regressão: recursos de outras classes inalterados.

## Fora de escopo

- Validação de pré-requisitos de sintonia (o app não valida itens hoje).
- Auto-aplicar os efeitos das features além do teto de sintonia.
- Service worker: **não** muda `public/srd-data` (tudo é código) → sem bump de cache.

## Relacionado

- [[tasha-fontes]]; spike `docs/superpowers/notes/2026-06-23-artifice-spike.md`
  (Fase C = teto de sintonia + Lampejo + Item de Armazenar Magia).
- Fases A/B: planos em `docs/superpowers/plans/2026-06-24-artifice-fase-a.md` e
  `.../2026-06-24-artifice-fase-b-infusoes.md`.
