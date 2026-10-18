import { createHash, randomUUID } from 'node:crypto';
import { Body, Controller, HttpCode, Post, UseInterceptors } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { ALMACEN_IDEMPOTENCIA } from '../dominio/idempotencia.js';
import type { AlmacenIdempotencia, InicioIdempotencia } from '../dominio/idempotencia.js';
import { CompartidoHttpModule } from './compartido-http.module.js';
import { IdempotenciaInterceptor } from './idempotencia.interceptor.js';

let ejecuciones = 0;
let fallar = false;

@Controller('cosas')
class CosasController {
  @Post()
  @HttpCode(202)
  @UseInterceptors(IdempotenciaInterceptor)
  crear(@Body() cuerpo: unknown): { numero: number; cuerpo: unknown } {
    if (fallar) throw new Error('fallo interno');
    ejecuciones += 1;
    return { numero: ejecuciones, cuerpo };
  }
}

type Registro = { huella: string; cuerpo?: unknown };

class AlmacenEnMemoria implements AlmacenIdempotencia {
  readonly registros = new Map<string, Registro>();

  iniciar(llave: string, huella: string): Promise<InicioIdempotencia> {
    const existente = this.registros.get(llave);
    if (!existente) {
      this.registros.set(llave, { huella });
      return Promise.resolve({ tipo: 'nueva' });
    }
    if (existente.huella !== huella) return Promise.resolve({ tipo: 'huella_distinta' });
    return Promise.resolve(
      'cuerpo' in existente ? { tipo: 'repetida', cuerpo: existente.cuerpo } : { tipo: 'en_curso' },
    );
  }

  completar(llave: string, huella: string, cuerpo: unknown): Promise<void> {
    this.registros.set(llave, { huella, cuerpo });
    return Promise.resolve();
  }

  liberar(llave: string): Promise<void> {
    this.registros.delete(llave);
    return Promise.resolve();
  }
}

const almacen = new AlmacenEnMemoria();

@Module({
  imports: [CompartidoHttpModule],
  controllers: [CosasController],
  providers: [{ provide: ALMACEN_IDEMPOTENCIA, useValue: almacen }],
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

function crear(servidor: NestFastifyApplication, cuerpo: object, llave?: string) {
  return servidor.inject({
    method: 'POST',
    url: '/cosas',
    payload: cuerpo,
    ...(llave ? { headers: { 'idempotency-key': llave } } : {}),
  });
}

afterEach(async () => {
  ejecuciones = 0;
  fallar = false;
  almacen.registros.clear();
  await app.close();
});

describe('IdempotenciaInterceptor', () => {
  it('sin Idempotency-Key responde 422', async () => {
    const respuesta = await crear(await crearApp(), { a: 1 });
    expect(respuesta.statusCode).toBe(422);
    expect(respuesta.json()).toMatchObject({ code: 'validacion' });
  });

  it('con una llave que no es uuid responde 422', async () => {
    const respuesta = await crear(await crearApp(), { a: 1 }, 'no-es-uuid');
    expect(respuesta.statusCode).toBe(422);
  });

  it('CA-01.8 repetir la misma llave y el mismo cuerpo ejecuta una sola vez y devuelve lo mismo', async () => {
    const servidor = await crearApp();
    const llave = randomUUID();
    const primera = await crear(servidor, { a: 1 }, llave);
    const segunda = await crear(servidor, { a: 1 }, llave);
    expect(primera.statusCode).toBe(202);
    expect(segunda.statusCode).toBe(202);
    expect(segunda.json()).toEqual(primera.json());
    expect(ejecuciones).toBe(1);
  });

  it('la misma llave con otro cuerpo responde 422 idempotencia_reutilizada', async () => {
    const servidor = await crearApp();
    const llave = randomUUID();
    await crear(servidor, { a: 1 }, llave);
    const respuesta = await crear(servidor, { a: 2 }, llave);
    expect(respuesta.statusCode).toBe(422);
    expect(respuesta.json()).toMatchObject({ code: 'idempotencia_reutilizada' });
    expect(ejecuciones).toBe(1);
  });

  it('si la primera sigue en curso responde 409', async () => {
    const servidor = await crearApp();
    const llave = randomUUID();
    await almacen.iniciar(`anonimo:POST:/cosas:${llave}`, huellaDe({ a: 1 }));
    const respuesta = await crear(servidor, { a: 1 }, llave);
    expect(respuesta.statusCode).toBe(409);
  });

  it('si la ejecución falla libera la llave para poder reintentar', async () => {
    const servidor = await crearApp();
    const llave = randomUUID();
    fallar = true;
    expect((await crear(servidor, { a: 1 }, llave)).statusCode).toBe(500);
    fallar = false;
    expect((await crear(servidor, { a: 1 }, llave)).statusCode).toBe(202);
    expect(ejecuciones).toBe(1);
  });
});

function huellaDe(cuerpo: object): string {
  return createHash('sha256').update(JSON.stringify(cuerpo)).digest('hex');
}
