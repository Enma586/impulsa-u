import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { empresas } from './empresas.js';
import { direccionInteres, estadoInteres } from './enums.js';
import { talentos } from './perfiles.js';

export const intereses = pgTable(
  'intereses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresas.usuarioId),
    talentoId: uuid('talento_id')
      .notNull()
      .references(() => talentos.usuarioId),
    direccion: direccionInteres('direccion').notNull(),
    mensaje: text('mensaje'),
    estado: estadoInteres('estado').notNull().default('pendiente'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    respondidoEn: timestamp('respondido_en', { withTimezone: true }),
  },
  (tabla) => [
    unique('intereses_par_direccion_unico').on(tabla.empresaId, tabla.talentoId, tabla.direccion),
    check('intereses_mensaje_max_300', sql`char_length(${tabla.mensaje}) <= 300`),
    index('intereses_talento_estado_idx').on(tabla.talentoId, tabla.estado),
    index('intereses_empresa_estado_idx').on(tabla.empresaId, tabla.estado),
  ],
).enableRLS();
