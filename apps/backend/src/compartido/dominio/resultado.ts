export type Resultado<T, E> = { ok: true; valor: T } | { ok: false; error: E };

export function ok<T>(valor: T): { ok: true; valor: T } {
  return { ok: true, valor };
}

export function fallo<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}
