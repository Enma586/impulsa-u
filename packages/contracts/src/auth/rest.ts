import { z } from 'zod';
import { crearEsquemaError } from '../comun/index.js';

/** Encabezado `Idempotency-Key` de las creaciones. */
export const LlaveIdempotencia = z.uuid();
export type LlaveIdempotencia = z.infer<typeof LlaveIdempotencia>;

export const Correo = z.string().trim().toLowerCase().pipe(z.email());

export const Contrasena = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres');

const DatosComunesTalento = z.object({
  rol: z.literal('talento'),
  nombreCompleto: z.string().trim().min(2).max(120),
  correo: Correo,
  contrasena: Contrasena,
  /** Fecha `YYYY-MM-DD`. La edad mínima (RN-03) la valida el caso de uso. */
  fechaNacimiento: z.iso.date(),
  declaracionSinExperiencia: z.literal(true, {
    error: 'Debes aceptar la declaración de cero experiencia',
  }),
  aceptaTerminos: z.literal(true, { error: 'Debes aceptar los términos' }),
});

/** `POST /auth/register` con `rol: "talento"` (CU-01). */
export const RegistrarTalentoEntrada = z.discriminatedUnion('estadoAcademico', [
  DatosComunesTalento.extend({
    estadoAcademico: z.literal('estudiante'),
    ciclo: z.number().int().min(1).max(20),
  }),
  DatosComunesTalento.extend({
    estadoAcademico: z.literal('egresado'),
    anioEgreso: z.number().int().min(1990).max(2100),
  }),
]);
export type RegistrarTalentoEntrada = z.infer<typeof RegistrarTalentoEntrada>;

/** HTTP 202. Es idéntica para un correo nuevo y para uno ya registrado (CA-01.6). */
export const RegistrarTalentoRespuesta = z.object({
  estado: z.literal('revisa_tu_correo'),
});
export type RegistrarTalentoRespuesta = z.infer<typeof RegistrarTalentoRespuesta>;

/**
 * `validacion` y `menor_de_edad` → 422; `idempotencia_reutilizada` → 422 (misma llave, otro cuerpo);
 * `conflicto` → 409 (misma llave en curso); `demasiadas_peticiones` → 429.
 */
export const ErrorRegistro = crearEsquemaError([
  'validacion',
  'menor_de_edad',
  'idempotencia_reutilizada',
  'conflicto',
  'demasiadas_peticiones',
  'error_interno',
]);
export type ErrorRegistro = z.infer<typeof ErrorRegistro>;
