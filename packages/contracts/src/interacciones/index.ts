import { z } from 'zod';
import { crearEsquemaError } from '../comun/index.js';

/** `PUT` y `DELETE /proyectos/:id/like` (CU-22): idempotentes, devuelven el estado final. */
export const EstadoLike = z.object({ likes: z.number().int().min(0), meGusta: z.boolean() });
export type EstadoLike = z.infer<typeof EstadoLike>;

export const ErrorInteraccion = crearEsquemaError([
  'no_autenticado',
  'no_encontrado',
  'demasiadas_peticiones',
  'error_interno',
]);
export type ErrorInteraccion = z.infer<typeof ErrorInteraccion>;
