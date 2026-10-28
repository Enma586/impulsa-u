import { Module } from '@nestjs/common';
import type { BaseDeDatos, ConexionBaseDeDatos } from '@impulsau/db';
import { BASE_DATOS } from '../../compartido/infraestructura/conexion-base-datos.module.js';
import { ENTORNO } from '../../compartido/infraestructura/configuracion.module.js';
import type { Entorno } from '../../compartido/infraestructura/entorno.js';
import {
  ActualizarPerfilEmpresa,
  ActualizarPerfilTalento,
  ObtenerPerfilEmpresa,
  ObtenerPerfilTalento,
} from './aplicacion/perfiles.js';
import { PerfilesController } from './http/perfiles.controller.js';
import { DrizzleRepositorioPerfiles } from './infraestructura/drizzle-repositorio-perfiles.js';
import { REPOSITORIO_PERFILES } from './puertos/repositorio-perfiles.js';

@Module({
  controllers: [PerfilesController],
  providers: [
    ObtenerPerfilTalento,
    ActualizarPerfilTalento,
    ObtenerPerfilEmpresa,
    ActualizarPerfilEmpresa,
    {
      provide: REPOSITORIO_PERFILES,
      inject: [BASE_DATOS, ENTORNO],
      useFactory: (conexion: ConexionBaseDeDatos, entorno: Entorno) =>
        new DrizzleRepositorioPerfiles(conexion.db satisfies BaseDeDatos, entorno.SUPABASE_URL),
    },
  ],
})
export class PerfilesModule {}
