import type { Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { Redis } from 'ioredis';
import { Logger } from 'nestjs-pino';
import { BUSCADOR_USUARIO, VERIFICADOR_TOKEN } from '../dominio/autenticacion.js';
import type { BuscadorUsuario, VerificadorToken } from '../dominio/autenticacion.js';
import { REDIS } from './conexion-redis.module.js';
import { ENTORNO } from './configuracion.module.js';
import { leerEntorno } from './entorno.js';
import type { Entorno } from './entorno.js';
import { AdaptadorSocketRedis } from './tiempo-real/adaptador-socket-redis.js';

/** Con `TRUST_PROXY` en 0 se ignora `X-Forwarded-For`; con N, se confía en N proxies delante. */
export function crearAdaptador(entorno: Pick<Entorno, 'TRUST_PROXY'>): FastifyAdapter {
  return new FastifyAdapter({
    requestIdHeader: 'x-request-id',
    trustProxy: (_direccion, salto) => salto < entorno.TRUST_PROXY,
  });
}

/** El plugin de Fastify solo permite GET, HEAD y POST por defecto: los PUT y DELETE de la API se bloquearían. */
export function opcionesCors(origen: string) {
  return {
    origin: origen,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  };
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
  app.useWebSocketAdapter(
    new AdaptadorSocketRedis(app, {
      corsOrigen: entorno.CORS_ORIGIN,
      redis: app.get<Redis>(REDIS),
      verificador: app.get<VerificadorToken>(VERIFICADOR_TOKEN, { strict: false }),
      usuarios: app.get<BuscadorUsuario>(BUSCADOR_USUARIO, { strict: false }),
    }),
  );
  app.enableCors(opcionesCors(entorno.CORS_ORIGIN));
  app.enableShutdownHooks();
  await app.listen(entorno.PORT, '0.0.0.0');
}

export async function iniciarWorker(modulo: Type<unknown>): Promise<void> {
  const app = await NestFactory.createApplicationContext(modulo, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
}
