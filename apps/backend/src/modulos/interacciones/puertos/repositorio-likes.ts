import type { interacciones } from '@impulsau/contracts';

export const REPOSITORIO_LIKES = Symbol('RepositorioLikes');

export interface RepositorioLikes {
  /** Idempotente: repetir no cambia nada. `null` si el proyecto no existe o no está publicado. */
  poner(usuarioId: string, proyectoId: string): Promise<interacciones.EstadoLike | null>;
  quitar(usuarioId: string, proyectoId: string): Promise<interacciones.EstadoLike | null>;
}
