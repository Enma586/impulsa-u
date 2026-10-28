import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { usuarios } from './auth.js';
import { habilidades } from './catalogos.js';
import { empresas } from './empresas.js';
import {
  departamento,
  estadoPostulacion,
  estadoVacante,
  modalidadVacante,
  motivoDescarte,
  tipoVacante,
} from './enums.js';
import { talentos } from './perfiles.js';
import { proyectos } from './proyectos.js';

export const vacantes = pgTable(
  'vacantes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresas.usuarioId),
    titulo: text('titulo').notNull(),
    descripcion: text('descripcion').notNull(),
    tipo: tipoVacante('tipo').notNull(),
    modalidad: modalidadVacante('modalidad').notNull(),
    departamento: departamento('departamento'),
    estado: estadoVacante('estado').notNull().default('borrador'),
    version: integer('version').notNull().default(1),
    publicadaEn: timestamp('publicada_en', { withTimezone: true }),
    cerradaEn: timestamp('cerrada_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
  },
  (tabla) => [
    index('vacantes_estado_idx')
      .on(tabla.estado, sql`${tabla.publicadaEn} DESC`)
      .where(sql`${tabla.eliminadoEn} IS NULL`),
  ],
).enableRLS();

export const vacanteHabilidades = pgTable(
  'vacante_habilidades',
  {
    vacanteId: uuid('vacante_id')
      .notNull()
      .references(() => vacantes.id, { onDelete: 'cascade' }),
    habilidadId: uuid('habilidad_id')
      .notNull()
      .references(() => habilidades.id),
    requerida: boolean('requerida').notNull(),
  },
  (tabla) => [primaryKey({ columns: [tabla.vacanteId, tabla.habilidadId] })],
).enableRLS();

export const postulaciones = pgTable(
  'postulaciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vacanteId: uuid('vacante_id')
      .notNull()
      .references(() => vacantes.id),
    talentoId: uuid('talento_id')
      .notNull()
      .references(() => talentos.usuarioId),
    estado: estadoPostulacion('estado').notNull().default('recibida'),
    motivoDescarte: motivoDescarte('motivo_descarte'),
    detalleDescarte: text('detalle_descarte'),
    version: integer('version').notNull().default(1),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    unique('postulaciones_talento_vacante_unico').on(tabla.talentoId, tabla.vacanteId),
    check(
      'postulaciones_descarte_con_motivo',
      sql`${tabla.estado} <> 'descartada' OR ${tabla.motivoDescarte} IS NOT NULL`,
    ),
    index('postulaciones_vacante_estado_idx').on(tabla.vacanteId, tabla.estado),
  ],
).enableRLS();

export const postulacionProyectos = pgTable(
  'postulacion_proyectos',
  {
    postulacionId: uuid('postulacion_id')
      .notNull()
      .references(() => postulaciones.id, { onDelete: 'cascade' }),
    proyectoId: uuid('proyecto_id')
      .notNull()
      .references(() => proyectos.id),
  },
  (tabla) => [primaryKey({ columns: [tabla.postulacionId, tabla.proyectoId] })],
).enableRLS();

export const historialPostulaciones = pgTable('historial_postulaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  postulacionId: uuid('postulacion_id')
    .notNull()
    .references(() => postulaciones.id, { onDelete: 'cascade' }),
  deEstado: estadoPostulacion('de_estado'),
  aEstado: estadoPostulacion('a_estado').notNull(),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => usuarios.id),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
