import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getJobsDb } from '@/lib/db';
import { isVagaStatus } from '@/src/types/vaga';
import type { VagaStatus } from '@/src/types/vaga';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isStatusUpdatePayload(value: unknown): value is { status: VagaStatus; notas?: string | null } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const notas = payload.notas;

  return (
    typeof payload.status === 'string' &&
    isVagaStatus(payload.status) &&
    (notas === undefined || notas === null || typeof notas === 'string')
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  if (!isStatusUpdatePayload(body)) {
    return NextResponse.json(
      { error: 'Status inválido. Use: nova, aplicado ou descartado.' },
      { status: 400 }
    );
  }

  const db = await getJobsDb();
  const atualizada = await db.atualizarStatus(id, body.status, body.notas);

  if (!atualizada) {
    return NextResponse.json({ error: 'Vaga não encontrada.' }, { status: 404 });
  }

  revalidatePath('/');

  return NextResponse.json({ vaga: atualizada });
}
