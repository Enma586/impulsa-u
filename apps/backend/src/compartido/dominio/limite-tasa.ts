export const LIMITADOR_TASA = Symbol('LimitadorTasa');

export type ResultadoLimite = { permitido: true } | { permitido: false; reintentarEnMs: number };

/** Ventana deslizante: como máximo `maximo` intentos por `ventanaMs` para cada clave. */
export interface LimitadorTasa {
  intentar(clave: string, maximo: number, ventanaMs: number): Promise<ResultadoLimite>;
}
