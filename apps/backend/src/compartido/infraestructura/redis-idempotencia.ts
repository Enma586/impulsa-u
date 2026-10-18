import type { Redis } from 'ioredis';
import { z } from 'zod';
import type { AlmacenIdempotencia, InicioIdempotencia } from '../dominio/idempotencia.js';

const VEINTICUATRO_HORAS = 86_400;

const Registro = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('en_curso'), huella: z.string() }),
  z.object({ tipo: z.literal('completada'), huella: z.string(), cuerpo: z.unknown() }),
]);

export class RedisAlmacenIdempotencia implements AlmacenIdempotencia {
  constructor(private readonly redis: Redis) {}

  async iniciar(llave: string, huella: string): Promise<InicioIdempotencia> {
    const clave = `idem:${llave}`;
    const reservada = await this.redis.set(
      clave,
      JSON.stringify({ tipo: 'en_curso', huella }),
      'EX',
      VEINTICUATRO_HORAS,
      'NX',
    );
    if (reservada === 'OK') return { tipo: 'nueva' };

    const crudo = await this.redis.get(clave);
    if (crudo === null) return this.iniciar(llave, huella);
    const registro = Registro.parse(JSON.parse(crudo));
    if (registro.huella !== huella) return { tipo: 'huella_distinta' };
    return registro.tipo === 'en_curso'
      ? { tipo: 'en_curso' }
      : { tipo: 'repetida', cuerpo: registro.cuerpo };
  }

  async completar(llave: string, huella: string, cuerpo: unknown): Promise<void> {
    const registro = JSON.stringify({ tipo: 'completada', huella, cuerpo });
    await this.redis.set(`idem:${llave}`, registro, 'EX', VEINTICUATRO_HORAS);
  }

  async liberar(llave: string): Promise<void> {
    await this.redis.del(`idem:${llave}`);
  }
}
