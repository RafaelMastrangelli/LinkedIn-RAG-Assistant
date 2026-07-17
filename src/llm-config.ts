import dotenv from 'dotenv';

dotenv.config();

export interface LlmConfig {
  groqApiKey: string | null;
  llmModel: string;
  candidateProfile: string;
}

export const llmConfig: LlmConfig = {
  groqApiKey: process.env.GROQ_API_KEY || null,
  llmModel: process.env.LLM_MODEL || 'llama-3.3-70b-versatile',
  candidateProfile:
    process.env.CANDIDATE_PROFILE ||
    'Desenvolvedor com foco em TypeScript, Node.js, React/Next.js e APIs. Nível júnior/pleno.',
};
