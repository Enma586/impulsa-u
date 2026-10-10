import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { SaludListo, SaludVivo } from '@impulsau/contracts';
import type { FastifyReply } from 'fastify';

export interface ComprobadorListo {
  nombre: string;
  comprobar(): Promise<void>;
}

/** Cada dependencia (base de datos, Redis…) registra su comprobador con este token. */
export const COMPROBADORES_LISTO = Symbol('COMPROBADORES_LISTO');

@Controller('salud')
export class SaludController {
  constructor(
    @Inject(COMPROBADORES_LISTO) private readonly comprobadores: readonly ComprobadorListo[],
  ) {}

  @Get()
  vivo(): SaludVivo {
    return { estado: 'vivo' };
  }

  @Get('listo')
  async listo(@Res({ passthrough: true }) respuesta: FastifyReply): Promise<SaludListo> {
    const resultados = await Promise.allSettled(this.comprobadores.map((c) => c.comprobar()));
    const fallos = this.comprobadores
      .filter((_, indice) => resultados[indice]?.status === 'rejected')
      .map((c) => c.nombre);
    if (fallos.length === 0) return { estado: 'listo' };
    void respuesta.status(503);
    return { estado: 'no_listo', fallos };
  }
}
