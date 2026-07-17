import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import type { Vaga, VagaRecord, VagaStatus } from '../types/vaga';

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
        notas TEXT
      )
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

  async fechar(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('[Database] Conexão com o banco de dados fechada.');
    }
  }
}
