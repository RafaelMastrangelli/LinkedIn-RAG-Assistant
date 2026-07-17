export type VagaStatus = 'nova' | 'aplicado' | 'descartado';

export type TipoBusca = 'remoto' | 'bauru';

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
}

export const VAGA_STATUS_VALUES: VagaStatus[] = ['nova', 'aplicado', 'descartado'];

export function isVagaStatus(value: unknown): value is VagaStatus {
  if (typeof value !== 'string') {
    return false;
  }

  return (VAGA_STATUS_VALUES as string[]).includes(value);
}
