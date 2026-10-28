import type { catalogos } from '@impulsau/contracts';

export const REPOSITORIO_CATALOGOS = Symbol('RepositorioCatalogos');

export interface RepositorioCatalogos {
  listar(): Promise<catalogos.Catalogos>;
}
