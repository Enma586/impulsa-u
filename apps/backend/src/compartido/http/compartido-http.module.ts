import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import type { Redis } from 'ioredis';
import type { ConexionBaseDeDatos } from '@impulsau/db';
import { BASE_DATOS } from '../infraestructura/conexion-base-datos.module.js';
import { REDIS } from '../infraestructura/conexion-redis.module.js';
import { FiltroErrores } from './filtro-errores.js';
import { COMPROBADORES_LISTO, SaludController } from './salud.controller.js';
import type { ComprobadorListo } from './salud.controller.js';

/** Registra un comprobador por cada dependencia que la aplicación haya cargado. */
function crearComprobadores(redis?: Redis, base?: ConexionBaseDeDatos): ComprobadorListo[] {
  const comprobadores: ComprobadorListo[] = [];
  if (redis) {
    comprobadores.push({
      nombre: 'redis',
      comprobar: async () => {
        await redis.ping();
      },
    });
  }
  if (base) {
    comprobadores.push({
      nombre: 'base_de_datos',
      comprobar: async () => {
        await base.sql`SELECT 1`;
      },
    });
  }
  return comprobadores;
}

@Module({
  controllers: [SaludController],
  providers: [
    { provide: APP_FILTER, useClass: FiltroErrores },
    {
      provide: COMPROBADORES_LISTO,
      inject: [
        { token: REDIS, optional: true },
        { token: BASE_DATOS, optional: true },
      ],
      useFactory: crearComprobadores,
    },
  ],
})
export class CompartidoHttpModule {}
