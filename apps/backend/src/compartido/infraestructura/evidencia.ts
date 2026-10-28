import { sql } from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';

type Ejecutor = Pick<BaseDeDatos, 'execute'>;

/**
 * Recalcula las habilidades demostradas de un talento: en cuántos proyectos publicados aparece
 * cada una. Se llama dentro de la transacción que publica, edita u oculta un proyecto.
 */
export async function recalcularEvidencia(ejecutor: Ejecutor, talentoId: string): Promise<void> {
  await ejecutor.execute(sql`DELETE FROM evidencia_habilidades WHERE talento_id = ${talentoId}`);
  await ejecutor.execute(sql`
    INSERT INTO evidencia_habilidades (talento_id, habilidad_id, proyectos)
    SELECT p.autor_id, t.habilidad_id, count(*)::smallint
    FROM proyectos p
    JOIN proyecto_tecnologias t ON t.proyecto_id = p.id
    WHERE p.autor_id = ${talentoId} AND p.estado = 'publicado' AND p.eliminado_en IS NULL
    GROUP BY p.autor_id, t.habilidad_id
  `);
}
