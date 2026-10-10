import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { usuarios } from './auth.js';
import { carreras, instituciones } from './catalogos.js';
import { departamento, estadoAcademico } from './enums.js';

const VEINTE_MB = 20 * 1024 * 1024;

export const talentos = pgTable(
  'talentos',
  {
    usuarioId: uuid('usuario_id')
      .primaryKey()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    nombreCompleto: text('nombre_completo').notNull(),
    carreraId: uuid('carrera_id').references(() => carreras.id, { onDelete: 'set null' }),
    institucionId: uuid('institucion_id').references(() => instituciones.id, {
      onDelete: 'set null',
    }),
    estadoAcademico: estadoAcademico('estado_academico').notNull(),
    ciclo: smallint('ciclo'),
    anioEgreso: smallint('anio_egreso'),
    departamento: departamento('departamento'),
    bio: text('bio'),
    declaracionSinExperienciaEn: timestamp('declaracion_sin_experiencia_en', {
      withTimezone: true,
    }).notNull(),
    primerEmpleoEn: timestamp('primer_empleo_en', { withTimezone: true }),
    /** Qué campos del perfil son públicos; la forma la valida Zod al leer. */
    privacidad: jsonb('privacidad').notNull().default({}),
    almacenamientoUsadoBytes: bigint('almacenamiento_usado_bytes', { mode: 'number' })
      .notNull()
      .default(0),
    almacenamientoLimiteBytes: bigint('almacenamiento_limite_bytes', { mode: 'number' })
      .notNull()
      .default(VEINTE_MB),
    version: integer('version').notNull().default(1),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check(
      'talentos_ciclo_o_anio_segun_estado',
      sql`(${tabla.estadoAcademico} = 'estudiante' AND ${tabla.ciclo} IS NOT NULL) OR (${tabla.estadoAcademico} = 'egresado' AND ${tabla.anioEgreso} IS NOT NULL)`,
    ),
    check(
      'talentos_almacenamiento_dentro_del_limite',
      sql`${tabla.almacenamientoUsadoBytes} <= ${tabla.almacenamientoLimiteBytes}`,
    ),
    check('talentos_bio_maximo_600', sql`char_length(${tabla.bio}) <= 600`),
    index('talentos_busqueda_idx')
      .on(tabla.carreraId, tabla.estadoAcademico, tabla.departamento)
      .where(sql`${tabla.primerEmpleoEn} IS NULL`),
  ],
);
