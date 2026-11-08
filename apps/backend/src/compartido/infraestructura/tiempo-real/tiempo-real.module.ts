import { Global, Module } from '@nestjs/common';
import { CIERRE_CONEXIONES, EMISOR_TIEMPO_REAL } from '../../dominio/tiempo-real.js';
import { GatewayConexion } from './gateway-conexion.js';
import { REGISTRO_MANEJADORES_SOCKET } from './tipos.js';

@Global()
@Module({
  providers: [
    GatewayConexion,
    { provide: CIERRE_CONEXIONES, useExisting: GatewayConexion },
    { provide: EMISOR_TIEMPO_REAL, useExisting: GatewayConexion },
    { provide: REGISTRO_MANEJADORES_SOCKET, useExisting: GatewayConexion },
  ],
  exports: [CIERRE_CONEXIONES, EMISOR_TIEMPO_REAL, REGISTRO_MANEJADORES_SOCKET],
})
export class TiempoRealModule {}
