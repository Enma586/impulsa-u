import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { describe, expect, it } from 'vitest';
import { crearAdaptador, opcionesCors } from './arranque.js';

async function ipDelCliente(trustProxy: number): Promise<string> {
  const adaptador = crearAdaptador({ TRUST_PROXY: trustProxy });
  const servidor = adaptador.getInstance();
  servidor.get('/ip', (solicitud) => solicitud.ip);
  await servidor.ready();
  const respuesta = await servidor.inject({
    method: 'GET',
    url: '/ip',
    remoteAddress: '10.0.0.1',
    headers: { 'x-forwarded-for': '203.0.113.7' },
  });
  await servidor.close();
  return respuesta.body;
}

describe('crearAdaptador', () => {
  it('ignora X-Forwarded-For cuando TRUST_PROXY es 0', async () => {
    expect(await ipDelCliente(0)).toBe('10.0.0.1');
  });

  it('usa la IP del cliente real cuando TRUST_PROXY es 1', async () => {
    expect(await ipDelCliente(1)).toBe('203.0.113.7');
  });
});

describe('opcionesCors', () => {
  async function preflight(metodo: string) {
    const modulo = await Test.createTestingModule({}).compile();
    const app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.enableCors(opcionesCors('http://localhost:5173'));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const respuesta = await app.inject({
      method: 'OPTIONS',
      url: '/proyectos/1',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': metodo,
        'access-control-request-headers': 'authorization,content-type,idempotency-key',
      },
    });
    await app.close();
    return respuesta.headers;
  }

  it.each(['PUT', 'DELETE', 'POST'])(
    'el preflight autoriza %s desde el origen permitido',
    async (metodo) => {
      const cabeceras = await preflight(metodo);
      expect(cabeceras['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(String(cabeceras['access-control-allow-methods'])).toContain(metodo);
      expect(String(cabeceras['access-control-allow-headers'])).toContain('idempotency-key');
    },
  );
});
