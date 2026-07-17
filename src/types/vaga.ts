export type VagaStatus = 'nova' | 'aplicado' | 'descartado';

export type TipoBusca = 'remoto' | 'bauru';

export type DescricaoFonte = 'scrape' | 'manual';

export type PlanoStatus = 'gerando' | 'pronto' | 'erro';

/** Payload usado pelo scraper / Telegram ao descobrir uma vaga. */
export interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  localizacao: string;
  modelo: string;
  link: string;
  tipoBusca?: TipoBusca;
}

/** Registro completo persistido no SQLite. */
export interface VagaRecord {
  id_vaga: string;
  titulo: string;
  empresa: string;
  localizacao: string;
  modelo: string;
  link: string;
  tipo_busca: string | null;
  status: VagaStatus;
  data_envio: string;
  data_aplicacao: string | null;
  notas: string | null;
  descricao: string | null;
  descricao_fonte: DescricaoFonte | null;
  descricao_atualizada_em: string | null;
}

export interface PlanoEstudoRecord {
  id: number;
  id_vaga: string;
  conteudo_md: string;
  modelo_llm: string | null;
  status: PlanoStatus;
  erro: string | null;
  criado_em: string;
  atualizado_em: string;
}

/** Currículo único do candidato (singleton id = 1). */
export interface CurriculoRecord {
  id: number;
  nome_arquivo: string;
  mime_type: string;
  texto_extraido: string;
  atualizado_em: string;
}

export const VAGA_STATUS_VALUES: VagaStatus[] = ['nova', 'aplicado', 'descartado'];

export function isVagaStatus(value: unknown): value is VagaStatus {
  if (typeof value !== 'string') {
    return false;
  }

  return (VAGA_STATUS_VALUES as string[]).includes(value);
}
