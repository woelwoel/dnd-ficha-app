# Decisão: retrato — resize client-side agora, Storage como follow-up

**Data:** 2026-07-02 · **Contexto:** Fase 7 do plano de análise crítica.

## Problema

`info.portrait` guardava a foto original em **base64 dentro do JSON da ficha**.
Uma foto de celular (vários MB) era reenviada em TODO autosave e no realtime,
inflando a linha do Postgres e o tráfego.

## Decisão

**Entregue agora (verificável, sem dependência externa):** redimensionar e
comprimir a imagem **client-side** antes de guardar (`utils/imageResize.js`,
máx. 256px, webp/jpeg q0.82). Um avatar fica em ~10-20 KB em vez de MB — o que
resolve o problema PRÁTICO de payload. Continua em `info.portrait` como data URL,
mas pequeno.

**Adiado (follow-up "Fase 7b"):** mover o retrato para **Supabase Storage** e
guardar só a URL. É o ideal arquitetural, mas exige:
- criar o bucket `portraits` + policies RLS no projeto Supabase real
  (migration 0015 — precisa de `supabase db push` / dashboard, que só o dono
  aplica);
- verificação end-to-end contra Storage real (não dá pra mockar com confiança).
Subir isso sem poder verificar contra o Storage real seria arriscado (upload
quebrado em produção). Fica para quando o bucket puder ser criado e testado.

## Bug pego na verificação (importante)

A 1ª implementação usava `URL.createObjectURL` → `<img>`. A **CSP** do app
(`img-src 'self' data:`) NÃO permite `blob:`, então a imagem nunca carregava e
o código caía no fallback, guardando o **original inteiro** — exatamente o que
queríamos evitar, e teria ido pra produção silenciosamente quebrado. Corrigido
lendo via `FileReader` como `data:` URL (permitido pela CSP). Coberto pelo
e2e `portrait.spec.js`.
