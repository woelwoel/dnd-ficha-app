# Decisão: conteúdo WotC não-SRD vira resumo próprio

**Data:** 2026-07-02 · **Decisor:** dono · **Contexto:** Task 2.2 do plano
`docs/superpowers/plans/2026-07-02-resolucao-analise-critica.md`, com base na
auditoria `docs/audits/2026-07-conteudo-nao-srd.md`.

## Decisão

Substituir gradualmente todo texto **integral/verbatim** de fontes fechadas da
WotC por **resumos mecânicos próprios** — o mesmo formato que subclasses,
talentos e itens já usam (e que a auditoria classificou como risco baixo, por
mecânica de jogo não ser protegível por copyright, só a expressão do texto).

Alternativas descartadas: mover pra trás de login (reduz exposição mas não
resolve o fundo) e aceitar o risco documentado (incompatível com a meta de
crescer como produto).

## Ordem de ataque (pior primeiro)

1. **`fullDescription` das 12 classes** em `phb-classes-pt.json` — lore de
   abertura VERBATIM do PHB (pior achado da auditoria). Reescrever como 2-3
   frases próprias por classe.
2. **~71 magias não-SRD** em `phb-spells-pt.json` (as que não constam em
   `5e-SRD-Spells.json`) — condensar `desc` em resumo mecânico próprio.
3. **Revisão de varredura** nos demais `phb-*` sinalizados 🟡 na auditoria
   (lore de raças/antecedentes) e atribuição CC-BY-4.0 do SRD visível no app
   (rodapé/sobre).

Tasha já está majoritariamente em formato resumo (auditoria D2 de 2026-06-27);
entra na varredura do item 3 apenas para conferência.

## Lembretes de execução

- Mudou JSON em `public/srd-data`? **Bumpar `cacheName 'srd-data-vN'`** no
  `vite.config.js`.
- Reescrita é trabalho de conteúdo — abrir plano próprio quando começar.
