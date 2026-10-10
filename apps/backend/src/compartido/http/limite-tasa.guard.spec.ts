import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { LIMITADOR_TASA } from '../dominio/limite-tasa.js';
import type { LimitadorTasa, ResultadoLimite } from '../dominio/limite-tasa.js';
import { CompartidoHttpModule } from './compartido-http.module.js';
import { LimiteTasa, LimiteTasaGuard } from './limite-tasa.guard.js';

@Controller('intentos')
class IntentosController {
  @LimiteTasa({ maximo: 3, ventanaSegundos: 60 })
  @Get('limitada')
  limitada(): { ok: true } {
    return { ok: true };
  }

  @Get('libre')
  libre(): { ok: true } {
    return { ok: true };
  }
}

let respuestaDelLimitador: ResultadoLimite = { permitido: true };
const llamadas: { clave: string; maximo: number; ventanaMs: number }[] = [];

const limitadorSimulado: LimitadorTasa = {
  intentar: (clave, maximo, ventanaMs) => {
    llamadas.push({ clave, maximo, ventanaMs });
    return Promise.resolve(respuestaDelLimitador);
  },
};

@Module({
  imports: [CompartidoHttpModule],
  controllers: [IntentosController],
  providers: [
    { provide: APP_GUARD, useClass: LimiteTasaGuard },
    { provide: LIMITADOR_TASA, useValue: limitadorSimulado },
  ],
})
class PruebaModule {}

let app: NestFastifyApplication;

async function crearApp(): Promise<NestFastifyApplication> {
  const modulo = await Test.createTestingModule({ imports: [PruebaModule] }).compile();
  app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useLogger(false);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

afterEach(async () => {
  respuestaDelLimitador = { permitido: true };
  llamadas.length = 0;
  await app.close();
});

describe('LimiteTasaGuard', () => {
  it('deja pasar mientras el limitador lo permite y usa la configuración de la ruta', async () => {
    const respuesta = await (await crearApp()).inject({ method: 'GET', url: '/intentos/limitada' });
    expect(respuesta.statusCode).toBe(200);
    expect(llamadas[0]).toMatchObject({ maximo: 3, ventanaMs: 60_000 });
  });

  it('CA-00.3 al superar el límite responde 429 con el tiempo de espera', async () => {
    respuestaDelLimitador = { permitido: false, reintentarEnMs: 12_300 };
    const respuesta = await (await crearApp()).inject({ method: 'GET', url: '/intentos/limitada' });
    expect(respuesta.statusCode).toBe(429);
    expect(respuesta.json()).toMatchObject({ code: 'demasiadas_peticiones' });
    expect(respuesta.json<{ message: string }>().message).toContain('13 segundos');
  });

  it('una ruta sin @LimiteTasa no consulta al limitador', async () => {
    const respuesta = await (await crearApp()).inject({ method: 'GET', url: '/intentos/libre' });
    expect(respuesta.statusCode).toBe(200);
    expect(llamadas).toHaveLength(0);
  });
});
