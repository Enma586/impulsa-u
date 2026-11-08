import type { FastifyRequest } from 'fastify';
import type { UsuarioAutenticado } from '../dominio/autenticacion.js';

export interface SolicitudAutenticada extends FastifyRequest {
  usuario?: UsuarioAutenticado;
  /** Sesión del proveedor a la que pertenece el token de la solicitud. */
  sesionId?: string | null;
}
