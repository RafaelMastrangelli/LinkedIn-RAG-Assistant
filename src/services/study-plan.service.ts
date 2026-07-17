import axios from 'axios';
import { llmConfig } from '../llm-config';
import { insecureHttpsAgent } from '../network-config';
import type { VagaRecord } from '../types/vaga';

export class StudyPlanService {
  async gerarPlano(
    vaga: VagaRecord,
    descricao: string,
    curriculoTexto?: string | null
  ): Promise<{ markdown: string; modelo: string }> {
    if (!llmConfig.groqApiKey) {
      throw new Error(
        'GROQ_API_KEY não configurada. Adicione a chave no arquivo .env para gerar planos.'
      );
    }

    const systemPrompt = `Você é um mentor de carreira para desenvolvedores.
Analise o currículo/skills do candidato em relação à vaga e gere um plano de estudos em Markdown (pt-BR), objetivo e acionável.
Estrutura obrigatória:
1. Análise do currículo vs vaga (skills que o candidato JÁ tem / skills que FALTAM)
2. Resumo do fit (forte / médio / fraco) com justificativa breve
3. Skills prioritárias para estudar (alta/média), com base no gap real
4. Plano semana a semana (2 a 4 semanas) focado no que falta
5. Recursos sugeridos (tipos de conteúdo; não invente URLs se não tiver certeza)
6. Checklist pré-entrevista
Não invente experiências que não estejam no currículo. Seja específico à stack da vaga.`;

    const blocoCurriculo = curriculoTexto?.trim()
      ? `Currículo do candidato (texto extraído — use para analisar skills reais):
${curriculoTexto.slice(0, 14000)}`
      : `Currículo: não anexado. Use apenas o perfil resumido abaixo (menos preciso).`;

    const userPrompt = `${blocoCurriculo}

Perfil resumido (complementar):
${llmConfig.candidateProfile}

Vaga:
- Título: ${vaga.titulo}
- Empresa: ${vaga.empresa}
- Local: ${vaga.localizacao}
- Modelo: ${vaga.modelo}
- Link: ${vaga.link}

Descrição da vaga:
${descricao.slice(0, 10000)}`;

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: llmConfig.llmModel,
          temperature: 0.4,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${llmConfig.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000,
          httpsAgent: insecureHttpsAgent,
        }
      );

      const markdown = response.data?.choices?.[0]?.message?.content?.trim();
      if (!markdown) {
        throw new Error('A LLM retornou resposta vazia.');
      }

      return { markdown, modelo: llmConfig.llmModel };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const code = error.code || '';
        const msg = error.message || '';
        if (
          code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
          code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
          msg.includes('self-signed certificate')
        ) {
          throw new Error(
            'Falha TLS ao chamar a Groq (certificado self-signed). Defina ALLOW_INSECURE_TLS=true no .env e reinicie o dashboard.'
          );
        }
      }
      throw error;
    }
  }
}
