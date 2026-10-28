import { and, archivos, asc, eq, inArray, proyectoArchivos } from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';
import { urlPublicaArchivo } from './almacenamiento.js';

/** Imágenes de cada proyecto, en orden. Un solo viaje a la base para toda una página. */
export async function imagenesDeProyectos(
  db: BaseDeDatos,
  urlSupabase: string,
  proyectoIds: string[],
): Promise<Map<string, { id: string; url: string }[]>> {
  const porProyecto = new Map<string, { id: string; url: string }[]>();
  if (proyectoIds.length === 0) return porProyecto;

  const filas = await db
    .select({ proyectoId: proyectoArchivos.proyectoId, id: archivos.id, clave: archivos.clave })
    .from(proyectoArchivos)
    .innerJoin(archivos, eq(archivos.id, proyectoArchivos.archivoId))
    .where(and(inArray(proyectoArchivos.proyectoId, proyectoIds), eq(archivos.estado, 'listo')))
    .orderBy(asc(proyectoArchivos.orden));

  for (const fila of filas) {
    const lista = porProyecto.get(fila.proyectoId) ?? [];
    lista.push({ id: fila.id, url: urlPublicaArchivo(urlSupabase, fila.clave) });
    porProyecto.set(fila.proyectoId, lista);
  }
  return porProyecto;
}
