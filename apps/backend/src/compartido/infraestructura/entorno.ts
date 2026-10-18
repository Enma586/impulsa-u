import { z } from 'zod';

const Entorno = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive(),
  CORS_ORIGIN: z.url(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  DATABASE_URL: z.url(),
  DATABASE_URL_MIGRACIONES: z.url(),
  MIGRAR_AL_INICIAR: z.enum(['true', 'false']).transform((valor) => valor === 'true'),
  REDIS_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_JWKS_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  AI_SERVICE_URL: z.url(),
  AI_SERVICE_TOKEN: z.string().min(32),
});

export type Entorno = z.infer<typeof Entorno>;

/** Valida las variables de entorno; el proceso no arranca si alguna es inválida. */
export function leerEntorno(fuente: unknown): Entorno {
  const resultado = Entorno.safeParse(fuente);
  if (!resultado.success) {
    const campos = resultado.error.issues.map((problema) => problema.path.join('.')).join(', ');
    throw new Error(`Variables de entorno inválidas: ${campos}`);
  }
  return resultado.data;
}
