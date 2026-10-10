import type { Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { ENTORNO } from './configuracion.module.js';
import type { Entorno } from './entorno.js';

export async function iniciarHttp(modulo: Type<unknown>): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    modulo,
    new FastifyAdapter({ requestIdHeader: 'x-request-id' }),
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
