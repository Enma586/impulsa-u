import { Module } from '@nestjs/common';
import { CompartidoHttpModule } from './compartido/http/compartido-http.module.js';
import { ConfiguracionModule } from './compartido/infraestructura/configuracion.module.js';
import { ConexionBaseDatosModule } from './compartido/infraestructura/conexion-base-datos.module.js';
import { ConexionRedisModule } from './compartido/infraestructura/conexion-redis.module.js';
import { RegistroModule } from './compartido/infraestructura/logger.module.js';

@Module({
  imports: [
    ConfiguracionModule,
    RegistroModule,
    ConexionBaseDatosModule,
    ConexionRedisModule,
    CompartidoHttpModule,
  ],
})
export class AppHttpModule {}
