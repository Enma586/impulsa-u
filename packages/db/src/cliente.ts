import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as esquema from './esquema/index.js';

export type ConexionBaseDeDatos = ReturnType<typeof crearBaseDeDatos>;
export type BaseDeDatos = ConexionBaseDeDatos['db'];

/** Pool pequeño por proceso; `cerrar` libera las conexiones al apagar. */
export function crearBaseDeDatos(url: string, maximoConexiones = 5) {
  const sql = postgres(url, { max: maximoConexiones, onnotice: () => undefined });
  return { db: drizzle(sql, { schema: esquema }), sql, cerrar: () => sql.end() };
}
