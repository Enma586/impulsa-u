import { customType, pgSchema, uuid } from 'drizzle-orm/pg-core';

/** Texto sin distinción de mayúsculas (extensión `citext`). */
export const citext = customType<{ data: string }>({
  dataType: () => 'citext',
});

/** Usuarios que administra Supabase Auth; solo se referencia, nunca se migra. */
export const usuariosAuth = pgSchema('auth').table('users', {
  id: uuid('id').primaryKey(),
});
