import { Controller, Get, Inject } from '@nestjs/common';
import type { catalogos } from '@impulsau/contracts';
import { ObtenerCatalogos } from '../aplicacion/obtener-catalogos.js';

@Controller('catalogos')
export class CatalogosController {
  constructor(@Inject(ObtenerCatalogos) private readonly obtenerCatalogos: ObtenerCatalogos) {}

  @Get()
  listar(): Promise<catalogos.Catalogos> {
    return this.obtenerCatalogos.ejecutar();
  }
}
