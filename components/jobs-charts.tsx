'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { VagaRecord, VagaStatus } from '@/src/types/vaga';

const STATUS_META: Record<
  VagaStatus,
  { label: string; color: string; dotClassName: string }
> = {
  nova: {
    label: 'Novas',
    color: '#f59e0b',
    dotClassName: 'bg-amber-400',
  },
  aplicado: {
    label: 'Aplicadas',
    color: '#10b981',
    dotClassName: 'bg-emerald-400',
  },
  descartado: {
    label: 'Descartadas',
    color: '#94a3b8',
    dotClassName: 'bg-slate-400',
  },
};

const MODELO_COLORS = ['#60a5fa', '#38bdf8', '#94a3b8', '#2dd4bf'];
const CHART_GRID_COLOR = 'rgba(148, 163, 184, 0.18)';
const CHART_AXIS_COLOR = '#94a3b8';

function buildStatusData(vagas: VagaRecord[]) {
  const counts = vagas.reduce<Record<VagaStatus, number>>(
    (acc, vaga) => {
      acc[vaga.status] += 1;
      return acc;
    },
    { nova: 0, aplicado: 0, descartado: 0 }
  );

  return Object.entries(STATUS_META)
    .map(([status, meta]) => ({
      key: status as VagaStatus,
      name: meta.label,
      value: counts[status as VagaStatus],
      color: meta.color,
      dotClassName: meta.dotClassName,
    }))
    .filter((item) => item.value > 0);
}

function buildModeloData(vagas: VagaRecord[]) {
  const counts = new Map<string, number>();

  for (const vaga of vagas) {
    const modelo = vaga.modelo?.trim() || 'Não informado';
    counts.set(modelo, (counts.get(modelo) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function buildTimelineData(vagas: VagaRecord[], days = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { label: string; encontradas: number; aplicadas: number }>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    buckets.set(key, { label, encontradas: 0, aplicadas: 0 });
  }

  for (const vaga of vagas) {
    const enviadaKey = vaga.data_envio?.slice(0, 10);
    if (enviadaKey && buckets.has(enviadaKey)) {
      buckets.get(enviadaKey)!.encontradas += 1;
    }

    const aplicadaKey = vaga.data_aplicacao?.slice(0, 10);
    if (aplicadaKey && buckets.has(aplicadaKey)) {
      buckets.get(aplicadaKey)!.aplicadas += 1;
    }
  }

  return Array.from(buckets.values());
}

interface ChartTooltipPayload {
  name?: string;
  value?: number | string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card/95 px-3 py-2 text-sm shadow-xl shadow-black/30">
      {label ? <div className="mb-1 font-medium text-foreground">{label}</div> : null}
      <div className="space-y-1 text-muted-foreground">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-4">
            <span>{item.name}</span>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JobsCharts({ vagas }: { vagas: VagaRecord[] }) {
  const statusData = buildStatusData(vagas);
  const modeloData = buildModeloData(vagas);
  const timelineData = buildTimelineData(vagas);
  const total = vagas.length;

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gráficos</CardTitle>
          <CardDescription>Sem dados ainda. Rode o scraper para popular o dashboard.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Status das candidaturas</CardTitle>
          <CardDescription>Distribuição atual das {total} vagas salvas</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={3}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            {statusData.map((entry) => (
              <div key={entry.key} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${entry.dotClassName}`} />
                {entry.name}: {entry.value}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modelo de trabalho</CardTitle>
          <CardDescription>Remoto, híbrido, presencial e outros</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modeloData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Vagas" radius={[6, 6, 0, 0]}>
                {modeloData.map((entry, index) => (
                  <Cell key={entry.name} fill={MODELO_COLORS[index % MODELO_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Últimos 14 dias</CardTitle>
          <CardDescription>Vagas encontradas vs. candidaturas marcadas</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="encontradas" name="Encontradas" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="aplicadas" name="Aplicadas" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </section>
  );
}
