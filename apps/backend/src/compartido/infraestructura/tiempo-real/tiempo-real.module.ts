import { Global, Module } from '@nestjs/common';
import { CIERRE_CONEXIONES, EMISOR_TIEMPO_REAL } from '../../dominio/tiempo-real.js';
import { GatewayConexion } from './gateway-conexion.js';

@Global()
@Module({
  providers: [
    GatewayConexion,
    { provide: CIERRE_CONEXIONES, useExisting: GatewayConexion },
    { provide: EMISOR_TIEMPO_REAL, useExisting: GatewayConexion },
  ],
  exports: [CIERRE_CONEXIONES, EMISOR_TIEMPO_REAL, GatewayConexion],
})
export class TiempoRealModule {}
