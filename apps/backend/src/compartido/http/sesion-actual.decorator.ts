import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { SolicitudAutenticada } from './solicitud-autenticada.js';

/** Id de la sesión del proveedor a la que pertenece el token (`null` si el token no la declara). */
export const SesionActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): string | null =>
    contexto.switchToHttp().getRequest<SolicitudAutenticada>().sesionId ?? null,
);
