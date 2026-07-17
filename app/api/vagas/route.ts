import { NextResponse } from 'next/server';
import { getJobsDb } from '@/lib/db';
import { isVagaStatus } from '@/src/types/vaga';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const status = statusParam && isVagaStatus(statusParam) ? statusParam : undefined;

  if (statusParam && !status) {
    return NextResponse.json(
      { error: 'Status inválido. Use: nova, aplicado ou descartado.' },
      { status: 400 }
    );
  }

  const db = await getJobsDb();
  const vagas = await db.listarVagas(status);

  return NextResponse.json({ vagas });
}
