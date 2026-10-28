import { Module } from '@nestjs/common';
import type { BaseDeDatos, ConexionBaseDeDatos } from '@impulsau/db';
import { BASE_DATOS } from '../../compartido/infraestructura/conexion-base-datos.module.js';
import { PonerLike, QuitarLike } from './aplicacion/likes.js';
import { LikesController } from './http/likes.controller.js';
import { DrizzleRepositorioLikes } from './infraestructura/drizzle-repositorio-likes.js';
import { REPOSITORIO_LIKES } from './puertos/repositorio-likes.js';

@Module({
  controllers: [LikesController],
  providers: [
    PonerLike,
    QuitarLike,
    {
      provide: REPOSITORIO_LIKES,
      inject: [BASE_DATOS],
      useFactory: (conexion: ConexionBaseDeDatos) =>
        new DrizzleRepositorioLikes(conexion.db satisfies BaseDeDatos),
    },
  ],
})
export class InteraccionesModule {}
