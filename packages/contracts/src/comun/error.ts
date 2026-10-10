import { z } from 'zod';

export const CodigosErrorComunes = [
  'validacion',
  'no_autenticado',
  'prohibido',
  'cuenta_suspendida',
  'perfil_incompleto',
  'no_encontrado',
  'conflicto',
  'demasiadas_peticiones',
  'error_interno',
] as const;

export const DetalleError = z.object({
  campo: z.string(),
  mensaje: z.string(),
});
export type DetalleError = z.infer<typeof DetalleError>;

/** Formato único de error de la API: `{ code, message, details? }` con `code` como unión literal. */
export function crearEsquemaError<const C extends readonly [string, ...string[]]>(codigos: C) {
  return z.object({
    code: z.enum(codigos),
    message: z.string(),
    details: z.array(DetalleError).optional(),
  });
}

export const ErrorApi = crearEsquemaError(CodigosErrorComunes);
export type ErrorApi = z.infer<typeof ErrorApi>;
