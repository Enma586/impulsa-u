import { z } from 'zod';

const Entorno = z.object({
  VITE_API_URL: z.preprocess(
    (valor) => (valor === '' ? undefined : valor),
    z.url().default('http://localhost:3000'),
  ),
});

/** Variables públicas del frontend, validadas al arrancar (sección 12 de la especificación). */
export const entorno = Entorno.parse(import.meta.env);
