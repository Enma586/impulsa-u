import { Global, Inject, Module } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ALMACEN_IDEMPOTENCIA } from '../dominio/idempotencia.js';
import { LIMITADOR_TASA } from '../dominio/limite-tasa.js';
import { ENTORNO } from './configuracion.module.js';
import type { Entorno } from './entorno.js';
import { RedisAlmacenIdempotencia } from './redis-idempotencia.js';
import { RedisLimitadorTasa } from './redis-limite-tasa.js';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ENTORNO],
      useFactory: (entorno: Entorno) => new Redis(entorno.REDIS_URL, { maxRetriesPerRequest: 2 }),
    },
    {
      provide: ALMACEN_IDEMPOTENCIA,
      inject: [REDIS],
      useFactory: (redis: Redis) => new RedisAlmacenIdempotencia(redis),
    },
    {
      provide: LIMITADOR_TASA,
      inject: [REDIS],
      useFactory: (redis: Redis) => new RedisLimitadorTasa(redis),
    },
  ],
  exports: [REDIS, ALMACEN_IDEMPOTENCIA, LIMITADOR_TASA],
})
export class ConexionRedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
