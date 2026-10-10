import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import type { LimitadorTasa, ResultadoLimite } from '../dominio/limite-tasa.js';

/** Ventana deslizante atómica: el reloj es el de Redis, así varias instancias comparten la cuenta. */
const SCRIPT = `
local tiempo = redis.call('TIME')
local ahora = tiempo[1] * 1000 + math.floor(tiempo[2] / 1000)
local ventana = tonumber(ARGV[1])
local maximo = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ahora - ventana)
if redis.call('ZCARD', KEYS[1]) >= maximo then
  local masViejo = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  return {0, tonumber(masViejo[2]) + ventana - ahora}
end
redis.call('ZADD', KEYS[1], ahora, ARGV[3])
redis.call('PEXPIRE', KEYS[1], ventana)
return {1, 0}
`;

const Respuesta = z.tuple([z.number(), z.number()]);

export class RedisLimitadorTasa implements LimitadorTasa {
  constructor(private readonly redis: Redis) {}

  async intentar(clave: string, maximo: number, ventanaMs: number): Promise<ResultadoLimite> {
    const crudo = await this.redis.eval(
      SCRIPT,
      1,
      `tasa:${clave}`,
      ventanaMs,
      maximo,
      randomUUID(),
    );
    const [permitido, espera] = Respuesta.parse(crudo);
    return permitido === 1 ? { permitido: true } : { permitido: false, reintentarEnMs: espera };
  }
}
