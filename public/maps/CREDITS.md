# Atribuição dos mapas

## default.svg

- **Fonte:** Gerado para o projeto dnd-ficha-app (in-house).
- **Autor:** Projeto (assistência IA).
- **Licença:** CC0 — domínio público.
- **Estilo:** Cartógrafo Tolkien-esco. Pergaminho sépia, tinta marrom-escuro, cordilheira em 3 camadas, mata densa, rio serpenteante, castelo octogonal, torre arcana, ruínas, aldeia, porto, monstro marinho, rosa-dos-ventos, "Hic Sunt Dracones".
- **Locais marcados** (coincidem com `REGIONS_DEFAULT` em `src/utils/token-position.js`):
  - `forest` (0.18, 0.55) — Mata Antiga (oeste)
  - `castle` (0.50, 0.45) — Pedra do Rei (centro)
  - `tower` (0.22, 0.40) — Torre do Mago (NO)
  - `ruins` (0.82, 0.65) — Ruínas de Tharos (leste)
  - `village` (0.42, 0.80) — Aldeia do Cervo (sul)
  - `port` (0.80, 0.78) — Porto Pedra (SE)

## Como trocar o mapa

Substitua `default.svg` (ou troque por `default.webp` / `default.png` e atualize `MAP_BACKGROUND_URL` em `src/utils/config.js`). Se o novo mapa tiver locais em coordenadas diferentes, ajuste `REGIONS_DEFAULT` em `src/utils/token-position.js`.

## Geradores recomendados

- **Azgaar's Fantasy Map Generator** ([azgaar.github.io/Fantasy-Map-Generator](https://azgaar.github.io/Fantasy-Map-Generator/)) — gratuito, open-source, gera mapas procedurais com vários presets de estilo. Exporta PNG/SVG. CC-BY.
- **Inkarnate** — paga, profissional, presets bonitos.
- **Wonderdraft** — paga, focada em mapas hand-drawn.

## Fontes CC0 de mapas prontos

- [OpenGameArt — categoria Map](https://opengameart.org/art-search?keys=map)
- [Pixabay — fantasy maps](https://pixabay.com/images/search/fantasy%20map/)
