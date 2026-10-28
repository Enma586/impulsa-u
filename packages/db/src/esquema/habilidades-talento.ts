import {
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { habilidades } from './catalogos.js';
import { tipoEnlace } from './enums.js';
import { talentos } from './perfiles.js';

export const talentoHabilidades = pgTable(
  'talento_habilidades',
  {
    talentoId: uuid('talento_id')
      .notNull()
      .references(() => talentos.usuarioId, { onDelete: 'cascade' }),
    habilidadId: uuid('habilidad_id')
      .notNull()
      .references(() => habilidades.id),
  },
  (tabla) => [primaryKey({ columns: [tabla.talentoId, tabla.habilidadId] })],
).enableRLS();

export const evidenciaHabilidades = pgTable(
  'evidencia_habilidades',
  {
    talentoId: uuid('talento_id')
      .notNull()
      .references(() => talentos.usuarioId, { onDelete: 'cascade' }),
    habilidadId: uuid('habilidad_id')
      .notNull()
      .references(() => habilidades.id),
    proyectos: smallint('proyectos').notNull(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.talentoId, tabla.habilidadId] }),
    index('evidencia_habilidades_busqueda_idx').on(tabla.habilidadId, tabla.proyectos),
  ],
).enableRLS();

export const enlacesTalento = pgTable('enlaces_talento', {
  id: uuid('id').primaryKey().defaultRandom(),
  talentoId: uuid('talento_id')
    .notNull()
    .references(() => talentos.usuarioId, { onDelete: 'cascade' }),
  tipo: tipoEnlace('tipo').notNull(),
  url: text('url').notNull(),
  orden: integer('orden').notNull().default(0),
}).enableRLS();
