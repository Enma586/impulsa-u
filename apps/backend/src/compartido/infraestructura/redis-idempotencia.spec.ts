import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';
import { RedisAlmacenIdempotencia } from './redis-idempotencia.js';

const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');
const almacen = new RedisAlmacenIdempotencia(redis);

afterAll(async () => {
  await redis.quit();
});

describe('RedisAlmacenIdempotencia', () => {
  it('la primera vez reserva la llave y la repetición ve que sigue en curso', async () => {
    const llave = randomUUID();
    expect(await almacen.iniciar(llave, 'huella')).toEqual({ tipo: 'nueva' });
    expect(await almacen.iniciar(llave, 'huella')).toEqual({ tipo: 'en_curso' });
    await almacen.liberar(llave);
  });

  it('tras completar, repetir la llave devuelve el resultado guardado', async () => {
    const llave = randomUUID();
    await almacen.iniciar(llave, 'huella');
    await almacen.completar(llave, 'huella', { estado: 'revisa_tu_correo' });
    expect(await almacen.iniciar(llave, 'huella')).toEqual({
      tipo: 'repetida',
      cuerpo: { estado: 'revisa_tu_correo' },
    });
    await almacen.liberar(llave);
  });

  it('la misma llave con otra huella se reconoce como reutilizada', async () => {
    const llave = randomUUID();
    await almacen.iniciar(llave, 'huella-a');
    expect(await almacen.iniciar(llave, 'huella-b')).toEqual({ tipo: 'huella_distinta' });
    await almacen.liberar(llave);
  });

  it('al liberar la llave se puede volver a intentar', async () => {
    const llave = randomUUID();
    await almacen.iniciar(llave, 'huella');
    await almacen.liberar(llave);
    expect(await almacen.iniciar(llave, 'huella')).toEqual({ tipo: 'nueva' });
    await almacen.liberar(llave);
  });

  it('CA-01.8 diez peticiones simultáneas con la misma llave solo dejan pasar una', async () => {
    const llave = randomUUID();
    const resultados = await Promise.all(
      Array.from({ length: 10 }, () => almacen.iniciar(llave, 'huella')),
    );
    expect(resultados.filter((r) => r.tipo === 'nueva')).toHaveLength(1);
    expect(resultados.filter((r) => r.tipo === 'en_curso')).toHaveLength(9);
    await almacen.liberar(llave);
  });
});
