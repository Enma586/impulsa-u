import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ArchivosModule } from './modulos/archivos/index.js';
import { AuthHttpModule, AuthModule } from './modulos/auth/index.js';
import { CatalogosModule } from './modulos/catalogos/index.js';
import { ConexionesModule } from './modulos/conexiones/index.js';
import { InteraccionesModule } from './modulos/interacciones/index.js';
import { PerfilesModule } from './modulos/perfiles/index.js';
import { ProyectosModule } from './modulos/proyectos/index.js';
import { VacantesModule } from './modulos/vacantes/index.js';
import { AutenticacionModule } from './compartido/http/autenticacion.module.js';
import { CompartidoHttpModule } from './compartido/http/compartido-http.module.js';
import { GuardAutenticacion } from './compartido/http/guard-autenticacion.js';
import { LimiteTasaGuard } from './compartido/http/limite-tasa.guard.js';
import { ConexionBaseDatosModule } from './compartido/infraestructura/conexion-base-datos.module.js';
import { ConexionRedisModule } from './compartido/infraestructura/conexion-redis.module.js';
import { ConfiguracionModule } from './compartido/infraestructura/configuracion.module.js';
import { RegistroModule } from './compartido/infraestructura/logger.module.js';
import { TiempoRealModule } from './compartido/infraestructura/tiempo-real/tiempo-real.module.js';

@Module({
  imports: [
    ConfiguracionModule,
    RegistroModule,
    ConexionBaseDatosModule,
    ConexionRedisModule,
    TiempoRealModule,
    CompartidoHttpModule,
    AutenticacionModule,
    AuthModule,
    AuthHttpModule,
    CatalogosModule,
    ConexionesModule,
    PerfilesModule,
    ArchivosModule,
    ProyectosModule,
    InteraccionesModule,
    VacantesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: LimiteTasaGuard },
    { provide: APP_GUARD, useClass: GuardAutenticacion },
  ],
})
export class AppHttpModule {}
