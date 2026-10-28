import { sql } from 'drizzle-orm';
import { bigint, check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { usuarios } from './auth.js';
import { estadoArchivo, propositoArchivo, visibilidadArchivo } from './enums.js';

export const archivos = pgTable(
  'archivos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propietarioId: uuid('propietario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    clave: text('clave').notNull().unique(),
    proposito: propositoArchivo('proposito').notNull(),
    visibilidad: visibilidadArchivo('visibilidad').notNull(),
    tipoMime: text('tipo_mime').notNull(),
    tamanoBytes: bigint('tamano_bytes', { mode: 'number' }).notNull(),
    estado: estadoArchivo('estado').notNull().default('pendiente'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    confirmadoEn: timestamp('confirmado_en', { withTimezone: true }),
  },
  (tabla) => [
    check('archivos_tamano_positivo', sql`${tabla.tamanoBytes} > 0`),
    index('archivos_pendientes_idx')
      .on(tabla.creadoEn)
      .where(sql`${tabla.estado} = 'pendiente'`),
  ],
).enableRLS();
