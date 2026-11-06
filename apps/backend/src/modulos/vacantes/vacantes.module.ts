import { Module } from '@nestjs/common';
import type { BaseDeDatos, ConexionBaseDeDatos } from '@impulsau/db';
import { BASE_DATOS } from '../../compartido/infraestructura/conexion-base-datos.module.js';
import {
  CambiarEstadoPostulacion,
  CambiarEstadoVacante,
  EditarVacante,
  ExplorarVacantes,
  MisPostulaciones,
  ObtenerVacante,
  PostulacionesDeVacante,
  Postularse,
  PublicarVacante,
} from './aplicacion/vacantes.js';
import { VacantesController } from './http/vacantes.controller.js';
import { DrizzleRepositorioPostulaciones } from './infraestructura/drizzle-repositorio-postulaciones.js';
import { DrizzleRepositorioVacantes } from './infraestructura/drizzle-repositorio-vacantes.js';
import { REPOSITORIO_POSTULACIONES, REPOSITORIO_VACANTES } from './puertos/puertos.js';

@Module({
  controllers: [VacantesController],
  providers: [
    PublicarVacante,
    EditarVacante,
    CambiarEstadoVacante,
    ObtenerVacante,
    ExplorarVacantes,
    Postularse,
    MisPostulaciones,
    PostulacionesDeVacante,
    CambiarEstadoPostulacion,
    {
      provide: REPOSITORIO_VACANTES,
      inject: [BASE_DATOS],
      useFactory: (conexion: ConexionBaseDeDatos) =>
        new DrizzleRepositorioVacantes(conexion.db satisfies BaseDeDatos),
    },
    {
      provide: REPOSITORIO_POSTULACIONES,
      inject: [BASE_DATOS],
      useFactory: (conexion: ConexionBaseDeDatos) =>
        new DrizzleRepositorioPostulaciones(conexion.db satisfies BaseDeDatos),
    },
  ],
})
export class VacantesModule {}
