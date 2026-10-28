import { z } from 'zod';
import { ConsultaPagina, crearEsquemaError, crearEsquemaPagina, UrlHttps } from '../comun/index.js';

export const EstadoProyecto = z.enum(['borrador', 'publicado', 'oculto']);
export type EstadoProyecto = z.infer<typeof EstadoProyecto>;

const Tecnologia = z.object({ id: z.uuid(), nombre: z.string() });
const Autor = z.object({ id: z.uuid(), nombre: z.string() });

/** Tarjeta del feed (CU-20). */
export const ProyectoResumen = z.object({
  id: z.uuid(),
  titulo: z.string(),
  extracto: z.string(),
  autor: Autor,
  tecnologias: z.array(Tecnologia),
  imagenUrl: z.string().nullable(),
  likes: z.number().int(),
  meGusta: z.boolean(),
  estado: EstadoProyecto,
  publicadoEn: z.iso.datetime().nullable(),
});
export type ProyectoResumen = z.infer<typeof ProyectoResumen>;

/** Detalle (CU-19). `esMio` habilita editar y eliminar. */
export const ProyectoDetalle = z.object({
  id: z.uuid(),
  titulo: z.string(),
  descripcion: z.string(),
  materia: z.string().nullable(),
  periodo: z.string().nullable(),
  urlRepositorio: z.string().nullable(),
  urlDemo: z.string().nullable(),
  urlVideo: z.string().nullable(),
  autor: Autor,
  tecnologias: z.array(Tecnologia),
  imagenes: z.array(z.object({ id: z.uuid(), url: z.string() })),
  likes: z.number().int(),
  meGusta: z.boolean(),
  estado: EstadoProyecto,
  publicadoEn: z.iso.datetime().nullable(),
  esMio: z.boolean(),
  version: z.number().int(),
});
export type ProyectoDetalle = z.infer<typeof ProyectoDetalle>;

const CamposProyecto = z.object({
  titulo: z.string().trim().min(5).max(120),
  descripcion: z.string().trim().min(1).max(5000),
  materia: z.string().trim().max(120).nullable(),
  periodo: z.string().trim().max(60).nullable(),
  urlRepositorio: UrlHttps.nullable(),
  urlDemo: UrlHttps.nullable(),
  urlVideo: UrlHttps.nullable(),
  tecnologiaIds: z.array(z.uuid()).min(1, 'Elige al menos una tecnología').max(15),
  archivoIds: z.array(z.uuid()).max(6),
});

/** `POST /proyectos` con `Idempotency-Key` (CU-17). */
export const PublicarProyectoEntrada = CamposProyecto.extend({ publicar: z.boolean() });
export type PublicarProyectoEntrada = z.infer<typeof PublicarProyectoEntrada>;

/** `PUT /proyectos/:id` (CU-18), con bloqueo optimista por `version`. */
export const EditarProyectoEntrada = CamposProyecto.extend({
  estado: z.enum(['borrador', 'publicado']),
  version: z.number().int().min(1),
});
export type EditarProyectoEntrada = z.infer<typeof EditarProyectoEntrada>;

/** `GET /proyectos`: feed paginado por cursor; `autorId` filtra por talento. */
export const ConsultaFeed = ConsultaPagina.extend({
  autorId: z.uuid().optional(),
  mios: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
});
export type ConsultaFeed = z.infer<typeof ConsultaFeed>;

export const PaginaProyectos = crearEsquemaPagina(ProyectoResumen);
export type PaginaProyectos = z.infer<typeof PaginaProyectos>;

export const ErrorProyecto = crearEsquemaError([
  'validacion',
  'no_autenticado',
  'prohibido',
  'no_encontrado',
  'conflicto',
  'idempotencia_reutilizada',
  'demasiadas_peticiones',
  'error_interno',
]);
export type ErrorProyecto = z.infer<typeof ErrorProyecto>;
