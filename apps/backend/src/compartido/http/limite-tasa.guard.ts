import { Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LIMITADOR_TASA } from '../dominio/limite-tasa.js';
import type { LimitadorTasa } from '../dominio/limite-tasa.js';
import { ErrorHttpApi } from './error-api.js';
import type { SolicitudAutenticada } from './solicitud-autenticada.js';

interface Limite {
  maximo: number;
  ventanaSegundos: number;
}

export const LimiteTasa = Reflector.createDecorator<Limite>();

/** Limita por IP las rutas marcadas con `@LimiteTasa(...)`; responde 429 con el tiempo de espera. */
@Injectable()
export class LimiteTasaGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(LIMITADOR_TASA) private readonly limitador: LimitadorTasa,
  ) {}

  private limiteDeLaRuta(contexto: ExecutionContext): Limite | undefined {
    return this.reflector.get(LimiteTasa, contexto.getHandler());
  }

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const limite = this.limiteDeLaRuta(contexto);
    if (!limite) return true;

    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    const clave = `ip:${solicitud.routeOptions.url ?? ''}:${solicitud.ip}`;
    const resultado = await this.limitador.intentar(
      clave,
      limite.maximo,
      limite.ventanaSegundos * 1000,
    );
    if (resultado.permitido) return true;

    const segundos = Math.ceil(resultado.reintentarEnMs / 1000);
    throw new ErrorHttpApi(
      429,
      'demasiadas_peticiones',
      `Demasiados intentos. Vuelve a intentarlo en ${String(segundos)} segundos`,
    );
  }
}
