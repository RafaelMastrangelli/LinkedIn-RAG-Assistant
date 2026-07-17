import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getJobsDb } from '@/lib/db';
import { StudyPlanOrchestrator } from '@/src/services/study-plan-orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: { descricaoManual?: string; forcarScrape?: boolean } = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const db = await getJobsDb();
  const orchestrator = new StudyPlanOrchestrator(db);

  try {
    const result = await orchestrator.gerarParaVaga(id, {
      descricaoManual: body.descricaoManual,
      forcarScrape: body.forcarScrape,
    });

    revalidatePath('/');
    revalidatePath(`/vagas/${id}`);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error & {
      plano?: unknown;
      vaga?: unknown;
    };

    revalidatePath('/');
    revalidatePath(`/vagas/${id}`);

    return NextResponse.json(
      {
        error: err.message || 'Falha ao gerar plano.',
        plano: err.plano ?? null,
        vaga: err.vaga ?? null,
      },
      { status: 500 }
    );
  }
}
