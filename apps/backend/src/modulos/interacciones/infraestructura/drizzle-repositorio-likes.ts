import { and, eq, isNull, likes, proyectos, sql } from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';
import type { interacciones } from '@impulsau/contracts';
import type { RepositorioLikes } from '../puertos/repositorio-likes.js';

/**
 * El `like` es una fila con clave (usuario, proyecto): repetir la operación no duplica nada.
 * El contador del proyecto se fija con el recuento absoluto, nunca con `+ 1`.
 */
export class DrizzleRepositorioLikes implements RepositorioLikes {
  constructor(private readonly db: BaseDeDatos) {}

  poner(usuarioId: string, proyectoId: string): Promise<interacciones.EstadoLike | null> {
    return this.cambiar(usuarioId, proyectoId, true);
  }

  quitar(usuarioId: string, proyectoId: string): Promise<interacciones.EstadoLike | null> {
    return this.cambiar(usuarioId, proyectoId, false);
  }

  private cambiar(
    usuarioId: string,
    proyectoId: string,
    meGusta: boolean,
  ): Promise<interacciones.EstadoLike | null> {
    return this.db.transaction(async (tx) => {
      const [proyecto] = await tx
        .select({ id: proyectos.id })
        .from(proyectos)
        .where(
          and(
            eq(proyectos.id, proyectoId),
            eq(proyectos.estado, 'publicado'),
            isNull(proyectos.eliminadoEn),
          ),
        )
        .for('update')
        .limit(1);
      if (!proyecto) return null;

      if (meGusta) {
        await tx.insert(likes).values({ usuarioId, proyectoId }).onConflictDoNothing();
      } else {
        await tx
          .delete(likes)
          .where(and(eq(likes.usuarioId, usuarioId), eq(likes.proyectoId, proyectoId)));
      }

      const [actualizado] = await tx
        .update(proyectos)
        .set({ likes: sql`(SELECT count(*)::int FROM likes WHERE proyecto_id = ${proyectoId})` })
        .where(eq(proyectos.id, proyectoId))
        .returning({ likes: proyectos.likes });
      return { likes: actualizado?.likes ?? 0, meGusta };
    });
  }
}
