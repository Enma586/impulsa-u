import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { auth } from '@impulsau/contracts';
import { catchError, from, mergeMap, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { ALMACEN_IDEMPOTENCIA } from '../dominio/idempotencia.js';
import type { AlmacenIdempotencia } from '../dominio/idempotencia.js';
import { ErrorHttpApi } from './error-api.js';
import type { SolicitudAutenticada } from './solicitud-autenticada.js';

/**
 * Exige `Idempotency-Key` (uuid) en las creaciones. Repetir la misma llave con el mismo cuerpo
 * devuelve el resultado guardado; con otro cuerpo responde 422; mientras la primera sigue en curso, 409.
 */
@Injectable()
export class IdempotenciaInterceptor implements NestInterceptor {
  constructor(@Inject(ALMACEN_IDEMPOTENCIA) private readonly almacen: AlmacenIdempotencia) {}

  async intercept(
    contexto: ExecutionContext,
    siguiente: CallHandler,
  ): Promise<Observable<unknown>> {
    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    const encabezado = auth.LlaveIdempotencia.safeParse(solicitud.headers['idempotency-key']);
    if (!encabezado.success) {
      throw new ErrorHttpApi(422, 'validacion', 'Falta el encabezado Idempotency-Key', [
        { campo: 'Idempotency-Key', mensaje: 'Obligatorio, con formato uuid' },
      ]);
    }

    const dueno = solicitud.usuario?.id ?? 'anonimo';
    const llave = `${dueno}:${solicitud.method}:${solicitud.routeOptions.url ?? ''}:${encabezado.data}`;
    const huella = createHash('sha256')
      .update(JSON.stringify(solicitud.body ?? null))
      .digest('hex');

    const inicio = await this.almacen.iniciar(llave, huella);
    switch (inicio.tipo) {
      case 'repetida':
        return of(inicio.cuerpo);
      case 'en_curso':
        throw new ErrorHttpApi(409, 'conflicto', 'La solicitud anterior sigue en proceso');
      case 'huella_distinta':
        throw new ErrorHttpApi(
          422,
          'idempotencia_reutilizada',
          'Esa llave ya se usó con otros datos',
        );
      case 'nueva':
        return siguiente.handle().pipe(
          mergeMap((cuerpo: unknown) =>
            from(this.almacen.completar(llave, huella, cuerpo)).pipe(mergeMap(() => of(cuerpo))),
          ),
          catchError((error: unknown) =>
            from(this.almacen.liberar(llave)).pipe(mergeMap(() => throwError(() => error))),
          ),
        );
    }
  }
}
