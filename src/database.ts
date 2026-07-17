import path from 'path';
import { JobsRepository } from './repositories/jobs.repository';
import type {
  DescricaoFonte,
  PlanoEstudoRecord,
  PlanoStatus,
  CurriculoRecord,
  Vaga,
  VagaRecord,
  VagaStatus,
} from './types/vaga';

/** Resolve o caminho do SQLite sem depender das credenciais do Telegram. */
export function resolveDatabasePath(explicitPath?: string): string {
  if (explicitPath) {
    return explicitPath;
  }

  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  return path.join(process.cwd(), 'data', 'jobs.db');
}

/**
 * Serviço de banco usado pelo bot e pelo dashboard.
 * Delega ao JobsRepository.
 */
export class DatabaseService {
  private readonly repository: JobsRepository;

  constructor(databasePath?: string) {
    this.repository = new JobsRepository(resolveDatabasePath(databasePath));
  }

  async init(): Promise<void> {
    await this.repository.init();
  }

  async vagaExiste(idVaga: string): Promise<boolean> {
    return this.repository.vagaExiste(idVaga);
  }

  async salvarVaga(vaga: Vaga): Promise<void> {
    await this.repository.salvarVaga(vaga);
  }

  async listarVagas(status?: VagaStatus): Promise<VagaRecord[]> {
    return this.repository.listarVagas(status);
  }

  async buscarPorId(idVaga: string): Promise<VagaRecord | undefined> {
    return this.repository.buscarPorId(idVaga);
  }

  async atualizarStatus(
    idVaga: string,
    status: VagaStatus,
    notas?: string | null
  ): Promise<VagaRecord | undefined> {
    return this.repository.atualizarStatus(idVaga, status, notas);
  }

  async salvarDescricao(
    idVaga: string,
    descricao: string,
    fonte: DescricaoFonte
  ): Promise<VagaRecord | undefined> {
    return this.repository.salvarDescricao(idVaga, descricao, fonte);
  }

  async buscarPlanoPorVaga(idVaga: string): Promise<PlanoEstudoRecord | undefined> {
    return this.repository.buscarPlanoPorVaga(idVaga);
  }

  async upsertPlano(
    idVaga: string,
    data: {
      conteudo_md?: string;
      modelo_llm?: string | null;
      status: PlanoStatus;
      erro?: string | null;
    }
  ): Promise<PlanoEstudoRecord> {
    return this.repository.upsertPlano(idVaga, data);
  }

  async buscarCurriculo(): Promise<CurriculoRecord | undefined> {
    return this.repository.buscarCurriculo();
  }

  async salvarCurriculo(data: {
    nome_arquivo: string;
    mime_type: string;
    texto_extraido: string;
  }): Promise<CurriculoRecord> {
    return this.repository.salvarCurriculo(data);
  }

  async removerCurriculo(): Promise<void> {
    return this.repository.removerCurriculo();
  }

  async fechar(): Promise<void> {
    await this.repository.fechar();
  }
}
