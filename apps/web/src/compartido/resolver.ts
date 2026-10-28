import { set } from 'react-hook-form';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';
import '../configurarZod';

/**
 * Resolver de react-hook-form que valida con el esquema del contrato. `aEntrada` convierte lo que
 * edita el formulario (textos, listas) en el cuerpo que espera el contrato.
 * `alias` lleva un campo del contrato a el del formulario que lo edita (p. ej. `habilidades` → `requeridas`).
 */
export function crearResolver<V extends FieldValues>(
  esquema: z.ZodType,
  aEntrada: (valores: V) => unknown,
  esCampo: (campo: string) => campo is keyof V & string,
  alias: Readonly<Record<string, string>> = {},
): Resolver<V> {
  return (valores) => {
    const resultado = esquema.safeParse(aEntrada(valores));
    if (resultado.success) return { values: valores, errors: {} };

    const errors: FieldErrors<V> = {};
    for (const problema of resultado.error.issues) {
      const origen = problema.path[0];
      const campo = typeof origen === 'string' ? (alias[origen] ?? origen) : origen;
      if (typeof campo !== 'string' || !esCampo(campo) || campo in errors) continue;
      set(errors, campo, { type: problema.code, message: problema.message });
    }
    return { values: {}, errors };
  };
}
