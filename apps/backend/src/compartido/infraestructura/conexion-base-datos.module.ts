import { Global, Inject, Module } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { crearBaseDeDatos } from '@impulsau/db';
import type { ConexionBaseDeDatos } from '@impulsau/db';
import { ENTORNO } from './configuracion.module.js';
import type { Entorno } from './entorno.js';

export const BASE_DATOS = Symbol('BASE_DATOS');

@Global()
@Module({
  providers: [
    {
      provide: BASE_DATOS,
      inject: [ENTORNO],
      useFactory: (entorno: Entorno) => crearBaseDeDatos(entorno.DATABASE_URL),
    },
  ],
  exports: [BASE_DATOS],
})
export class ConexionBaseDatosModule implements OnApplicationShutdown {
  constructor(@Inject(BASE_DATOS) private readonly conexion: ConexionBaseDeDatos) {}

  async onApplicationShutdown(): Promise<void> {
    await this.conexion.cerrar();
  }
}
