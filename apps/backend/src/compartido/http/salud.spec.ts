import { Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { CompartidoHttpModule } from './compartido-http.module.js';
import { COMPROBADORES_LISTO } from './salud.controller.js';
import type { ComprobadorListo } from './salud.controller.js';

@Controller('rota')
class RotaController {
  @Get()
  rota(): never {
    throw new Error('detalle interno que no debe salir');
  }
}

@Module({ imports: [CompartidoHttpModule], controllers: [RotaController] })
class PruebaModule {}

let app: NestFastifyApplication;

async function crearApp(comprobadores: ComprobadorListo[] = []): Promise<NestFastifyApplication> {
  const modulo = await Test.createTestingModule({ imports: [PruebaModule] })
    .overrideProvider(COMPROBADORES_LISTO)
    .useValue(comprobadores)
    .compile();
  app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useLogger(false);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

afterEach(async () => {
  await app.close();
});

describe('salud y filtro de errores', () => {
  it('GET /salud responde vivo', async () => {
    const respuesta = await (await crearApp()).inject({ method: 'GET', url: '/salud' });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ estado: 'vivo' });
  });

  it('GET /salud/listo responde 200 si todas las dependencias responden', async () => {
    const ok: ComprobadorListo = { nombre: 'base_de_datos', comprobar: () => Promise.resolve() };
    const respuesta = await (await crearApp([ok])).inject({ method: 'GET', url: '/salud/listo' });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ estado: 'listo' });
  });

  it('GET /salud/listo responde 503 y nombra la dependencia caída', async () => {
    const caida: ComprobadorListo = {
      nombre: 'redis',
      comprobar: () => Promise.reject(new Error('sin conexión')),
    };
    const respuesta = await (
      await crearApp([caida])
    ).inject({ method: 'GET', url: '/salud/listo' });
    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.json()).toEqual({ estado: 'no_listo', fallos: ['redis'] });
  });

  it('una ruta inexistente responde 404 con el formato del contrato', async () => {
    const respuesta = await (await crearApp()).inject({ method: 'GET', url: '/no-existe' });
    expect(respuesta.statusCode).toBe(404);
    expect(respuesta.json()).toMatchObject({ code: 'no_encontrado' });
  });

  it('un error inesperado responde 500 genérico sin filtrar detalles', async () => {
    const respuesta = await (await crearApp()).inject({ method: 'GET', url: '/rota' });
    expect(respuesta.statusCode).toBe(500);
    expect(respuesta.json()).toEqual({
      code: 'error_interno',
      message: 'Ocurrió un error inesperado',
    });
  });
});
