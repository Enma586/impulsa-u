import { Global, Module } from '@nestjs/common';
import { CIERRE_CONEXIONES } from '../../dominio/tiempo-real.js';
import { GatewayConexion } from './gateway-conexion.js';

@Global()
@Module({
  providers: [GatewayConexion, { provide: CIERRE_CONEXIONES, useExisting: GatewayConexion }],
  exports: [CIERRE_CONEXIONES, GatewayConexion],
})
export class TiempoRealModule {}
