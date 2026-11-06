import { z } from 'zod';
import { crearEsquemaError } from '../comun/index.js';

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const TAMANO_MAXIMO_IMAGEN_BYTES = 2 * 1024 * 1024;

/** `POST /archivos/subidas` (CU-17): reserva el archivo y entrega una URL de subida directa. */
export const SolicitarSubidaEntrada = z.object({
  proposito: z.enum(['imagen_proyecto', 'avatar']),
  tipoMime: z.enum(TIPOS_IMAGEN),
  tamanoBytes: z.number().int().min(1).max(TAMANO_MAXIMO_IMAGEN_BYTES),
});
export type SolicitarSubidaEntrada = z.infer<typeof SolicitarSubidaEntrada>;

/** El navegador hace `PUT urlSubida` con el archivo; el backend nunca lo recibe. */
export const SubidaSolicitada = z.object({
  archivoId: z.uuid(),
  urlSubida: z.url(),
});
export type SubidaSolicitada = z.infer<typeof SubidaSolicitada>;

/** `POST /archivos/:id/confirmar`: comprueba que el objeto llegó y lo deja listo para usarse. */
export const ArchivoConfirmado = z.object({ id: z.uuid(), url: z.url() });
export type ArchivoConfirmado = z.infer<typeof ArchivoConfirmado>;

/** `limite_almacenamiento` → 422; `archivo_no_subido` → 422. */
export const ErrorArchivo = crearEsquemaError([
  'validacion',
  'no_autenticado',
  'no_encontrado',
  'limite_almacenamiento',
  'archivo_no_subido',
  'demasiadas_peticiones',
  'error_interno',
]);
export type ErrorArchivo = z.infer<typeof ErrorArchivo>;
