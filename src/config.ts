import dotenv from 'dotenv';
import { resolveDatabasePath } from './database';

// Carregar variáveis de ambiente
dotenv.config();

export interface Config {
  telegramToken: string;
  telegramChatId: string;
  searchKeywords: string[];
  databasePath: string;
  scraperDelayMs: number;
  searchTimeHours: number;
  maxApplicants: number;
}

const getEnvOrThrow = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`A variável de ambiente obrigatória '${key}' está faltando no arquivo .env.`);
  }
  return value;
};

export const config: Config = {
  telegramToken: getEnvOrThrow('TELEGRAM_TOKEN'),
  telegramChatId: getEnvOrThrow('TELEGRAM_CHAT_ID'),
  // Suporta múltiplas keywords separadas por vírgula (ex: "Desenvolvedor,Analista de Sistemas")
  searchKeywords: (process.env.SEARCH_KEYWORDS || 'Desenvolvedor')
    .split(',')
    .map((kw) => kw.trim())
    .filter((kw) => kw.length > 0),
  databasePath: resolveDatabasePath(),
  scraperDelayMs: parseInt(process.env.SCRAPER_DELAY_MS || '5000', 10),
  searchTimeHours: parseInt(process.env.SEARCH_TIME_HOURS || '1', 10),
  maxApplicants: parseInt(process.env.MAX_APPLICANTS || '50', 10),
};
