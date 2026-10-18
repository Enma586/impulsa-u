import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { departamento } from './enums.js';

export const carreras = pgTable('carreras', {
  id: uuid('id').primaryKey(),
  nombre: text('nombre').notNull(),
  slug: text('slug').notNull().unique(),
}).enableRLS();

export const instituciones = pgTable('instituciones', {
  id: uuid('id').primaryKey(),
  nombre: text('nombre').notNull(),
  slug: text('slug').notNull().unique(),
  departamento: departamento('departamento'),
}).enableRLS();
