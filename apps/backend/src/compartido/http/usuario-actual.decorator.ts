import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { UsuarioAutenticado } from '../dominio/autenticacion.js';
import type { SolicitudAutenticada } from './solicitud-autenticada.js';

/** Usuario cargado por el guard de autenticación. */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const { usuario } = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    if (!usuario) throw new Error('UsuarioActual se usó en una ruta pública');
    return usuario;
  },
);
