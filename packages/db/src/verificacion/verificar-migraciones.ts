import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { migrar } from '../migrar.js';
import { esDestructiva, leerCambios, migracionesModificadas, migracionesNuevas } from './reglas.js';
import type { CambioArchivo } from './reglas.js';

const raizDb = resolve(import.meta.dirname, '../..');
const raizRepo = resolve(raizDb, '../..');
const base = process.env['BASE_REF'] ?? 'origin/develop';
const urlAdmin =
  process.env['DATABASE_URL_VERIFICACION'] ??
  'postgres://impulsau:impulsau@localhost:5432/impulsau';
const destructivaAprobada = process.env['MIGRACION_DESTRUCTIVA_APROBADA'] === 'true';

const fallos: string[] = [];

function ejecutar(comando: string, argumentos: string[]): string {
  return execFileSync(comando, argumentos, {
    cwd: raizDb,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

function cambiosContraBase(): CambioArchivo[] {
  const salida = ejecutar('git', [
    'diff',
    '--name-status',
    '-M',
    `${base}...HEAD`,
    '--',
    'migraciones',
  ]);
  return leerCambios(salida);
}

function esquemaSinMigracion(): void {
  ejecutar('pnpm', ['exec', 'drizzle-kit', 'generate']);
  const pendientes = ejecutar('git', ['status', '--porcelain', '--', 'migraciones']).trim();
  if (pendientes !== '') {
    fallos.push(`El esquema cambió sin migración. Archivos generados:\n${pendientes}`);
  }
}

function consistencia(): void {
  try {
    ejecutar('pnpm', ['exec', 'drizzle-kit', 'check']);
  } catch {
    fallos.push('drizzle-kit check encontró un historial de migraciones inconsistente');
  }
}

function inmutables(cambios: CambioArchivo[]): void {
  for (const ruta of migracionesModificadas(cambios)) {
    fallos.push(`Una migración existente no se puede editar, borrar ni renombrar: ${ruta}`);
  }
}

function destructivas(cambios: CambioArchivo[]): void {
  if (destructivaAprobada) return;
  for (const ruta of migracionesNuevas(cambios)) {
    if (esDestructiva(readFileSync(resolve(raizRepo, ruta), 'utf8'))) {
      fallos.push(`Operación destructiva en ${ruta}: requiere la etiqueta migracion-destructiva`);
    }
  }
}

async function desdeCero(): Promise<void> {
  const nombre = `verificacion_${randomUUID().replaceAll('-', '')}`;
  const urlBase = new URL(urlAdmin);
  urlBase.pathname = `/${nombre}`;
  const admin = postgres(urlAdmin, { max: 1, onnotice: () => undefined });
  try {
    await admin.unsafe(`CREATE DATABASE ${nombre}`);
    const vacia = postgres(urlBase.toString(), { max: 1, onnotice: () => undefined });
    try {
      // Supabase ya trae `auth.users`; en un Postgres vacío hay que imitarla.
      await vacia.unsafe('CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY)');
    } finally {
      await vacia.end();
    }
    await migrar(urlBase.toString());
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'error desconocido';
    fallos.push(`Las migraciones no se aplican sobre una base vacía: ${detalle}`);
  } finally {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${nombre} WITH (FORCE)`);
    await admin.end();
  }
}

esquemaSinMigracion();
consistencia();
const cambios = cambiosContraBase();
inmutables(cambios);
destructivas(cambios);
await desdeCero();

if (fallos.length > 0) {
  console.error(fallos.join('\n\n'));
  process.exit(1);
}
console.log('Migraciones verificadas');
