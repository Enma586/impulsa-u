import { z } from 'zod';
import { Departamento } from '../comun/index.js';

export const Habilidad = z.object({
  id: z.uuid(),
  nombre: z.string(),
  slug: z.string(),
  categoria: z.string(),
});
export type Habilidad = z.infer<typeof Habilidad>;

export const Carrera = z.object({ id: z.uuid(), nombre: z.string(), slug: z.string() });
export type Carrera = z.infer<typeof Carrera>;

export const Institucion = z.object({
  id: z.uuid(),
  nombre: z.string(),
  slug: z.string(),
  departamento: Departamento.nullable(),
});
export type Institucion = z.infer<typeof Institucion>;

/** `GET /catalogos` (CU-57): son pocos datos y casi no cambian, van en una sola respuesta. */
export const Catalogos = z.object({
  habilidades: z.array(Habilidad),
  carreras: z.array(Carrera),
  instituciones: z.array(Institucion),
});
export type Catalogos = z.infer<typeof Catalogos>;
