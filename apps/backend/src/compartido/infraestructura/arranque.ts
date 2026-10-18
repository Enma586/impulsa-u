import type { Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { ENTORNO } from './configuracion.module.js';
import { leerEntorno } from './entorno.js';
import type { Entorno } from './entorno.js';

/** Con `TRUST_PROXY` en 0 se ignora `X-Forwarded-For`; con N, se confía en N proxies delante. */
export function crearAdaptador(entorno: Pick<Entorno, 'TRUST_PROXY'>): FastifyAdapter {
  return new FastifyAdapter({
    requestIdHeader: 'x-request-id',
    trustProxy: (_direccion, salto) => salto < entorno.TRUST_PROXY,
  });
}

export async function iniciarHttp(modulo: Type<unknown>): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    modulo,
    crearAdaptador(leerEntorno(process.env)),
    {
      bufferLogs: true,
    },
  );
  const entorno = app.get<Entorno>(ENTORNO);
  app.useLogger(app.get(Logger));
  app.enableCors({ origin: entorno.CORS_ORIGIN });
  app.enableShutdownHooks();
  await app.listen(entorno.PORT, '0.0.0.0');
}

export async function iniciarWorker(modulo: Type<unknown>): Promise<void> {
  const app = await NestFactory.createApplicationContext(modulo, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
}
