import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { SolicitudAutenticada } from './solicitud-autenticada.js';

const PREFIJO = 'Bearer ';

/** Token de acceso de la solicitud; el guard ya lo validó, aquí solo se reenvía al proveedor. */
export const TokenActual = createParamDecorator((_dato: unknown, contexto: ExecutionContext) => {
  const encabezado = contexto.switchToHttp().getRequest<SolicitudAutenticada>()
    .headers.authorization;
  return encabezado?.startsWith(PREFIJO) ? encabezado.slice(PREFIJO.length) : '';
});
