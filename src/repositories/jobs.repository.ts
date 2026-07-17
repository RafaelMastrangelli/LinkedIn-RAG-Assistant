import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import type {
  DescricaoFonte,
  PlanoEstudoRecord,
  PlanoStatus,
  CurriculoRecord,
  Vaga,
  VagaRecord,
  VagaStatus,
} from '../types/vaga';

const COLUMNS_TO_MIGRATE: Array<{ name: string; ddl: string }> = [
  { name: 'titulo', ddl: "ALTER TABLE vagas ADD COLUMN titulo TEXT NOT NULL DEFAULT ''" },
  { name: 'empresa', ddl: "ALTER TABLE vagas ADD COLUMN empresa TEXT NOT NULL DEFAULT ''" },
  { name: 'localizacao', ddl: "ALTER TABLE vagas ADD COLUMN localizacao TEXT NOT NULL DEFAULT ''" },
  { name: 'modelo', ddl: "ALTER TABLE vagas ADD COLUMN modelo TEXT NOT NULL DEFAULT ''" },
  { name: 'link', ddl: "ALTER TABLE vagas ADD COLUMN link TEXT NOT NULL DEFAULT ''" },
  { name: 'tipo_busca', ddl: 'ALTER TABLE vagas ADD COLUMN tipo_busca TEXT' },
  { name: 'status', ddl: "ALTER TABLE vagas ADD COLUMN status TEXT NOT NULL DEFAULT 'nova'" },
  { name: 'data_aplicacao', ddl: 'ALTER TABLE vagas ADD COLUMN data_aplicacao TEXT' },
  { name: 'notas', ddl: 'ALTER TABLE vagas ADD COLUMN notas TEXT' },
  { name: 'descricao', ddl: 'ALTER TABLE vagas ADD COLUMN descricao TEXT' },
  { name: 'descricao_fonte', ddl: 'ALTER TABLE vagas ADD COLUMN descricao_fonte TEXT' },
  {
    name: 'descricao_atualizada_em',
    ddl: 'ALTER TABLE vagas ADD COLUMN descricao_atualizada_em TEXT',
  },
];

export class JobsRepository {
  private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;
  private readonly databasePath: string;

  constructor(databasePath: string) {
    this.databasePath = databasePath;
  }

  async init(): Promise<void> {
    const dbDir = path.dirname(this.databasePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = await open({
      filename: this.databasePath,
      driver: sqlite3.Database,
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS vagas (
        id_vaga TEXT PRIMARY KEY,
        titulo TEXT NOT NULL DEFAULT '',
        empresa TEXT NOT NULL DEFAULT '',
        localizacao TEXT NOT NULL DEFAULT '',
        modelo TEXT NOT NULL DEFAULT '',
        link TEXT NOT NULL DEFAULT '',
        tipo_busca TEXT,
        status TEXT NOT NULL DEFAULT 'nova',
        data_envio TEXT NOT NULL,
        data_aplicacao TEXT,
        notas TEXT,
        descricao TEXT,
        descricao_fonte TEXT,
        descricao_atualizada_em TEXT
      );

      CREATE TABLE IF NOT EXISTS planos_estudo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_vaga TEXT NOT NULL UNIQUE,
        conteudo_md TEXT NOT NULL DEFAULT '',
        modelo_llm TEXT,
        status TEXT NOT NULL DEFAULT 'gerando',
        erro TEXT,
        criado_em TEXT NOT NULL,
        atualizado_em TEXT NOT NULL,
        FOREIGN KEY (id_vaga) REFERENCES vagas(id_vaga)
      );

      CREATE TABLE IF NOT EXISTS curriculo (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        nome_arquivo TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        texto_extraido TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );
    `);

    await this.migrarColunas();
    console.log(`[Database] Banco de dados inicializado em: ${this.databasePath}`);
  }

  private async migrarColunas(): Promise<void> {
    if (!this.db) {
      throw new Error('Banco de dados não inicializado.');
    }

    const existing = (await this.db.all(`PRAGMA table_info(vagas)`)) as Array<{ name: string }>;
    const existingNames = new Set(existing.map((col) => col.name));

    for (const column of COLUMNS_TO_MIGRATE) {
      if (!existingNames.has(column.name)) {
        await this.db.exec(column.ddl);
        console.log(`[Database] Coluna adicionada: ${column.name}`);
      }
    }
  }

  private ensureDb(): Database<sqlite3.Database, sqlite3.Statement> {
    if (!this.db) {
      throw new Error('Banco de dados não inicializado. Chame o método init() primeiro.');
    }
    return this.db;
  }

  async vagaExiste(idVaga: string): Promise<boolean> {
    const db = this.ensureDb();
    const row = await db.get('SELECT id_vaga FROM vagas WHERE id_vaga = ?', [idVaga]);
    return !!row;
  }

  async salvarVaga(vaga: Vaga): Promise<void> {
    const db = this.ensureDb();
    const dataEnvio = new Date().toISOString();

    await db.run(
      `INSERT INTO vagas (
        id_vaga, titulo, empresa, localizacao, modelo, link, tipo_busca, status, data_envio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'nova', ?)`,
      [
        vaga.id,
        vaga.titulo,
        vaga.empresa,
        vaga.localizacao,
        vaga.modelo,
        vaga.link,
        vaga.tipoBusca ?? null,
        dataEnvio,
      ]
    );

    console.log(`[Database] Vaga salva: ${vaga.id}`);
  }

  async listarVagas(status?: VagaStatus): Promise<VagaRecord[]> {
    const db = this.ensureDb();

    if (status) {
      return (await db.all(
        `SELECT * FROM vagas WHERE status = ? ORDER BY data_envio DESC`,
        [status]
      )) as VagaRecord[];
    }

    return (await db.all(`SELECT * FROM vagas ORDER BY data_envio DESC`)) as VagaRecord[];
  }

  async buscarPorId(idVaga: string): Promise<VagaRecord | undefined> {
    const db = this.ensureDb();
    return (await db.get(`SELECT * FROM vagas WHERE id_vaga = ?`, [idVaga])) as
      | VagaRecord
      | undefined;
  }

  async atualizarStatus(
    idVaga: string,
    status: VagaStatus,
    notas?: string | null
  ): Promise<VagaRecord | undefined> {
    const db = this.ensureDb();
    const existente = await this.buscarPorId(idVaga);
    if (!existente) {
      return undefined;
    }

    const dataAplicacao = status === 'aplicado' ? new Date().toISOString() : null;
    const notasFinal = notas === undefined ? existente.notas : notas;

    await db.run(
      `UPDATE vagas
       SET status = ?, data_aplicacao = ?, notas = ?
       WHERE id_vaga = ?`,
      [status, dataAplicacao, notasFinal, idVaga]
    );

    return this.buscarPorId(idVaga);
  }

  async salvarDescricao(
    idVaga: string,
    descricao: string,
    fonte: DescricaoFonte
  ): Promise<VagaRecord | undefined> {
    const db = this.ensureDb();
    const existente = await this.buscarPorId(idVaga);
    if (!existente) {
      return undefined;
    }

    const agora = new Date().toISOString();
    await db.run(
      `UPDATE vagas
       SET descricao = ?, descricao_fonte = ?, descricao_atualizada_em = ?
       WHERE id_vaga = ?`,
      [descricao, fonte, agora, idVaga]
    );

    return this.buscarPorId(idVaga);
  }

  async buscarPlanoPorVaga(idVaga: string): Promise<PlanoEstudoRecord | undefined> {
    const db = this.ensureDb();
    return (await db.get(`SELECT * FROM planos_estudo WHERE id_vaga = ?`, [idVaga])) as
      | PlanoEstudoRecord
      | undefined;
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
    const db = this.ensureDb();
    const agora = new Date().toISOString();
    const existente = await this.buscarPlanoPorVaga(idVaga);

    if (existente) {
      await db.run(
        `UPDATE planos_estudo
         SET conteudo_md = ?, modelo_llm = ?, status = ?, erro = ?, atualizado_em = ?
         WHERE id_vaga = ?`,
        [
          data.conteudo_md ?? existente.conteudo_md,
          data.modelo_llm === undefined ? existente.modelo_llm : data.modelo_llm,
          data.status,
          data.erro === undefined ? null : data.erro,
          agora,
          idVaga,
        ]
      );
    } else {
      await db.run(
        `INSERT INTO planos_estudo (
          id_vaga, conteudo_md, modelo_llm, status, erro, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          idVaga,
          data.conteudo_md ?? '',
          data.modelo_llm ?? null,
          data.status,
          data.erro ?? null,
          agora,
          agora,
        ]
      );
    }

    const plano = await this.buscarPlanoPorVaga(idVaga);
    if (!plano) {
      throw new Error(`Falha ao persistir plano para a vaga ${idVaga}`);
    }
    return plano;
  }

  async buscarCurriculo(): Promise<CurriculoRecord | undefined> {
    const db = this.ensureDb();
    return (await db.get(`SELECT * FROM curriculo WHERE id = 1`)) as CurriculoRecord | undefined;
  }

  async salvarCurriculo(data: {
    nome_arquivo: string;
    mime_type: string;
    texto_extraido: string;
  }): Promise<CurriculoRecord> {
    const db = this.ensureDb();
    const agora = new Date().toISOString();
    const existente = await this.buscarCurriculo();

    if (existente) {
      await db.run(
        `UPDATE curriculo
         SET nome_arquivo = ?, mime_type = ?, texto_extraido = ?, atualizado_em = ?
         WHERE id = 1`,
        [data.nome_arquivo, data.mime_type, data.texto_extraido, agora]
      );
    } else {
      await db.run(
        `INSERT INTO curriculo (id, nome_arquivo, mime_type, texto_extraido, atualizado_em)
         VALUES (1, ?, ?, ?, ?)`,
        [data.nome_arquivo, data.mime_type, data.texto_extraido, agora]
      );
    }

    const curriculo = await this.buscarCurriculo();
    if (!curriculo) {
      throw new Error('Falha ao persistir currículo.');
    }
    return curriculo;
  }

  async removerCurriculo(): Promise<void> {
    const db = this.ensureDb();
    await db.run(`DELETE FROM curriculo WHERE id = 1`);
  }

  async fechar(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('[Database] Conexão com o banco de dados fechada.');
    }
  }
}
