/** Errores esperados que comparten los casos de uso; cada uno tiene un estado HTTP fijo. */
export type ErrorCasoUso =
  | { tipo: 'no_encontrado' }
  | { tipo: 'prohibido' }
  | { tipo: 'conflicto'; mensaje: string }
  | { tipo: 'invalido'; campo: string; mensaje: string };

export const NO_ENCONTRADO = { tipo: 'no_encontrado' } as const satisfies ErrorCasoUso;
export const PROHIBIDO = { tipo: 'prohibido' } as const satisfies ErrorCasoUso;
