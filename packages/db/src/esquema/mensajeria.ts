import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { usuarios } from './auth.js';
import { intereses } from './conexiones.js';
import { empresas } from './empresas.js';
import { talentos } from './perfiles.js';
import { vacantes } from './vacantes.js';

export const conversaciones = pgTable(
  'conversaciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresas.usuarioId),
    talentoId: uuid('talento_id')
      .notNull()
      .references(() => talentos.usuarioId),
    interesId: uuid('interes_id')
      .notNull()
      .references(() => intereses.id),
    vacanteId: uuid('vacante_id').references(() => vacantes.id),
    /** Última secuencia asignada; se incrementa dentro de la transacción que inserta el mensaje. */
    ultimaSecuencia: bigint('ultima_secuencia', { mode: 'number' }).notNull().default(0),
    ultimoMensajeEn: timestamp('ultimo_mensaje_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    unique('conversaciones_par_unico').on(tabla.empresaId, tabla.talentoId),
    index('conversaciones_talento_idx').on(tabla.talentoId, sql`${tabla.ultimoMensajeEn} DESC`),
    index('conversaciones_empresa_idx').on(tabla.empresaId, sql`${tabla.ultimoMensajeEn} DESC`),
  ],
).enableRLS();

export const mensajes = pgTable(
  'mensajes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversacionId: uuid('conversacion_id')
      .notNull()
      .references(() => conversaciones.id, { onDelete: 'cascade' }),
    secuencia: bigint('secuencia', { mode: 'number' }).notNull(),
    remitenteId: uuid('remitente_id')
      .notNull()
      .references(() => usuarios.id),
    cuerpo: text('cuerpo').notNull(),
    /** Llave de idempotencia del reenvío: el cliente la genera antes de enviar. */
    clientMessageId: uuid('client_message_id').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    unique('mensajes_secuencia_unica').on(tabla.conversacionId, tabla.secuencia),
    unique('mensajes_client_message_id_unico').on(tabla.clientMessageId),
    check('mensajes_cuerpo_longitud', sql`char_length(${tabla.cuerpo}) BETWEEN 1 AND 4000`),
  ],
).enableRLS();

export const lecturas = pgTable(
  'lecturas',
  {
    conversacionId: uuid('conversacion_id')
      .notNull()
      .references(() => conversaciones.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    /** Solo avanza: se actualiza siempre con `GREATEST`. */
    ultimaSecuenciaLeida: bigint('ultima_secuencia_leida', { mode: 'number' }).notNull().default(0),
  },
  (tabla) => [primaryKey({ columns: [tabla.conversacionId, tabla.usuarioId] })],
).enableRLS();

export const bloqueos = pgTable(
  'bloqueos',
  {
    bloqueadorId: uuid('bloqueador_id')
      .notNull()
      .references(() => usuarios.id),
    bloqueadoId: uuid('bloqueado_id')
      .notNull()
      .references(() => usuarios.id),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.bloqueadorId, tabla.bloqueadoId] }),
    check('bloqueos_no_a_si_mismo', sql`${tabla.bloqueadorId} <> ${tabla.bloqueadoId}`),
  ],
).enableRLS();
