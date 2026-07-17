import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { JobsCharts } from '@/components/jobs-charts';
import { JobsDashboard } from '@/components/jobs-dashboard';
import { getJobsDb } from '@/lib/db';
import type { VagaRecord, VagaStatus } from '@/src/types/vaga';

export const revalidate = 60;

type DashboardCounts = Record<'todas' | VagaStatus, number>;

function getDashboardCounts(vagas: VagaRecord[]): DashboardCounts {
  return vagas.reduce<DashboardCounts>(
    (acc, vaga) => {
      acc.todas += 1;
      acc[vaga.status] += 1;
      return acc;
    },
    { todas: 0, nova: 0, aplicado: 0, descartado: 0 }
  );
}

export default async function HomePage() {
  const db = await getJobsDb();
  const vagas = await db.listarVagas();
  const counts = getDashboardCounts(vagas);
  const stats = [
    { label: 'Total', value: counts.todas },
    { label: 'Novas', value: counts.nova },
    { label: 'Aplicadas', value: counts.aplicado },
    { label: 'Descartadas', value: counts.descartado },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          LinkedIn Job Bot
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard de Vagas</h1>
        <p className="max-w-2xl text-muted-foreground">
          Revise as vagas encontradas pelo scraper, abra o LinkedIn e marque as que você já
          aplicou ou descartou.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <JobsCharts vagas={vagas} />

      <JobsDashboard vagas={vagas} />

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Página regenerada via ISR a cada 60s. Atualizações de status invalidam o cache na hora.
        </CardContent>
      </Card>
    </main>
  );
}
