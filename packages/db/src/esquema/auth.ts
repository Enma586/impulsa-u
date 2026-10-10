import { sql } from 'drizzle-orm';
import { check, date, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { citext, usuariosAuth } from './comun.js';
import { estadoUsuario, rolUsuario } from './enums.js';

export const usuarios = pgTable(
  'usuarios',
  {
    /** Es el mismo id del usuario en Supabase Auth. */
    id: uuid('id')
      .primaryKey()
      .references(() => usuariosAuth.id, { onDelete: 'cascade' }),
    correo: citext('correo').notNull().unique(),
    rol: rolUsuario('rol').notNull(),
    estado: estadoUsuario('estado').notNull().default('pendiente_verificacion'),
    fechaNacimiento: date('fecha_nacimiento'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
  },
  (tabla) => [
    check(
      'usuarios_talento_con_fecha_nacimiento',
      sql`${tabla.rol} <> 'talento' OR ${tabla.fechaNacimiento} IS NOT NULL`,
    ),
  ],
).enableRLS();
