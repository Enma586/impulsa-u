import { z } from 'zod';
import {
  ConsultaPagina,
  crearEsquemaError,
  crearEsquemaPagina,
  Departamento,
} from '../comun/index.js';

export const TipoVacante = z.enum(['pasantia', 'primer_empleo', 'trainee']);
export type TipoVacante = z.infer<typeof TipoVacante>;

export const ModalidadVacante = z.enum(['presencial', 'hibrida', 'remota']);
export type ModalidadVacante = z.infer<typeof ModalidadVacante>;

export const EstadoVacante = z.enum(['borrador', 'abierta', 'pausada', 'cerrada']);
export type EstadoVacante = z.infer<typeof EstadoVacante>;

export const EstadoPostulacion = z.enum([
  'recibida',
  'en_revision',
  'entrevista',
  'seleccionada',
  'descartada',
]);
export type EstadoPostulacion = z.infer<typeof EstadoPostulacion>;

export const MotivoDescarte = z.enum([
  'falta_habilidad_tecnica',
  'perfil_incompleto',
  'otro_candidato',
  'vacante_cerrada',
  'otro',
]);
export type MotivoDescarte = z.infer<typeof MotivoDescarte>;

const HabilidadVacante = z.object({
  id: z.uuid(),
  nombre: z.string(),
  requerida: z.boolean(),
});

/** Tarjeta de la lista (CU-42). `coincidencia` (0–100) solo se calcula para talentos. */
export const VacanteResumen = z.object({
  id: z.uuid(),
  titulo: z.string(),
  empresa: z.object({ id: z.uuid(), nombre: z.string() }),
  tipo: TipoVacante,
  modalidad: ModalidadVacante,
  departamento: Departamento.nullable(),
  estado: EstadoVacante,
  habilidades: z.array(HabilidadVacante),
  coincidencia: z.number().int().min(0).max(100).nullable(),
  publicadaEn: z.iso.datetime().nullable(),
});
export type VacanteResumen = z.infer<typeof VacanteResumen>;

export const VacanteDetalle = VacanteResumen.extend({
  descripcion: z.string(),
  esMia: z.boolean(),
  yaPostulado: z.boolean(),
  version: z.number().int(),
});
export type VacanteDetalle = z.infer<typeof VacanteDetalle>;

const CamposVacante = z.object({
  titulo: z.string().trim().min(5).max(120),
  descripcion: z.string().trim().min(20).max(5000),
  tipo: TipoVacante,
  modalidad: ModalidadVacante,
  departamento: Departamento.nullable(),
  habilidades: z
    .array(z.object({ id: z.uuid(), requerida: z.boolean() }))
    .min(1, 'Elige al menos una habilidad')
    .max(15),
});

/** `POST /vacantes` (CU-40). */
export const PublicarVacanteEntrada = CamposVacante.extend({ publicar: z.boolean() });
export type PublicarVacanteEntrada = z.infer<typeof PublicarVacanteEntrada>;

/** `PUT /vacantes/:id` (CU-41). */
export const EditarVacanteEntrada = CamposVacante.extend({ version: z.number().int().min(1) });
export type EditarVacanteEntrada = z.infer<typeof EditarVacanteEntrada>;

/** `PUT /vacantes/:id/estado`: pausar, reabrir o cerrar. */
export const CambiarEstadoVacanteEntrada = z.object({
  estado: z.enum(['abierta', 'pausada', 'cerrada']),
});
export type CambiarEstadoVacanteEntrada = z.infer<typeof CambiarEstadoVacanteEntrada>;

export const ConsultaVacantes = ConsultaPagina.extend({
  q: z.string().trim().max(80).optional(),
  tipo: TipoVacante.optional(),
  modalidad: ModalidadVacante.optional(),
  mias: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
});
export type ConsultaVacantes = z.infer<typeof ConsultaVacantes>;

export const PaginaVacantes = crearEsquemaPagina(VacanteResumen);
export type PaginaVacantes = z.infer<typeof PaginaVacantes>;

/** `POST /vacantes/:id/postulaciones` con `Idempotency-Key` (CU-43). */
export const PostularseEntrada = z.object({
  proyectoIds: z.array(z.uuid()).min(1, 'Adjunta al menos un proyecto').max(5),
});
export type PostularseEntrada = z.infer<typeof PostularseEntrada>;

export const Postulacion = z.object({
  id: z.uuid(),
  vacante: z.object({ id: z.uuid(), titulo: z.string(), empresa: z.string() }),
  estado: EstadoPostulacion,
  motivoDescarte: MotivoDescarte.nullable(),
  proyectos: z.array(z.object({ id: z.uuid(), titulo: z.string() })),
  creadaEn: z.iso.datetime(),
});
export type Postulacion = z.infer<typeof Postulacion>;

/** Fila del tablero de la empresa (CU-44). */
export const PostulacionRecibida = z.object({
  id: z.uuid(),
  talento: z.object({
    id: z.uuid(),
    nombre: z.string(),
    carrera: z.string().nullable(),
  }),
  estado: EstadoPostulacion,
  motivoDescarte: MotivoDescarte.nullable(),
  detalleDescarte: z.string().nullable(),
  proyectos: z.array(z.object({ id: z.uuid(), titulo: z.string() })),
  creadaEn: z.iso.datetime(),
  version: z.number().int(),
});
export type PostulacionRecibida = z.infer<typeof PostulacionRecibida>;

/** `PUT /postulaciones/:id/estado`. Descartar exige motivo (CU-46). */
export const CambiarEstadoPostulacionEntrada = z
  .object({
    estado: EstadoPostulacion,
    motivoDescarte: MotivoDescarte.optional(),
    detalleDescarte: z.string().trim().max(500).optional(),
    version: z.number().int().min(1),
  })
  .refine((datos) => datos.estado !== 'descartada' || datos.motivoDescarte !== undefined, {
    path: ['motivoDescarte'],
    message: 'Indica el motivo del descarte',
  });
export type CambiarEstadoPostulacionEntrada = z.infer<typeof CambiarEstadoPostulacionEntrada>;

/** `vacante_cerrada` y `ya_postulado` → 409; `perfil_incompleto` y `proyecto_ajeno` → 422. */
export const ErrorVacante = crearEsquemaError([
  'validacion',
  'no_autenticado',
  'prohibido',
  'no_encontrado',
  'conflicto',
  'idempotencia_reutilizada',
  'demasiadas_peticiones',
  'error_interno',
]);
export type ErrorVacante = z.infer<typeof ErrorVacante>;
