import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthHttpModule, AuthModule } from './modulos/auth/index.js';
import { AutenticacionModule } from './compartido/http/autenticacion.module.js';
import { CompartidoHttpModule } from './compartido/http/compartido-http.module.js';
import { GuardAutenticacion } from './compartido/http/guard-autenticacion.js';
import { LimiteTasaGuard } from './compartido/http/limite-tasa.guard.js';
import { ConexionBaseDatosModule } from './compartido/infraestructura/conexion-base-datos.module.js';
import { ConexionRedisModule } from './compartido/infraestructura/conexion-redis.module.js';
import { ConfiguracionModule } from './compartido/infraestructura/configuracion.module.js';
import { RegistroModule } from './compartido/infraestructura/logger.module.js';

@Module({
  imports: [
    ConfiguracionModule,
    RegistroModule,
    ConexionBaseDatosModule,
    ConexionRedisModule,
    CompartidoHttpModule,
    AutenticacionModule,
    AuthModule,
    AuthHttpModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: LimiteTasaGuard },
    { provide: APP_GUARD, useClass: GuardAutenticacion },
  ],
})
export class AppHttpModule {}
