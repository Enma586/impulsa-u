import { Module } from '@nestjs/common';
import type { BaseDeDatos, ConexionBaseDeDatos } from '@impulsau/db';
import { BASE_DATOS } from '../../compartido/infraestructura/conexion-base-datos.module.js';
import { ENTORNO } from '../../compartido/infraestructura/configuracion.module.js';
import type { Entorno } from '../../compartido/infraestructura/entorno.js';
import {
  EditarProyecto,
  EliminarProyecto,
  ExplorarProyectos,
  ObtenerProyecto,
  PublicarProyecto,
} from './aplicacion/proyectos.js';
import { ProyectosController } from './http/proyectos.controller.js';
import { DrizzleRepositorioProyectos } from './infraestructura/drizzle-repositorio-proyectos.js';
import { REPOSITORIO_PROYECTOS } from './puertos/repositorio-proyectos.js';

@Module({
  controllers: [ProyectosController],
  providers: [
    PublicarProyecto,
    ObtenerProyecto,
    ExplorarProyectos,
    EditarProyecto,
    EliminarProyecto,
    {
      provide: REPOSITORIO_PROYECTOS,
      inject: [BASE_DATOS, ENTORNO],
      useFactory: (conexion: ConexionBaseDeDatos, entorno: Entorno) =>
        new DrizzleRepositorioProyectos(conexion.db satisfies BaseDeDatos, entorno.SUPABASE_URL),
    },
  ],
})
export class ProyectosModule {}
