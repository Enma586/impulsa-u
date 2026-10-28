import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { usuarios } from './auth.js';
import { estadoVerificacionEmpresa } from './enums.js';

export const empresas = pgTable(
  'empresas',
  {
    usuarioId: uuid('usuario_id')
      .primaryKey()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    nombreComercial: text('nombre_comercial').notNull(),
    nombreLegal: text('nombre_legal'),
    sector: text('sector'),
    sitioWeb: text('sitio_web'),
    descripcion: text('descripcion'),
    estadoVerificacion: estadoVerificacionEmpresa('estado_verificacion')
      .notNull()
      .default('sin_solicitar'),
    verificadaEn: timestamp('verificada_en', { withTimezone: true }),
    esAgencia: boolean('es_agencia').notNull().default(false),
    clienteDeclarado: text('cliente_declarado'),
    version: integer('version').notNull().default(1),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check(
      'empresas_agencia_con_cliente',
      sql`NOT ${tabla.esAgencia} OR ${tabla.clienteDeclarado} IS NOT NULL`,
    ),
  ],
).enableRLS();
