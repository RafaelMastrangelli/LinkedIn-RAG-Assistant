import { PDFParse } from 'pdf-parse';

const MAX_TEXT_LENGTH = 20000;

export async function extrairTextoCurriculo(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const lowerName = fileName.toLowerCase();
  const isPdf = mimeType === 'application/pdf' || lowerName.endsWith('.pdf');
  const isText =
    mimeType.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md');

  let texto = '';

  if (isPdf) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      texto = result.text || '';
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  } else if (isText) {
    texto = buffer.toString('utf-8');
  } else {
    throw new Error('Formato não suportado. Envie PDF ou TXT.');
  }

  texto = texto
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (texto.length < 40) {
    throw new Error('Não foi possível extrair texto suficiente do currículo.');
  }

  return texto.slice(0, MAX_TEXT_LENGTH);
}
