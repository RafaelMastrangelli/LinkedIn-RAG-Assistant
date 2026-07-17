import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getJobsDb } from '@/lib/db';
import { extrairTextoCurriculo } from '@/src/services/curriculum-extract.service';

export const dynamic = 'force-dynamic';

function toCurriculoSummary(curriculo: {
  nome_arquivo: string;
  atualizado_em: string;
  texto_extraido: string;
}) {
  return {
    nome_arquivo: curriculo.nome_arquivo,
    atualizado_em: curriculo.atualizado_em,
    caracteres: curriculo.texto_extraido.length,
    preview: curriculo.texto_extraido.slice(0, 400),
  };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Envie um arquivo no campo "file".' }, { status: 400 });
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 5 MB.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const texto = await extrairTextoCurriculo(buffer, file.type || '', file.name);
    const db = await getJobsDb();
    const curriculo = await db.salvarCurriculo({
      nome_arquivo: file.name,
      mime_type: file.type || 'application/octet-stream',
      texto_extraido: texto,
    });

    revalidatePath('/');

    return NextResponse.json({ curriculo: toCurriculoSummary(curriculo) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao processar currículo.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const db = await getJobsDb();
  await db.removerCurriculo();
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}
