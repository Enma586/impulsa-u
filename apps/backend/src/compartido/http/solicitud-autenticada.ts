import type { FastifyRequest } from 'fastify';
import type { UsuarioAutenticado } from '../dominio/autenticacion.js';

export interface SolicitudAutenticada extends FastifyRequest {
  usuario?: UsuarioAutenticado;
}
