import { Module } from '@nestjs/common';
import type { BaseDeDatos, ConexionBaseDeDatos } from '@impulsau/db';
import { BASE_DATOS } from '../../compartido/infraestructura/conexion-base-datos.module.js';
import { ENTORNO } from '../../compartido/infraestructura/configuracion.module.js';
import type { Entorno } from '../../compartido/infraestructura/entorno.js';
import { ConfirmarArchivo, SolicitarSubida } from './aplicacion/archivos.js';
import { ArchivosController } from './http/archivos.controller.js';
import { DrizzleRepositorioArchivos } from './infraestructura/drizzle-repositorio-archivos.js';
import { SupabaseAlmacenArchivos } from './infraestructura/supabase-almacen-archivos.js';
import { ALMACEN_ARCHIVOS, REPOSITORIO_ARCHIVOS } from './puertos/puertos.js';

@Module({
  controllers: [ArchivosController],
  providers: [
    SolicitarSubida,
    ConfirmarArchivo,
    {
      provide: REPOSITORIO_ARCHIVOS,
      inject: [BASE_DATOS],
      useFactory: (conexion: ConexionBaseDeDatos) =>
        new DrizzleRepositorioArchivos(conexion.db satisfies BaseDeDatos),
    },
    {
      provide: ALMACEN_ARCHIVOS,
      inject: [ENTORNO],
      useFactory: (entorno: Entorno) =>
        new SupabaseAlmacenArchivos(entorno.SUPABASE_URL, entorno.SUPABASE_SERVICE_ROLE_KEY),
    },
  ],
})
export class ArchivosModule {}
