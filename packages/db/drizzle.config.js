import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/esquema/index.ts',
  out: './migraciones',
  schemaFilter: ['public'],
  dbCredentials: { url: process.env.DATABASE_URL_MIGRACIONES ?? '' },
});
