'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { FileText, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CurriculumUploadProps {
  curriculo: {
    nome_arquivo: string;
    atualizado_em: string;
    caracteres: number;
    preview: string;
  } | null;
}

export function CurriculumUpload({ curriculo }: CurriculumUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function onFileChange(file: File | null) {
    if (!file) return;
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/curriculo', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error || 'Falha ao enviar currículo.');
        return;
      }

      startTransition(() => router.refresh());
    } catch {
      setError('Erro de rede ao enviar currículo.');
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  async function remover() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/curriculo', { method: 'DELETE' });
      if (!response.ok) {
        setError('Não foi possível remover o currículo.');
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError('Erro de rede ao remover currículo.');
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Currículo
        </CardTitle>
        <CardDescription>
          Anexe seu CV (PDF ou TXT). Ele será analisado em todo plano de estudos gerado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain"
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {curriculo ? 'Substituir currículo' : 'Anexar currículo'}
          </Button>
          {curriculo ? (
            <Button type="button" variant="secondary" disabled={busy} onClick={remover}>
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        {curriculo ? (
          <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="font-medium text-foreground">{curriculo.nome_arquivo}</div>
            <div className="text-muted-foreground">
              {curriculo.caracteres.toLocaleString('pt-BR')} caracteres · atualizado{' '}
              {new Date(curriculo.atualizado_em).toLocaleString('pt-BR')}
            </div>
            <p className="line-clamp-4 whitespace-pre-wrap text-muted-foreground">
              {curriculo.preview}
              {curriculo.caracteres > 400 ? '…' : ''}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum currículo anexado. Sem ele, o plano usa só o perfil do `.env`.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
