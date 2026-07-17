'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, useTransition } from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { isVagaStatus, type VagaRecord, type VagaStatus } from '@/src/types/vaga';

const statusLabel: Record<VagaStatus, string> = {
  nova: 'Nova',
  aplicado: 'Aplicado',
  descartado: 'Descartado',
};

const statusVariant: Record<VagaStatus, 'warning' | 'success' | 'muted'> = {
  nova: 'warning',
  aplicado: 'success',
  descartado: 'muted',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusFilters({ current }: { current: VagaStatus | 'todas' }) {
  const filters: Array<{ value: VagaStatus | 'todas'; label: string }> = [
    { value: 'todas', label: 'Todas' },
    { value: 'nova', label: 'Novas' },
    { value: 'aplicado', label: 'Aplicadas' },
    { value: 'descartado', label: 'Descartadas' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const href = filter.value === 'todas' ? '/' : `/?status=${filter.value}`;
        const active = current === filter.value;

        return (
          <Link
            key={filter.value}
            href={href}
            className={cn(buttonVariants({ variant: active ? 'default' : 'outline', size: 'sm' }))}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}

function JobsTable({ vagas }: { vagas: VagaRecord[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function updateStatus(id: string, status: VagaStatus) {
    setError(null);

    const response = await fetch(`/api/vagas/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error || 'Não foi possível atualizar o status.');
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  if (vagas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/60 px-6 py-16 text-center text-muted-foreground">
        Nenhuma vaga encontrada para este filtro.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-card/85 shadow-sm shadow-black/20 backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vaga</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enviada</TableHead>
              <TableHead>Aplicação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vagas.map((vaga) => (
              <TableRow key={vaga.id_vaga}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{vaga.titulo || 'Sem título'}</div>
                    <div className="text-sm text-muted-foreground">
                      {vaga.empresa || 'Empresa não informada'}
                      {vaga.localizacao ? ` · ${vaga.localizacao}` : ''}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{vaga.modelo || '—'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[vaga.status]}>{statusLabel[vaga.status]}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(vaga.data_envio)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(vaga.data_aplicacao)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    {vaga.link ? (
                      <a
                        href={vaga.link}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir
                      </a>
                    ) : null}

                    {vaga.status !== 'aplicado' ? (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => updateStatus(vaga.id_vaga, 'aplicado')}
                      >
                        Apliquei
                      </Button>
                    ) : null}

                    {vaga.status !== 'descartado' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => updateStatus(vaga.id_vaga, 'descartado')}
                      >
                        Descartar
                      </Button>
                    ) : null}

                    {vaga.status !== 'nova' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => updateStatus(vaga.id_vaga, 'nova')}
                      >
                        Voltar p/ nova
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function JobsDashboardInner({ vagas }: { vagas: VagaRecord[] }) {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const current: VagaStatus | 'todas' =
    statusParam && isVagaStatus(statusParam) ? statusParam : 'todas';

  const filtered = useMemo(() => {
    if (current === 'todas') return vagas;
    return vagas.filter((vaga) => vaga.status === current);
  }, [current, vagas]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Lista de vagas</h2>
        <StatusFilters current={current} />
      </div>
      <JobsTable vagas={filtered} />
    </section>
  );
}

export function JobsDashboard({ vagas }: { vagas: VagaRecord[] }) {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border bg-card/60 px-6 py-16 text-center text-muted-foreground">
          Carregando filtros...
        </div>
      }
    >
      <JobsDashboardInner vagas={vagas} />
    </Suspense>
  );
}
