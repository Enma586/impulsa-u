import { Module } from '@nestjs/common';
import type { BaseDeDatos, ConexionBaseDeDatos } from '@impulsau/db';
import { BASE_DATOS } from '../../compartido/infraestructura/conexion-base-datos.module.js';
import {
  EnviarMensaje,
  ListarConversaciones,
  ObtenerHistorial,
  SincronizarConversacion,
} from './aplicacion/mensajes.js';
import { MensajeriaController } from './http/mensajeria.controller.js';
import { ManejadorMensajeriaSocket } from './http/mensajeria.socket.js';
import { DrizzleRepositorioMensajes } from './infraestructura/drizzle-repositorio-mensajes.js';
import { REPOSITORIO_MENSAJES } from './puertos/puertos.js';

@Module({
  controllers: [MensajeriaController],
  providers: [
    EnviarMensaje,
    ObtenerHistorial,
    SincronizarConversacion,
    ListarConversaciones,
    ManejadorMensajeriaSocket,
    {
      provide: REPOSITORIO_MENSAJES,
      inject: [BASE_DATOS],
      useFactory: (conexion: ConexionBaseDeDatos) =>
        new DrizzleRepositorioMensajes(conexion.db satisfies BaseDeDatos),
    },
  ],
})
export class MensajeriaModule {}
