import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StudyPlanPanel } from '@/components/study-plan-panel';
import { getJobsDb } from '@/lib/db';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VagaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const db = await getJobsDb();
  const vaga = await db.buscarPorId(id);

  if (!vaga) {
    notFound();
  }

  const plano = (await db.buscarPlanoPorVaga(id)) ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-4')}>
          ← Voltar
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>{vaga.empresa}</CardDescription>
          <CardTitle className="text-2xl">{vaga.titulo || 'Sem título'}</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">{vaga.modelo || '—'}</Badge>
            <Badge variant="secondary">{vaga.status}</Badge>
            {vaga.localizacao ? <Badge variant="muted">{vaga.localizacao}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {vaga.link ? (
            <a href={vaga.link} target="_blank" rel="noreferrer" className="text-primary underline">
              Abrir no LinkedIn
            </a>
          ) : (
            <span>Sem link</span>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Plano de estudos</h2>
        <p className="text-sm text-muted-foreground">
          Ao gerar, o sistema faz scrape da descrição, compara com o currículo anexado e monta o
          plano via LLM. Se o scrape falhar, cole a descrição manualmente.
        </p>
        <StudyPlanPanel vaga={vaga} plano={plano} />
      </div>
    </main>
  );
}
