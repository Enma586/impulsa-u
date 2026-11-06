import { Module } from '@nestjs/common';
import type { BaseDeDatos, ConexionBaseDeDatos } from '@impulsau/db';
import { BASE_DATOS } from '../../compartido/infraestructura/conexion-base-datos.module.js';
import { ObtenerCatalogos } from './aplicacion/obtener-catalogos.js';
import { CatalogosController } from './http/catalogos.controller.js';
import { DrizzleRepositorioCatalogos } from './infraestructura/drizzle-repositorio-catalogos.js';
import { REPOSITORIO_CATALOGOS } from './puertos/repositorio-catalogos.js';

@Module({
  controllers: [CatalogosController],
  providers: [
    ObtenerCatalogos,
    {
      provide: REPOSITORIO_CATALOGOS,
      inject: [BASE_DATOS],
      useFactory: (conexion: ConexionBaseDeDatos) =>
        new DrizzleRepositorioCatalogos(conexion.db satisfies BaseDeDatos),
    },
  ],
})
export class CatalogosModule {}
