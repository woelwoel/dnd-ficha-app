# Paráfrase de conteúdo WotC — progresso e o que resta

**Data:** 2026-07-02 · **Contexto:** execução da decisão
`2026-07-02-conteudo-wotc-resumos.md` (Fase 2).

## Feito nesta rodada

- **Lore verbatim das 12 classes (o pior achado, risco ALTO da auditoria):**
  o campo `fullDescription` em `phb-classes-pt.json` era cópia integral da
  seção de abertura de cada classe no PHB (vinhetas de flavor + "Criando um…"
  + tabela de progressão embutida). Substituído por **descrições originais
  próprias** (tema, estilo de jogo e função de cada classe), mais curtas e
  melhores de UX. Verificado: nenhuma vinheta verbatim restante (as ocorrências
  de "nevasca"/"pseudodragão" são nomes de magia/criatura em listas mecânicas,
  não flavor). Cache SW v20→v21.
- **Atribuição CC-BY-4.0 do SRD 5.1** adicionada à página de Privacidade
  (seção "Conteúdo e licença"), com aviso de projeto de fã sem afiliação à WotC.

## O que resta (passo separado, com cautela)

Ainda são verbatim, mas de **risco criativo menor** (texto mecânico/factual, que
copyright protege pouco) e **perigosos de reescrever às pressas**, porque erro
de transcrição vira bug de regra no núcleo do app:

1. **Descrições mecânicas de features** em `topics`/`level1_features` de
   `phb-classes-pt.json` (o que "Fúria", "Espaços de Magia" etc. fazem, por
   classe). Grande volume; reescrever exige revisão regra-a-regra.
2. **~71 magias não-SRD** em `phb-spells-pt.json` (texto integral das
   descrições). Idem: paráfrase precisa preservar a mecânica exata.
3. Subclasses/talentos/itens já são resumos próprios (auditados como risco
   baixo em 2026-06-30) — só conferência.

**Recomendação:** tratar (1) e (2) como um sub-projeto de conteúdo próprio,
feito em lotes pequenos com verificação de regra a cada lote (idealmente com o
dono validando), não numa varredura única. A prioridade legal maior — a prosa
criativa de flavor — já foi endereçada.
