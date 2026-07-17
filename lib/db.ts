import { DatabaseService, resolveDatabasePath } from '../src/database';

let service: DatabaseService | null = null;
let initPromise: Promise<DatabaseService> | null = null;

export async function getJobsDb(): Promise<DatabaseService> {
  if (service) {
    return service;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const db = new DatabaseService(resolveDatabasePath());
      await db.init();
      service = db;
      return db;
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}
