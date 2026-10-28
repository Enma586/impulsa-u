import { sql } from 'drizzle-orm';
import {
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
import { archivos } from './archivos.js';
import { usuarios } from './auth.js';
import { habilidades } from './catalogos.js';
import { estadoProyecto } from './enums.js';
import { talentos } from './perfiles.js';

export const proyectos = pgTable(
  'proyectos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    autorId: uuid('autor_id')
      .notNull()
      .references(() => talentos.usuarioId),
    titulo: text('titulo').notNull(),
    descripcion: text('descripcion').notNull(),
    materia: text('materia'),
    periodo: text('periodo'),
    urlRepositorio: text('url_repositorio'),
    urlDemo: text('url_demo'),
    urlVideo: text('url_video'),
    estado: estadoProyecto('estado').notNull().default('borrador'),
    likes: integer('likes').notNull().default(0),
    reposts: integer('reposts').notNull().default(0),
    comentarios: integer('comentarios').notNull().default(0),
    compartidos: integer('compartidos').notNull().default(0),
    version: integer('version').notNull().default(1),
    versionContenido: integer('version_contenido').notNull().default(1),
    publicadoEn: timestamp('publicado_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
  },
  (tabla) => [
    check('proyectos_titulo_5_120', sql`char_length(${tabla.titulo}) BETWEEN 5 AND 120`),
    check('proyectos_descripcion_maximo_5000', sql`char_length(${tabla.descripcion}) <= 5000`),
    index('proyectos_feed_idx')
      .on(sql`${tabla.publicadoEn} DESC`, sql`${tabla.id} DESC`)
      .where(sql`${tabla.estado} = 'publicado' AND ${tabla.eliminadoEn} IS NULL`),
    index('proyectos_autor_idx').on(tabla.autorId, sql`${tabla.publicadoEn} DESC`),
  ],
).enableRLS();

export const proyectoTecnologias = pgTable(
  'proyecto_tecnologias',
  {
    proyectoId: uuid('proyecto_id')
      .notNull()
      .references(() => proyectos.id, { onDelete: 'cascade' }),
    habilidadId: uuid('habilidad_id')
      .notNull()
      .references(() => habilidades.id),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.proyectoId, tabla.habilidadId] }),
    index('proyecto_tecnologias_habilidad_idx').on(tabla.habilidadId),
  ],
).enableRLS();

export const proyectoArchivos = pgTable(
  'proyecto_archivos',
  {
    proyectoId: uuid('proyecto_id')
      .notNull()
      .references(() => proyectos.id, { onDelete: 'cascade' }),
    archivoId: uuid('archivo_id')
      .notNull()
      .references(() => archivos.id),
    orden: integer('orden').notNull(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.proyectoId, tabla.archivoId] }),
    unique('proyecto_archivos_orden_unico').on(tabla.proyectoId, tabla.orden),
  ],
).enableRLS();

export const likes = pgTable(
  'likes',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    proyectoId: uuid('proyecto_id')
      .notNull()
      .references(() => proyectos.id, { onDelete: 'cascade' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.usuarioId, tabla.proyectoId] }),
    index('likes_proyecto_idx').on(tabla.proyectoId),
  ],
).enableRLS();
