import { describe, expect, it } from 'vitest';
import { leerEntorno } from './entorno.js';

const valido = {
  NODE_ENV: 'test',
  PORT: '3000',
  CORS_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://usuario:clave@localhost:5432/base',
  DATABASE_URL_MIGRACIONES: 'postgresql://usuario:clave@localhost:5432/base',
  MIGRAR_AL_INICIAR: 'false',
  REDIS_URL: 'redis://localhost:6379',
  SUPABASE_URL: 'https://proyecto.supabase.co',
  SUPABASE_JWKS_URL: 'https://proyecto.supabase.co/auth/v1/.well-known/jwks.json',
  SUPABASE_SERVICE_ROLE_KEY: 'llave',
  AI_SERVICE_URL: 'http://localhost:4000',
  AI_SERVICE_TOKEN: 'x'.repeat(32),
};

describe('leerEntorno', () => {
  it('convierte los valores válidos', () => {
    const entorno = leerEntorno(valido);
    expect(entorno.PORT).toBe(3000);
    expect(entorno.MIGRAR_AL_INICIAR).toBe(false);
  });

  it('rechaza variables inválidas y nombra los campos sin mostrar valores', () => {
    const intento = () => leerEntorno({ ...valido, PORT: 'abc', AI_SERVICE_TOKEN: 'corto' });
    expect(intento).toThrow('PORT, AI_SERVICE_TOKEN');
  });

  it('rechaza variables ausentes', () => {
    expect(() => leerEntorno({})).toThrow('Variables de entorno inválidas');
  });
});
