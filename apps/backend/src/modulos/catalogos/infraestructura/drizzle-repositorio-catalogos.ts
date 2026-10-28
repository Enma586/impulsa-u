import { asc, carreras, eq, habilidades, instituciones } from '@impulsau/db';
import type { BaseDeDatos } from '@impulsau/db';
import type { catalogos } from '@impulsau/contracts';
import type { RepositorioCatalogos } from '../puertos/repositorio-catalogos.js';

export class DrizzleRepositorioCatalogos implements RepositorioCatalogos {
  constructor(private readonly db: BaseDeDatos) {}

  async listar(): Promise<catalogos.Catalogos> {
    const [listaHabilidades, listaCarreras, listaInstituciones] = await Promise.all([
      this.db
        .select({
          id: habilidades.id,
          nombre: habilidades.nombre,
          slug: habilidades.slug,
          categoria: habilidades.categoria,
        })
        .from(habilidades)
        .where(eq(habilidades.activa, true))
        .orderBy(asc(habilidades.categoria), asc(habilidades.nombre)),
      this.db
        .select({ id: carreras.id, nombre: carreras.nombre, slug: carreras.slug })
        .from(carreras)
        .orderBy(asc(carreras.nombre)),
      this.db
        .select({
          id: instituciones.id,
          nombre: instituciones.nombre,
          slug: instituciones.slug,
          departamento: instituciones.departamento,
        })
        .from(instituciones)
        .orderBy(asc(instituciones.nombre)),
    ]);
    return {
      habilidades: listaHabilidades,
      carreras: listaCarreras,
      instituciones: listaInstituciones,
    };
  }
}
