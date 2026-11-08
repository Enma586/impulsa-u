import { z } from 'zod';
import { ConsultaPagina, crearEsquemaError, crearEsquemaPagina } from '../comun/index.js';

export const DireccionInteres = z.enum(['empresa_a_talento', 'talento_a_empresa']);
export type DireccionInteres = z.infer<typeof DireccionInteres>;

export const EstadoInteres = z.enum(['pendiente', 'aceptado', 'declinado']);
export type EstadoInteres = z.infer<typeof EstadoInteres>;

const ParteInteres = z.object({ id: z.uuid(), nombre: z.string() });

export const Interes = z.object({
  id: z.uuid(),
  empresa: ParteInteres,
  talento: ParteInteres,
  direccion: DireccionInteres,
  mensaje: z.string().nullable(),
  estado: EstadoInteres,
  /** Presente solo cuando el interés fue aceptado: la conversación única del par. */
  conversacionId: z.uuid().nullable(),
  creadoEn: z.iso.datetime(),
  respondidoEn: z.iso.datetime().nullable(),
});
export type Interes = z.infer<typeof Interes>;

/** `PUT /talentos/:id/interes` (empresa) y `PUT /empresas/:id/interes` (talento): idempotentes (CU-29, CU-30). */
export const MostrarInteresEntrada = z.object({
  mensaje: z.string().trim().min(1).max(300).optional(),
});
export type MostrarInteresEntrada = z.infer<typeof MostrarInteresEntrada>;

/** `GET /intereses`: los que recibí o los que envié (CU-31). */
export const ConsultaIntereses = ConsultaPagina.extend({
  tipo: z.enum(['recibidos', 'enviados']).default('recibidos'),
  estado: EstadoInteres.optional(),
});
export type ConsultaIntereses = z.infer<typeof ConsultaIntereses>;

export const PaginaIntereses = crearEsquemaPagina(Interes);
export type PaginaIntereses = z.infer<typeof PaginaIntereses>;

export const ErrorConexion = crearEsquemaError([
  'no_autenticado',
  'prohibido',
  'no_encontrado',
  'conflicto',
  'empresa_no_verificada',
  'talento_no_disponible',
  'usuario_bloqueado',
  'validacion',
  'demasiadas_peticiones',
  'error_interno',
]);
export type ErrorConexion = z.infer<typeof ErrorConexion>;
