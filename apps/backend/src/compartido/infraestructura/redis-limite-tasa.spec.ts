import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';
import { RedisLimitadorTasa } from './redis-limite-tasa.js';

const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');
const limitador = new RedisLimitadorTasa(redis);

afterAll(async () => {
  await redis.quit();
});

describe('RedisLimitadorTasa', () => {
  it('permite hasta el máximo y bloquea el siguiente con el tiempo de espera', async () => {
    const clave = randomUUID();
    for (let intento = 0; intento < 3; intento++) {
      expect(await limitador.intentar(clave, 3, 5_000)).toEqual({ permitido: true });
    }
    const bloqueado = await limitador.intentar(clave, 3, 5_000);
    expect(bloqueado.permitido).toBe(false);
    if (!bloqueado.permitido) {
      expect(bloqueado.reintentarEnMs).toBeGreaterThan(0);
      expect(bloqueado.reintentarEnMs).toBeLessThanOrEqual(5_000);
    }
  });

  it('cada clave lleva su propia cuenta', async () => {
    const a = randomUUID();
    const b = randomUUID();
    await limitador.intentar(a, 1, 5_000);
    expect((await limitador.intentar(a, 1, 5_000)).permitido).toBe(false);
    expect((await limitador.intentar(b, 1, 5_000)).permitido).toBe(true);
  });

  it('al pasar la ventana vuelve a permitir', async () => {
    const clave = randomUUID();
    await limitador.intentar(clave, 1, 300);
    expect((await limitador.intentar(clave, 1, 300)).permitido).toBe(false);
    await new Promise((resolver) => setTimeout(resolver, 400));
    expect((await limitador.intentar(clave, 1, 300)).permitido).toBe(true);
  });

  it('con peticiones simultáneas nunca deja pasar más del máximo', async () => {
    const clave = randomUUID();
    const resultados = await Promise.all(
      Array.from({ length: 20 }, () => limitador.intentar(clave, 5, 5_000)),
    );
    expect(resultados.filter((r) => r.permitido)).toHaveLength(5);
  });
});
