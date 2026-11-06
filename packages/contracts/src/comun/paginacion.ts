import { z } from 'zod';

export const Departamento = z.enum([
  'ahuachapan',
  'santa_ana',
  'sonsonate',
  'chalatenango',
  'la_libertad',
  'san_salvador',
  'cuscatlan',
  'la_paz',
  'cabanas',
  'san_vicente',
  'usulutan',
  'san_miguel',
  'morazan',
  'la_union',
]);
export type Departamento = z.infer<typeof Departamento>;

/** URL absoluta `https` (RN: los enlaces externos nunca son `http` ni `javascript:`). */
export const UrlHttps = z.url({ protocol: /^https$/, error: 'Debe ser una URL https' }).max(500);

/** Cursor opaco que devuelve la API; el cliente solo lo reenvía. */
export const Cursor = z.string().min(1).max(200);

export const ConsultaPagina = z.object({
  cursor: Cursor.optional(),
  limite: z.coerce.number().int().min(1).max(50).default(12),
});
export type ConsultaPagina = z.infer<typeof ConsultaPagina>;

export function crearEsquemaPagina<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    siguienteCursor: Cursor.nullable(),
  });
}
