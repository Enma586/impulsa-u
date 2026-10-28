import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { departamento } from './enums.js';

export const habilidades = pgTable(
  'habilidades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nombre: text('nombre').notNull(),
    slug: text('slug').notNull().unique(),
    categoria: text('categoria').notNull(),
    activa: boolean('activa').notNull().default(true),
  },
  (tabla) => [index('habilidades_nombre_trgm_idx').using('gin', sql`${tabla.nombre} gin_trgm_ops`)],
).enableRLS();

export const carreras = pgTable('carreras', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  slug: text('slug').notNull().unique(),
}).enableRLS();

export const instituciones = pgTable('instituciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  slug: text('slug').notNull().unique(),
  departamento: departamento('departamento'),
}).enableRLS();
