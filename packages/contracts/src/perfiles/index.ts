import { z } from 'zod';
import { crearEsquemaError, Departamento, UrlHttps } from '../comun/index.js';

export const TipoEnlace = z.enum(['github', 'linkedin', 'portafolio', 'otro']);
export type TipoEnlace = z.infer<typeof TipoEnlace>;

export const EnlaceTalento = z.object({ tipo: TipoEnlace, url: UrlHttps });
export type EnlaceTalento = z.infer<typeof EnlaceTalento>;

/** Habilidad del perfil con la evidencia que la respalda: cuántos proyectos publicados la usan. */
export const HabilidadPerfil = z.object({
  id: z.uuid(),
  nombre: z.string(),
  categoria: z.string(),
  proyectos: z.number().int().min(0),
});
export type HabilidadPerfil = z.infer<typeof HabilidadPerfil>;

export const ProyectoDePerfil = z.object({
  id: z.uuid(),
  titulo: z.string(),
  imagenUrl: z.string().nullable(),
  likes: z.number().int(),
  publicadoEn: z.iso.datetime(),
});
export type ProyectoDePerfil = z.infer<typeof ProyectoDePerfil>;

const Referencia = z.object({ id: z.uuid(), nombre: z.string() });

/** `GET /perfiles/talentos/:id` y `/me` (CU-11). La trayectoria sale de los proyectos publicados. */
export const PerfilTalento = z.object({
  id: z.uuid(),
  nombreCompleto: z.string(),
  estadoAcademico: z.enum(['estudiante', 'egresado']),
  ciclo: z.number().int().nullable(),
  anioEgreso: z.number().int().nullable(),
  carrera: Referencia.nullable(),
  institucion: Referencia.nullable(),
  departamento: Departamento.nullable(),
  bio: z.string().nullable(),
  habilidades: z.array(HabilidadPerfil),
  enlaces: z.array(EnlaceTalento),
  proyectos: z.array(ProyectoDePerfil),
  version: z.number().int(),
});
export type PerfilTalento = z.infer<typeof PerfilTalento>;

/** `PUT /perfiles/talentos/me` (CU-09), con bloqueo optimista por `version`. */
export const ActualizarPerfilTalentoEntrada = z.object({
  nombreCompleto: z.string().trim().min(2).max(120),
  carreraId: z.uuid().nullable(),
  institucionId: z.uuid().nullable(),
  departamento: Departamento.nullable(),
  bio: z.string().trim().max(600).nullable(),
  habilidadIds: z.array(z.uuid()).max(30),
  enlaces: z.array(EnlaceTalento).max(6),
  version: z.number().int().min(1),
});
export type ActualizarPerfilTalentoEntrada = z.infer<typeof ActualizarPerfilTalentoEntrada>;

export const PerfilEmpresa = z.object({
  id: z.uuid(),
  nombreComercial: z.string(),
  nombreLegal: z.string().nullable(),
  sector: z.string().nullable(),
  sitioWeb: z.string().nullable(),
  descripcion: z.string().nullable(),
  estadoVerificacion: z.enum(['sin_solicitar', 'pendiente', 'verificada', 'rechazada']),
  esAgencia: z.boolean(),
  clienteDeclarado: z.string().nullable(),
  version: z.number().int(),
});
export type PerfilEmpresa = z.infer<typeof PerfilEmpresa>;

/** `PUT /perfiles/empresas/me` (CU-10). */
export const ActualizarPerfilEmpresaEntrada = z
  .object({
    nombreComercial: z.string().trim().min(2).max(120),
    nombreLegal: z.string().trim().max(160).nullable(),
    sector: z.string().trim().max(80).nullable(),
    sitioWeb: UrlHttps.nullable(),
    descripcion: z.string().trim().max(1000).nullable(),
    esAgencia: z.boolean(),
    clienteDeclarado: z.string().trim().min(2).max(120).nullable(),
    version: z.number().int().min(1),
  })
  .refine((datos) => !datos.esAgencia || datos.clienteDeclarado !== null, {
    path: ['clienteDeclarado'],
    message: 'Indica para qué cliente reclutas',
  });
export type ActualizarPerfilEmpresaEntrada = z.infer<typeof ActualizarPerfilEmpresaEntrada>;

/** `conflicto` → 409 (otra edición se guardó antes); `no_encontrado` → 404; `prohibido` → 403. */
export const ErrorPerfil = crearEsquemaError([
  'validacion',
  'no_autenticado',
  'prohibido',
  'no_encontrado',
  'conflicto',
  'error_interno',
]);
export type ErrorPerfil = z.infer<typeof ErrorPerfil>;
