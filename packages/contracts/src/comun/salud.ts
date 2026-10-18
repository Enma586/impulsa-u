import { z } from 'zod';

/** `GET /salud`: el proceso está vivo. */
export const SaludVivo = z.object({ estado: z.literal('vivo') });
export type SaludVivo = z.infer<typeof SaludVivo>;

/** `GET /salud/listo`: 200 si todas las dependencias responden, 503 si alguna falla. */
export const SaludListo = z.discriminatedUnion('estado', [
  z.object({ estado: z.literal('listo') }),
  z.object({ estado: z.literal('no_listo'), fallos: z.array(z.string()) }),
]);
export type SaludListo = z.infer<typeof SaludListo>;
