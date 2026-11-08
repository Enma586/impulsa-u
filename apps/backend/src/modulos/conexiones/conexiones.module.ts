import { Module } from '@nestjs/common';
import type { BaseDeDatos, ConexionBaseDeDatos } from '@impulsau/db';
import { BASE_DATOS } from '../../compartido/infraestructura/conexion-base-datos.module.js';
import {
  ListarIntereses,
  MostrarInteres,
  ResponderInteres,
  RetirarInteres,
} from './aplicacion/intereses.js';
import { ConexionesController } from './http/conexiones.controller.js';
import { DrizzleRepositorioIntereses } from './infraestructura/drizzle-repositorio-intereses.js';
import { REPOSITORIO_INTERESES } from './puertos/puertos.js';

@Module({
  controllers: [ConexionesController],
  providers: [
    MostrarInteres,
    RetirarInteres,
    ResponderInteres,
    ListarIntereses,
    {
      provide: REPOSITORIO_INTERESES,
      inject: [BASE_DATOS],
      useFactory: (conexion: ConexionBaseDeDatos) =>
        new DrizzleRepositorioIntereses(conexion.db satisfies BaseDeDatos),
    },
  ],
})
export class ConexionesModule {}
