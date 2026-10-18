import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

/** Número fijo del candado: impide que dos procesos migren a la vez. */
const CANDADO_MIGRACIONES = 7_260_001;

export async function migrar(url: string): Promise<void> {
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  try {
    await sql`SELECT pg_advisory_lock(${CANDADO_MIGRACIONES})`;
    await migrate(drizzle(sql), {
      migrationsFolder: fileURLToPath(new URL('../migraciones', import.meta.url)),
    });
  } finally {
    await sql`SELECT pg_advisory_unlock(${CANDADO_MIGRACIONES})`;
    await sql.end();
  }
}
