import { useState } from 'react'
import { dmSaveCharacter } from '../../../../lib/dmWrites'
import { performLongRest, performShortRest } from '../../utils/rest'
import { Button } from '../../../../components/ui/Button'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'

/**
 * Descanso da companhia inteira, disparado pelo Mestre.
 *
 * A regra é a MESMA da ficha do jogador (performLongRest/performShortRest); só
 * o caminho de escrita é outro (dm_save_character, doc completo com lock).
 * Descanso curto de propósito NÃO gasta dados de vida: quantos gastar é
 * escolha do jogador na ficha dele — aqui só recarregamos recursos.
 *
 * Cada ficha é salva de forma independente: uma falhar (ex.: conflito de
 * versão) não impede as outras, e o resumo lista quem não conseguiu.
 */
export function PartyRestPanel({ docs, onRested }) {
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const list = Object.values(docs ?? {})
  if (list.length === 0) return null

  async function rest(kind) {
    setConfirmOpen(false)
    setBusy(true)
    setSummary(null)
    const failed = []
    let ok = 0
    for (const doc of list) {
      const next = kind === 'long' ? performLongRest(doc) : performShortRest(doc, { spent: [] })
      const res = await dmSaveCharacter(doc.id, stripMeta(next), doc.version)
      if (res.ok) ok += 1
      else failed.push({ name: doc.info?.name ?? doc.id, reason: res.reason })
    }
    setBusy(false)
    setSummary({ ok, failed })
    onRested?.()
  }

  return (
    <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
      <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
        Descanso da companhia
      </h2>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => setConfirmOpen(true)}>Descanso longo</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => rest('short')}>Descanso curto</Button>
        </div>
        <p className="text-xs ink-italic text-ink-300">
          O descanso curto recarrega os recursos e zera a economia de ação — gastar dados de vida
          continua sendo escolha de cada jogador na ficha dele.
        </p>
        {summary && (
          <div className="text-sm text-ink-500">
            <p>
              {summary.ok === 1 ? '1 ficha descansou' : `${summary.ok} fichas descansaram`}
              {summary.failed.length > 0 && `, ${summary.failed.length} falharam`}
            </p>
            {summary.failed.length > 0 && (
              <ul className="mt-1 text-xs text-red-700">
                {summary.failed.map(f => <li key={f.name}>{f.name} — {f.reason}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Descanso longo reescreve a ficha de todo mundo e não tem desfazer —
          por isso confirma. O curto só recarrega recursos, então vai direto. */}
      <ConfirmDialog
        open={confirmOpen}
        title="Descanso longo da companhia?"
        message={
          <>
            <p className="mb-2">
              Vai reescrever {list.length === 1 ? 'a ficha de' : 'as fichas de'}{' '}
              <strong>{list.map(d => d.info?.name ?? d.id).join(', ')}</strong>.
            </p>
            <ul className="mb-2 list-disc pl-5 text-xs">
              <li>PV cheio e PV temporário zerado</li>
              <li>espaços de magia e recursos de classe recuperados</li>
              <li>metade dos dados de vida de volta</li>
              <li><strong>efeitos ativos removidos</strong> — buffs de magia não sobrevivem a 8 horas</li>
            </ul>
            <p className="ink-italic text-ink-300">Não há como desfazer.</p>
          </>
        }
        confirmLabel={busy ? 'Descansando…' : 'Descansar'}
        cancelLabel="Cancelar"
        busy={busy}
        onConfirm={() => rest('long')}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  )
}

/**
 * Metadados relacionais não vão dentro de `data` (espelham colunas).
 * Mesma lista que `upsertCharacter`/`saveCharacterVersioned` removem em
 * src/utils/storage.js: ownerId, campaignId, version. `shortId` NÃO entra
 * nessa lista lá (fica dentro do JSONB salvo hoje) — mantido aqui por
 * simetria com o caminho normal de save, não removido.
 */
function stripMeta(doc) {
  const { ownerId: _o, campaignId: _c, version: _v, ...rest } = doc
  void _o; void _c; void _v
  return rest
}
