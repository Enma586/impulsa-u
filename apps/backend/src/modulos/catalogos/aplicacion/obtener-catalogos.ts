import { Inject, Injectable } from '@nestjs/common';
import type { catalogos } from '@impulsau/contracts';
import { REPOSITORIO_CATALOGOS } from '../puertos/repositorio-catalogos.js';
import type { RepositorioCatalogos } from '../puertos/repositorio-catalogos.js';

@Injectable()
export class ObtenerCatalogos {
  constructor(@Inject(REPOSITORIO_CATALOGOS) private readonly catalogos: RepositorioCatalogos) {}

  /** CU-57: lectura de habilidades, carreras e instituciones. */
  ejecutar(): Promise<catalogos.Catalogos> {
    return this.catalogos.listar();
  }
}
