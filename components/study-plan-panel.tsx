'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import type { PlanoEstudoRecord, VagaRecord } from '@/src/types/vaga';

interface StudyPlanPanelProps {
  vaga: VagaRecord;
  plano: PlanoEstudoRecord | null;
}

export function StudyPlanPanel({ vaga, plano }: StudyPlanPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [descricaoManual, setDescricaoManual] = useState('');
  const [loading, setLoading] = useState(false);

  async function gerarPlano(forcarScrape = false) {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/vagas/${vaga.id_vaga}/plano`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forcarScrape,
          descricaoManual: descricaoManual.trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || 'Falha ao gerar plano.');
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError('Erro de rede ao gerar plano.');
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || isPending || plano?.status === 'gerando';

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={busy} onClick={() => gerarPlano(false)}>
          {busy ? 'Gerando…' : plano ? 'Regenerar plano' : 'Gerar plano'}
        </Button>
        <Button
          variant="outline"
          disabled={busy || !vaga.link}
          onClick={() => gerarPlano(true)}
        >
          Scrape + gerar
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground" htmlFor="descricao-manual">
          Fallback: colar descrição manual (se o scrape falhar)
        </label>
        <textarea
          id="descricao-manual"
          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
          placeholder="Cole aqui o texto da vaga do LinkedIn…"
          value={descricaoManual}
          onChange={(event) => setDescricaoManual(event.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {plano?.status === 'erro' && plano.erro ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Último erro: {plano.erro}
        </div>
      ) : null}

      {vaga.descricao ? (
        <details className="rounded-xl border bg-card/60 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Descrição salva ({vaga.descricao_fonte || '—'})
          </summary>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{vaga.descricao}</p>
        </details>
      ) : null}

      {plano?.status === 'pronto' && plano.conteudo_md ? (
        <article className="rounded-xl border bg-card/85 p-6 shadow-sm shadow-black/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>Modelo: {plano.modelo_llm || '—'}</span>
            <span>
              Atualizado:{' '}
              {new Date(plano.atualizado_em).toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {plano.conteudo_md}
          </div>
        </article>
      ) : (
        <div className="rounded-xl border border-dashed bg-card/40 px-6 py-12 text-center text-muted-foreground">
          {busy
            ? 'Scrape e geração em andamento. Isso pode levar cerca de 1 minuto…'
            : 'Nenhum plano pronto ainda. Gere a partir do scrape da descrição.'}
        </div>
      )}
    </section>
  );
}
